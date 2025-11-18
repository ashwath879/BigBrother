const { app, BrowserWindow, systemPreferences } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pythonProcess = null;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, load from the React dev server.
  // In production, load the built React app.
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Optionally open the DevTools.
  // mainWindow.webContents.openDevTools();
}

function startPythonBackend() {
    // Path to the Python backend script
    const backendPath = path.join(__dirname, 'Backend', 'app.py');
    
    // Start the Python process
    // Ensure 'python3' is in the system's PATH or provide a direct path.
    pythonProcess = spawn('python3', [backendPath]);

    // Log output from the Python script
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Backend Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python backend process exited with code ${code}`);
        // You might want to handle process exit here, e.g., show an error to the user
    });
}

async function requestMediaPermissions() {
    try {
        const camera = await systemPreferences.askForMediaAccess('camera');
        console.log(`Camera access: ${camera}`);
        
        const microphone = await systemPreferences.askForMediaAccess('microphone');
        console.log(`Microphone access: ${microphone}`);

        // You could add logic here to inform the user if they denied access
        if (!camera || !microphone) {
            console.error('Camera or microphone permissions were denied.');
        }
    } catch (error) {
        console.error('Could not request media permissions:', error);
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    await requestMediaPermissions();
  }
  startPythonBackend();
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On app quit, kill the Python backend process.
app.on('will-quit', () => {
    if (pythonProcess) {
        console.log('Stopping Python backend...');
        pythonProcess.kill();
    }
});
