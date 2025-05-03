/**
 * @file Electron main process script for the Snippet Copy Tool.
 * Handles application lifecycle, window management, global shortcuts,
 * data storage (snippets and settings), IPC communication, and system tray integration.
 */
const path = require('path');
const fs = require('fs');

const {
  app,
  BrowserWindow,
  globalShortcut,
  clipboard,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  nativeTheme,
  screen
} = require('electron');

const SNIPPETS_FILE_NAME = 'snippets.json';
const FOLDERS_FILE_NAME = 'folders.json';
const SETTINGS_FILE_NAME = 'settings.json';
const ICON_FILE_NAME = 'icon.png';
const TRAY_ICON_FILE_NAME = 'tray-icon.png';

const USER_DATA_PATH = app.getPath('userData');
const SNIPPETS_FILE_PATH = path.join(USER_DATA_PATH, SNIPPETS_FILE_NAME);
const FOLDERS_FILE_PATH = path.join(USER_DATA_PATH, FOLDERS_FILE_NAME);
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, SETTINGS_FILE_NAME);
const ICON_PATH = path.join(__dirname, ICON_FILE_NAME);
const TRAY_ICON_PATH = path.join(__dirname, TRAY_ICON_FILE_NAME);

const DEFAULT_SNIPPETS = [
  { id: 1, title: 'Greeting', content: 'Thank you for your message.', folderId: 'none' },
  { id: 2, title: 'Appreciation', content: 'Thank you for your support.', folderId: 'none' },
  { id: 3, title: 'AI Instruction', content: 'Please summarize this content.', folderId: 'none' }
];

const DEFAULT_FOLDERS = [
  { id: 'none', name: 'Uncategorized' }
];

const DEFAULT_SETTINGS = {
  shortcut: 'Alt+S'
};

const ALTERNATIVE_SHORTCUTS = ['Ctrl+Shift+Space', 'Alt+Shift+S', 'Ctrl+Alt+S', 'Alt+Z', 'Ctrl+Alt+Z'];

/** @type {BrowserWindow | null} The main application window instance. */
let mainWindow = null;
/** @type {BrowserWindow | null} The snippet selection popup window instance. */
let snippetsWindow = null;
/** @type {Tray | null} The system tray icon instance. */
let tray = null;
/** @type {boolean} Stores the current system theme state (dark or light). */
let isDarkMode = nativeTheme.shouldUseDarkColors;

/**
 * Reads data from a JSON file safely.
 * @param {string} filePath - The path to the JSON file.
 * @param {*} defaultValue - The value to return if reading fails or file doesn't exist.
 * @returns {*} The parsed JSON data or the default value.
 */
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading JSON file at ${filePath}:`, error);
  }
  return defaultValue;
}

/**
 * Writes data to a JSON file safely.
 * @param {string} filePath - The path to the JSON file.
 * @param {*} data - The data to write.
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing JSON file to ${filePath}:`, error);
  }
}

/**
 * Loads application settings.
 * @returns {object} The loaded settings object merged with defaults.
 */
function loadSettings() {
  const loaded = readJsonFile(SETTINGS_FILE_PATH, {});
  return { ...DEFAULT_SETTINGS, ...loaded };
}

/**
 * Saves application settings.
 * @param {object} settings - The settings object to save.
 */
function saveSettings(settings) {
  writeJsonFile(SETTINGS_FILE_PATH, settings);
}

/**
 * Loads folders from storage.
 * @returns {Array<object>} An array of folder objects.
 */
function loadFolders() {
  const folders = readJsonFile(FOLDERS_FILE_PATH, DEFAULT_FOLDERS);
  // Add 'Uncategorized' folder if it doesn't exist
  if (!folders.find(f => f.id === 'none')) {
    folders.unshift({ id: 'none', name: 'Uncategorized' });
  }
  return folders;
}

/**
 * Saves folders to storage.
 * @param {Array<object>} folders - The array of folder objects to save.
 */
function saveFolders(folders) {
  writeJsonFile(FOLDERS_FILE_PATH, folders);
}

