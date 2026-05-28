const { contextBridge, ipcRenderer } = require('electron');

// Expose safe desktop system APIs to React Renderer window
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printDocument: (options) => ipcRenderer.send('print-document', options),
  
  // Channels for dynamic IPC operations
  send: (channel, data) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

console.log('Electron secure ContextBridge loaded successfully.');
