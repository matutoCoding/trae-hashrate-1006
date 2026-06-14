const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: '古典园林叠石假山稳定性分析系统',
    icon: path.join(__dirname, 'assets/icon.png'),
    autoHideMenuBar: false,
    backgroundColor: '#f5f1e8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    // 开发模式：连接到 Vite dev server (http://localhost:5173)
    const waitOn = require('wait-on');
    waitOn({ resources: ['http://localhost:5175'], timeout: 30000 })
      .then(() => mainWindow.loadURL('http://localhost:5175/'))
      .catch((err) => {
        console.error('Vite 服务未启动，请先运行 npm run dev:vite');
        console.error(err);
      });
  } else {
    // 生产模式：加载打包后的前端文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 外链在默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 菜单：中文界面 + 桌面体验
  const template = [
    {
      label: '造园',
      submenu: [
        { label: '关于叠山营造', role: 'about' },
        { type: 'separator' },
        {
          label: '最小化',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' },
        {
          label: '开发者工具',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          role: 'toggleDevTools',
        },
      ],
    },
    {
      label: '功能典籍',
      submenu: [
        {
          label: '① 叠石录入',
          accelerator: 'Ctrl+1',
          click: () => mainWindow.webContents.send('navigate', '/stones'),
        },
        {
          label: '② 重心校核',
          accelerator: 'Ctrl+2',
          click: () => mainWindow.webContents.send('navigate', '/center-of-gravity'),
        },
        {
          label: '③ 受力诊断',
          accelerator: 'Ctrl+3',
          click: () => mainWindow.webContents.send('navigate', '/stress-analysis'),
        },
        {
          label: '④ 施工堆叠',
          accelerator: 'Ctrl+4',
          click: () => mainWindow.webContents.send('navigate', '/construction'),
        },
        {
          label: '⑤ 范式库',
          accelerator: 'Ctrl+5',
          click: () => mainWindow.webContents.send('navigate', '/paradigm'),
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '用户文档',
          click: () => shell.openExternal('https://baike.baidu.com/item/叠山'),
        },
        {
          label: '造园典籍：园冶',
          click: () => shell.openExternal('https://so.gushiwen.cn/guwen/book_46653FD803893E4F85DB41CC5629284F.aspx'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 通信：响应桌面能力
ipcMain.handle('dialog:openFile', async () => {
  const { dialog } = require('electron');
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'JSON 数据', extensions: ['json'] },
      { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'bmp'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
});

ipcMain.handle('dialog:saveFile', async (_e, defaultName = '堆叠方案.txt') => {
  const { dialog } = require('electron');
  return dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: '文本文件', extensions: ['txt'] },
      { name: 'JSON', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