/**
 * Loads snippets from storage.
 * @returns {Array<object>} An array of snippet objects.
 */
function loadSnippets() {
  const snippets = readJsonFile(SNIPPETS_FILE_PATH, DEFAULT_SNIPPETS);
  // Ensure all snippets have folderId property
  return snippets.map(s => ({
    ...s,
    folderId: s.folderId === undefined || s.folderId === null ? 'none' : s.folderId
  }));
}

/**
 * Saves snippets to storage.
 * @param {Array<object>} snippets - The array of snippet objects to save.
 */
function saveSnippets(snippets) {
  writeJsonFile(SNIPPETS_FILE_PATH, snippets);
}

/**
 * Creates the main application window.
 * @returns {BrowserWindow} The created main window instance.
 */
function createMainWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Snippet Management',
    icon: ICON_PATH,
    show: true
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    mainWindow = null;
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('theme-changed', isDarkMode);
  });

  return win;
}

/**
 * Creates the hidden snippet selection window.
 * @returns {BrowserWindow} The created snippets window instance.
 */
function createSnippetsWindow() {
  const win = new BrowserWindow({
    width: 300,
    height: 400,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: ICON_PATH
  });

  win.loadFile('snippets.html');

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyUp' && input.key === 'Escape' && win.isVisible()) {
      win.hide();
      event.preventDefault();
    }
  });

  win.on('blur', () => {
    if (win && !win.isDestroyed()) {
      win.hide();
    }
  });

  win.on('closed', () => {
    snippetsWindow = null;
  });

  return win;
}

/**
 * Sets up the system tray icon and context menu.
 */
function setupTray() {
  let trayIconImage;
  if (fs.existsSync(TRAY_ICON_PATH)) {
    trayIconImage = nativeImage.createFromPath(TRAY_ICON_PATH);
    if (process.platform === 'darwin') {
      trayIconImage.setTemplateImage(true);
    }
  } else {
    console.warn('Tray icon file not found at:', TRAY_ICON_PATH, 'Creating empty icon.');
    trayIconImage = nativeImage.createEmpty();
  }

  tray = new Tray(trayIconImage);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Snippet Manager',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          mainWindow = createMainWindow();
        }
      }
    },
    { label: 'Show Snippet Selector', click: showSnippetsWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Snippet Tool');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (snippetsWindow && !snippetsWindow.isDestroyed()) {
      if (snippetsWindow.isVisible()) {
        snippetsWindow.hide();
      } else {
        showSnippetsWindow();
      }
    } else {
      showSnippetsWindow();
    }
  });
}

/**
 * Sets up handling for system theme changes (dark/light mode).
 */
function setupThemeHandling() {
  nativeTheme.on('updated', () => {
    const newIsDarkMode = nativeTheme.shouldUseDarkColors;
    if (newIsDarkMode !== isDarkMode) {
      isDarkMode = newIsDarkMode;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('theme-changed', isDarkMode);
      }
      if (snippetsWindow && !snippetsWindow.isDestroyed()) {
        snippetsWindow.webContents.send('theme-changed', isDarkMode);
      }
    }
  });
}

/**
 * Shows the snippets window at the optimal position near the cursor.
 */
function showSnippetsWindow() {
  if (!snippetsWindow || snippetsWindow.isDestroyed()) {
    snippetsWindow = createSnippetsWindow();
    setTimeout(() => {
      if (snippetsWindow && !snippetsWindow.isDestroyed()) {
        const snippets = loadSnippets();
        const folders = loadFolders();
        snippetsWindow.webContents.send('load-snippets', { snippets, folders });
        snippetsWindow.webContents.send('theme-changed', isDarkMode);
      }
    }, 100);
  } else {
    const snippets = loadSnippets();
    const folders = loadFolders();
    snippetsWindow.webContents.send('load-snippets', { snippets, folders });
    snippetsWindow.webContents.send('theme-changed', isDarkMode);
  }

  const cursorPosition = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPosition);
  const workArea = currentDisplay.workArea;

  const windowSize = snippetsWindow.getSize();
  const windowWidth = windowSize[0];
  const windowHeight = windowSize[1];

  let x = cursorPosition.x + 10;
  let y = cursorPosition.y + 10;

  if (x + windowWidth > workArea.x + workArea.width) {
    x = cursorPosition.x - windowWidth - 10;
  }
  if (y + windowHeight > workArea.y + workArea.height) {
    y = cursorPosition.y - windowHeight - 10;
  }

  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - windowWidth));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - windowHeight));

  snippetsWindow.setPosition(x, y);
  snippetsWindow.show();
  snippetsWindow.focus();
}

