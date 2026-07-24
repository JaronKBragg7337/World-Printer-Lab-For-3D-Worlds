// --- World-state persistence + realtime multiplayer -------------------------
//
// Every placed object is a row in the `placements` table. That table — not this
// git repo — is the source of truth for what players have built.
//
// This module replaces two things that used to live elsewhere:
//
//   1. The inline Supabase calls in main-v2e.js, which wrapped every request in
//      `try{ ... }catch(e){}` and threw the error away. Callers then told the
//      player "saved to the shared world" whether or not the write landed.
//      Every function here returns { ok, error } so callers can tell the truth.
//
//   2. src/runtime-guards.js, which recovered that truth by monkey-patching
//      globalThis.fetch and watching the status text with a MutationObserver.
//      Fixing the calls at the source makes all of that unnecessary.
//
// The client is also a bundled npm dependency now, not a runtime import from
// https://esm.sh/@supabase/supabase-js@2 — that was an unpinned third-party
// request on the critical path of every page load.

import { createClient } from '@supabase/supabase-js';

// The publishable key is designed to be public and is protected by row-level
// security; it is safe in client source. Env vars let you point a fork at your
// own project without editing code — see .env.example.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ygjpnvrwhkrowkrskftk.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Y-duV64ayMMEvVwMs5PWuw_6kvzbOrN';

export const TABLE = 'placements';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Normalize anything thrown or returned into a short, displayable string. */
function describe(error) {
  if (!error) return '';
  const message = error.message || error.error_description || String(error);
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

export const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Insert a placement.
 * @returns {Promise<{ok: boolean, error: string}>}
 */
export async function insertPlacement(row) {
  try {
    const { error } = await supabase.from(TABLE).insert(row);
    return error ? { ok: false, error: describe(error) } : { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/**
 * Patch an existing placement's transform.
 * @returns {Promise<{ok: boolean, error: string}>}
 */
export async function updatePlacement(id, patch) {
  if (!id) return { ok: false, error: 'missing placement id' };
  try {
    const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
    return error ? { ok: false, error: describe(error) } : { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/**
 * Delete a placement.
 * @returns {Promise<{ok: boolean, error: string}>}
 */
export async function deletePlacement(id) {
  if (!id) return { ok: false, error: 'missing placement id' };
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return error ? { ok: false, error: describe(error) } : { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/**
 * Load every placement for a world, oldest first.
 * @returns {Promise<{ok: boolean, rows: object[], error: string}>}
 */
export async function loadPlacements(world) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('world', world)
      .order('created_at');
    if (error) return { ok: false, rows: [], error: describe(error) };
    return { ok: true, rows: data || [], error: '' };
  } catch (error) {
    return { ok: false, rows: [], error: describe(error) };
  }
}

/**
 * Subscribe to live placement changes for a world.
 *
 * Note on UPDATE payloads: saved objects are rebuilt with their size baked into
 * the geometry, and the group scale stays at 1. Handlers must therefore apply
 * position and rotation from the row but must NOT re-apply `row.scale`, or a
 * Large object jumps from 1.8x to 3.24x the moment another player moves it.
 * runtime-guards.js used to strip `scale` from the payload to enforce that;
 * the handler in main-v2e.js now simply doesn't read it.
 *
 * @returns {{unsubscribe: () => void} | null}
 */
export function subscribePlacements(world, { onInsert, onUpdate, onDelete, onError } = {}) {
  const filter = `world=eq.${world}`;
  try {
    const channel = supabase
      .channel(`placements-${world}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter },
        ({ new: row }) => row && onInsert?.(row)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter },
        ({ new: row }) => row && onUpdate?.(row)
      )
      // DELETE payloads carry only the primary key, so they cannot be filtered
      // by world server-side. Handlers ignore ids they don't know about.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: TABLE },
        ({ old }) => old && onDelete?.(old)
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onError?.(`realtime channel ${status.toLowerCase().replace('_', ' ')}`);
        }
      });

    return { unsubscribe: () => supabase.removeChannel(channel) };
  } catch (error) {
    onError?.(describe(error));
    return null;
  }
}
