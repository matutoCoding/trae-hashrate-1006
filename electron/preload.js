const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dieshanDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  isDesktop: true,

  // 监听 Electron 主进程发出的导航指令（菜单快捷键）
  onNavigate: (callback) => {
    const handler = (_evt, route) => callback(route);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },

  // 打开本地文件
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  // 保存文件
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  // 最小化/关闭窗口
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
});
