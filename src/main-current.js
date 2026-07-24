// Root application startup.
//
// This used to install src/runtime-guards.js first — a compatibility layer that
// monkey-patched globalThis.fetch and the Supabase channel prototype to correct
// two faults in main-v2e.js. Both faults are now fixed at the source:
//
//   • Persistence truth   → src/persistence.js returns { ok, error } and the
//                           callers in main-v2e.js report the real outcome.
//   • Realtime size bug   → the UPDATE handler no longer reads row.scale, so a
//                           Large object stays 1.8x instead of becoming 3.24x.
//
// The guards file is gone; nothing needs to run before the printer build.

import('./main-v2e.js').catch((error) => {
  console.error('[World Printer] Failed to start the canonical printer build.', error);
  const app = document.querySelector('#app');
  if (app) {
    app.innerHTML =
      '<main style="padding:24px;color:white;font-family:system-ui;background:#071012;min-height:100vh">' +
      '<h1>World Printer Lab failed to start</h1>' +
      '<p>Open the browser console for the exact module error.</p></main>';
  }
});
