const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const serverPath = path.join(__dirname, '../backend/server.js');
  console.log(`Spawning local offline backend at: ${serverPath}`);

  // Spawn the Express backend using system node to run in the standard Node.js environment
  backendProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: 5000, NODE_ENV: app.isPackaged ? 'production' : 'development' },
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend Log]: ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error]: ${data.toString().trim()}`);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process terminated with code ${code} and signal ${signal}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    frame: true, // standard OS desktop wrapper
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize();
  mainWindow.show();

  // Load React UI
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    // In dev: connect to local Vite dev server
    const loadViteServer = () => {
      mainWindow.loadURL('http://127.0.0.1:5173').catch((err) => {
        console.log('Vite dev server not ready yet, retrying in 1 second...');
        setTimeout(loadViteServer, 1000);
      });
    };
    loadViteServer();
    
    // Open Chrome devtools
    mainWindow.webContents.openDevTools();
  } else {
    // In prod: load compiled static HTML bundle
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle secure IPC communications from React Renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('print-document', (event, options) => {
  console.log('print-document request received with options:', options);
});

// Electron bootstrap lifecycle hooks
app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Enforce process termination cleanup when all window frames exit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log('Terminating offline Express backend child process...');
    backendProcess.kill();
  }
});