/**
 * Registers the global shortcut for showing the snippets window.
 */
function registerGlobalShortcut() {
  globalShortcut.unregisterAll();

  const settings = loadSettings();
  let shortcutToRegister = settings.shortcut || DEFAULT_SETTINGS.shortcut;

  console.log(`Attempting to register shortcut: ${shortcutToRegister}`);
  let success = globalShortcut.register(shortcutToRegister, showSnippetsWindow);

  if (!success) {
    console.warn(`Failed to register primary shortcut: ${shortcutToRegister}. Trying alternatives...`);
    let altSuccess = false;
    for (const altShortcut of ALTERNATIVE_SHORTCUTS) {
      console.log(`Trying alternative: ${altShortcut}`);
      try {
        altSuccess = globalShortcut.register(altShortcut, showSnippetsWindow);
        if (altSuccess) {
          console.log(`Successfully registered alternative shortcut: ${altShortcut}`);
          settings.shortcut = altShortcut;
          saveSettings(settings);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('settings-updated', settings);
          }
          shortcutToRegister = altShortcut;
          break;
        }
      } catch (altError) {
        console.error(`Error registering alternative shortcut ${altShortcut}:`, altError);
      }
    }

    if (!altSuccess) {
      console.error('Failed to register any shortcut. Please use the tray icon or configure a different shortcut in settings.');
    }
  } else {
    console.log(`Successfully registered shortcut: ${shortcutToRegister}`);
  }
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  snippetsWindow = createSnippetsWindow();
  setupTray();
  setupThemeHandling();
  registerGlobalShortcut();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      if (!snippetsWindow || snippetsWindow.isDestroyed()) {
        snippetsWindow = createSnippetsWindow();
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Event Handlers

ipcMain.on('snippet-selected', (event, selectedSnippet) => {
  if (!selectedSnippet || typeof selectedSnippet.id === 'undefined' || typeof selectedSnippet.content !== 'string') {
    console.error('Invalid data received for snippet-selected:', selectedSnippet);
    return;
  }

  clipboard.writeText(selectedSnippet.content);

  const snippets = loadSnippets();
  const snippetIndex = snippets.findIndex(s => s.id === selectedSnippet.id);
  if (snippetIndex !== -1) {
    snippets[snippetIndex].lastUsed = Date.now();
    saveSnippets(snippets);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('snippets-updated', snippets);
    }
  } else {
    console.warn(`Snippet with ID ${selectedSnippet.id} not found for timestamp update.`);
  }

  if (snippetsWindow && !snippetsWindow.isDestroyed()) {
    snippetsWindow.hide();
  }
});

ipcMain.on('save-snippet', (event, snippet) => {
  const snippets = loadSnippets();
  const existingIndex = snippet.id !== null && snippet.id !== undefined
    ? snippets.findIndex(s => s.id === snippet.id)
    : -1;

  if (existingIndex >= 0) {
    snippets[existingIndex] = { ...snippets[existingIndex], ...snippet };
  } else {
    const maxId = snippets.reduce((max, s) => Math.max(max, typeof s.id === 'number' ? s.id : 0), 0);
    snippet.id = maxId + 1;
    snippet.folderId = snippet.folderId || 'none';
    snippets.push(snippet);
  }

  saveSnippets(snippets);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('snippets-updated', snippets);
  }
});

