await import('./syl-walkable-ship.js');
const { installSealedPrintableShipSkin } = await import('./syl-walkable-ship-seal.js');
installSealedPrintableShipSkin();
const { installShipPrototypeGuard } = await import('./syl-walkable-ship-guard.js');
installShipPrototypeGuard();
