const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const Store = require('electron-store');

const store = new Store();
let mainWindow = null, settingsWindow = null, tray = null, pingInterval = null, contextMenu = null, isQuitting = false;

console.log('Store path:', store.path);

function getTimeSettings() {
  return store.get('time-settings', {
      time2: 51,
      time3: 151,
      time4: 351,
      ip: '8.8.8.8',
  });
}

function createBaseWindow(options) {
  return new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
}

function createWindow() {
  mainWindow = createBaseWindow({});

  mainWindow.loadFile("index.html");

  tray = new Tray(
    nativeImage.createFromPath(path.join(__dirname, "img/icon_1.png"))
  );

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  updateMenu();
}

function createSettingsWindow () {
  settingsWindow = createBaseWindow({});

  const timeSettings = getTimeSettings();

  settingsWindow.webContents.on('did-finish-load', () => {
    settingsWindow.webContents.send('load-settings', timeSettings);
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      settingsWindow.hide();
    }
  });
}

function ping() {
  const timeSettings = getTimeSettings();
  const ip = timeSettings.ip;

  let timeout = setTimeout(() => {
    if (pingInterval) {
      updateTray();
    }
  }, 5000);

  exec(`ping -c 4 ${ip}`, (error, stdout, stderr) => {
    clearTimeout(timeout);

    if (error || stderr) {
      console.error(`Error ping: ${error}`);
      console.error(`Stderr: ${stderr}`);
      if (pingInterval) {
        updateTray();
      }
      return;
    }

    const match = stdout.match(/time=(\d+\.\d+)/);
    if (match) {
      const time = parseFloat(match[1]);
      console.log(`Time: ${time}`);
      if (pingInterval) {
        updateTray(time);
      }
    } else {
      console.error("No match found in stdout");
    }
  });
}

function updateMenu() {
  const menuTemplate = pingInterval ? 
  [
      { label: "Stop", click: stopPing },
      { label: "About", click: showMain },
      { label: "Settings", click: showSettings },
      { label: "Quit", click: quitApp }
  ] :
  [
      { label: "Start", click: startPing },
      { label: "About", click: showMain },
      { label: "Settings", click: showSettings },
      { label: "Quit", click: quitApp }
  ];

  contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

function startPing() {
  pingInterval = setInterval(ping, 1000);
  updateMenu();
}

function stopPing() {
  clearInterval(pingInterval);
  pingInterval = null;
  updateMenu();
  tray.setImage(nativeImage.createFromPath(path.join(__dirname, "img/icon_1.png")));
}

function showMain() {
  if (!mainWindow) createWindow();
  mainWindow.show();
}

function showSettings() {
  if (!settingsWindow) createSettingsWindow();
  settingsWindow.show();
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

function updateTray(time) {
  const timeSettings = getTimeSettings();

  let icon, tooltip;

  if (time === undefined || time >= timeSettings.time4) {
    icon = "img/icon_5.png";
    tooltip = time ? `${time.toFixed(2)} ms` : "Error";
  } else if (time < timeSettings.time2) {
    icon = "img/icon_2.png";
    tooltip = `${time.toFixed(2)} ms`;
  } else if (time < timeSettings.time3) {
    icon = "img/icon_3.png";
    tooltip = `${time.toFixed(2)} ms`;
  } else if (time < timeSettings.time4) {
    icon = "img/icon_4.png";
    tooltip = `${time.toFixed(2)} ms`;
  }

  tray.setImage(nativeImage.createFromPath(path.join(__dirname, icon)));
  tray.setToolTip(tooltip);
}

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }
  createWindow();
  createSettingsWindow();
  startPing();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('save-settings', (event, settings) => {

  console.log('Received save-settings event with', settings);

  store.set('time-settings', settings);

  console.log('Settings saved in main.js');

  event.sender.send('settings-saved');
});

ipcMain.on('request-settings', (event) => {
  const savedSettings = store.get('time-settings');
  event.sender.send('load-settings', savedSettings);
});