ipcMain.on('delete-snippet', (event, snippetId) => {
  let snippets = loadSnippets();
  snippets = snippets.filter(s => s.id !== snippetId);
  saveSnippets(snippets);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('snippets-updated', snippets);
  }
});

ipcMain.on('get-snippets', (event) => {
  const snippets = loadSnippets();
  event.sender.send('snippets-updated', snippets);
  event.sender.send('theme-changed', isDarkMode);
});

ipcMain.on('get-folders', (event) => {
  const folders = loadFolders();
  event.sender.send('folders-updated', folders);
});

ipcMain.on('reorder-folders', (event, newFolders) => {
  saveFolders(newFolders);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('folders-updated', newFolders);
  }
  if (snippetsWindow && !snippetsWindow.isDestroyed()) {
    snippetsWindow.webContents.send('load-snippets', { snippets: loadSnippets(), folders: newFolders });
  }
});

ipcMain.on('get-settings', (event) => {
  const settings = loadSettings();
  event.sender.send('settings-updated', settings);
});

ipcMain.on('update-shortcut', (event, newShortcut) => {
  const settings = loadSettings();
  const oldShortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
  let updateSuccess = false;
  let finalShortcut = oldShortcut;

  globalShortcut.unregisterAll();

  try {
    console.log(`Attempting to update shortcut to: ${newShortcut}`);
    const registrationSuccess = globalShortcut.register(newShortcut, showSnippetsWindow);

    if (registrationSuccess) {
      console.log(`Successfully updated shortcut to: ${newShortcut}`);
      settings.shortcut = newShortcut;
      saveSettings(settings);
      updateSuccess = true;
      finalShortcut = newShortcut;
    } else {
      console.warn(`Failed to register new shortcut: ${newShortcut}. Reverting to ${oldShortcut}.`);
      try {
        globalShortcut.register(oldShortcut, showSnippetsWindow);
        console.log(`Successfully re-registered old shortcut: ${oldShortcut}`);
      } catch (revertError) {
        console.error(`Failed to re-register old shortcut ${oldShortcut} after new one failed:`, revertError);
        finalShortcut = null;
      }
    }
  } catch (error) {
    console.error(`Error updating shortcut to ${newShortcut}:`, error);
    try {
      globalShortcut.register(oldShortcut, showSnippetsWindow);
      console.log(`Successfully re-registered old shortcut ${oldShortcut} after error.`);
    } catch (revertError) {
      console.error(`Failed to re-register old shortcut ${oldShortcut} after error:`, revertError);
      finalShortcut = null;
    }
  }

  event.sender.send('shortcut-updated', { success: updateSuccess, shortcut: finalShortcut });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-updated', loadSettings());
  }
});

// Folder Management IPC Events

ipcMain.on('save-folder', (event, folder) => {
  const folders = loadFolders();
  const existingIndex = folder.id ? folders.findIndex(f => f.id === folder.id) : -1;

  if (existingIndex >= 0) {
    folders[existingIndex] = folder;
  } else {
    const maxId = folders.reduce((max, f) => {
      if (f.id === 'none') return max;
      const idNum = parseInt(f.id.slice(1)) || 0;
      return Math.max(max, idNum);
    }, 0);
    folder.id = `f${maxId + 1}`;
    folders.push(folder);
  }

  saveFolders(folders);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('folders-updated', folders);
  }
});

ipcMain.on('delete-folder', (event, folderId) => {
  // Cannot delete the 'Uncategorized' folder
  if (folderId === 'none') {
    return;
  }

  let folders = loadFolders();
  folders = folders.filter(f => f.id !== folderId);
  saveFolders(folders);

  // Move snippets in deleted folder to uncategorized
  const snippets = loadSnippets();
  const updatedSnippets = snippets.map(s => 
    s.folderId === folderId ? { ...s, folderId: 'none' } : s
  );
  saveSnippets(updatedSnippets);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('folders-updated', folders);
    mainWindow.webContents.send('snippets-updated', updatedSnippets);
  }
});
