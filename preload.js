const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('blockclye', {
  initServer: (file) => {
    console.log("PRELOAD: initServer llamado 🔥");
    console.log("🔥 ENTORNO:", {
    window: typeof window,
    self: typeof self,
    dirname: typeof __dirname
    });
    const { serverRun } = require('./serverOrLocalServiceCreatorApi.js');
    serverRun(file);
  }
});