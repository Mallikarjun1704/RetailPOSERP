const { app, BrowserWindow, ipcMain, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;
let isQuitting = false;
let logStream = null;

// Setup persistent log file in user data directory
function setupLogging() {
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const logFilePath = path.join(userDataPath, 'backend.log');
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    log(`[Main]: RetailPOS initialized at ${new Date().toISOString()}`);
    log(`[Main]: App path: ${app.getAppPath()}, isPackaged: ${app.isPackaged}`);
    log(`[Main]: Resources path: ${process.resourcesPath}`);
  } catch (err) {
    console.error('Failed to setup file logger:', err);
  }
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  if (logStream) {
    logStream.write(line);
  }
}

function logError(message) {
  const line = `[${new Date().toISOString()}] [ERROR] ${message}\n`;
  console.error(message);
  if (logStream) {
    logStream.write(line);
  }
}

function getBackendPath() {
  if (app.isPackaged) {
    // 1. Look in app.asar.unpacked/backend/server.js
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js');
    if (fs.existsSync(unpackedPath)) {
      log(`[Main]: Found backend at unpacked path: ${unpackedPath}`);
      return unpackedPath;
    }

    // 2. Look in resources/backend/server.js
    const resourcePath = path.join(process.resourcesPath, 'backend', 'server.js');
    if (fs.existsSync(resourcePath)) {
      log(`[Main]: Found backend at resource path: ${resourcePath}`);
      return resourcePath;
    }
  }

  // 3. Development fallback
  const devPath = path.join(__dirname, '../backend/server.js');
  log(`[Main]: Using development backend path: ${devPath}`);
  return devPath;
}

function startBackend() {
  const serverPath = getBackendPath();
  const serverDir = path.dirname(serverPath);
  log(`Spawning local offline backend at: ${serverPath}`);

  const backendEnv = {
    ...process.env,
    PORT: '5000',
    NODE_ENV: app.isPackaged ? 'production' : 'development',
    USER_DATA_PATH: app.getPath('userData'),
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/retailApp'
  };

  try {
    // Strategy 1: Use Electron's native utilityProcess (built-in Node.js runtime)
    if (utilityProcess && typeof utilityProcess.fork === 'function') {
      log('[Main]: Starting backend via Electron utilityProcess.fork...');
      backendProcess = utilityProcess.fork(serverPath, [], {
        cwd: serverDir,
        env: backendEnv,
        stdio: 'pipe'
      });

      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          log(`[Backend Log]: ${data.toString().trim()}`);
        });
      }

      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          logError(`[Backend Error]: ${data.toString().trim()}`);
        });
      }

      backendProcess.on('exit', (code) => {
        log(`[Main]: Backend utilityProcess exited with code ${code}`);
        if (!isQuitting && code !== 0) {
          log('[Main]: Attempting to restart backend process in 3 seconds...');
          setTimeout(startBackend, 3000);
        }
      });
      return;
    }
  } catch (err) {
    logError(`[Main]: utilityProcess failed: ${err.message}. Falling back to child_process...`);
  }

  // Strategy 2: Fallback to spawning process.execPath with ELECTRON_RUN_AS_NODE=1
  try {
    log('[Main]: Starting backend via process.execPath (ELECTRON_RUN_AS_NODE)...');
    backendProcess = spawn(process.execPath, [serverPath], {
      cwd: serverDir,
      env: {
        ...backendEnv,
        ELECTRON_RUN_AS_NODE: '1'
      },
      shell: false
    });

    backendProcess.stdout.on('data', (data) => {
      log(`[Backend Log]: ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      logError(`[Backend Error]: ${data.toString().trim()}`);
    });

    backendProcess.on('exit', (code, signal) => {
      log(`[Main]: Backend child_process exited with code ${code} and signal ${signal}`);
      if (!isQuitting && code !== 0) {
        log('[Main]: Attempting to restart backend process in 3 seconds...');
        setTimeout(startBackend, 3000);
      }
    });
  } catch (err) {
    logError(`[Main]: Failed to spawn backend process: ${err.message}`);
  }
}

function stopBackend() {
  if (backendProcess) {
    log('[Main]: Terminating offline Express backend child process...');
    try {
      if (typeof backendProcess.kill === 'function') {
        backendProcess.kill();
      }
    } catch (err) {
      logError(`[Main]: Error killing backend process: ${err.message}`);
    }
    backendProcess = null;
  }
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
        log('Vite dev server not ready yet, retrying in 1 second...');
        setTimeout(loadViteServer, 1000);
      });
    };
    loadViteServer();
    
    // Open Chrome devtools
    mainWindow.webContents.openDevTools();
  } else {
    // In prod: load compiled static HTML bundle
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    log(`[Main]: Loading frontend from: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle secure IPC communications from React Renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-log-path', () => {
  return path.join(app.getPath('userData'), 'backend.log');
});

ipcMain.on('print-document', (event, options) => {
  log(`print-document request received with options: ${JSON.stringify(options)}`);
});

// Electron bootstrap lifecycle hooks
app.whenReady().then(() => {
  setupLogging();
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

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

app.on('will-quit', () => {
  isQuitting = true;
  stopBackend();
  if (logStream) {
    logStream.end();
  }
});

