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
  screen // Added screen here for better access
} = require('electron');

const SNIPPETS_FILE_NAME = 'snippets.json';
const SETTINGS_FILE_NAME = 'settings.json';
const ICON_FILE_NAME = 'icon.png';
const TRAY_ICON_FILE_NAME = 'tray-icon.png';

const USER_DATA_PATH = app.getPath('userData');
const SNIPPETS_FILE_PATH = path.join(USER_DATA_PATH, SNIPPETS_FILE_NAME);
const SETTINGS_FILE_PATH = path.join(USER_DATA_PATH, SETTINGS_FILE_NAME);
const ICON_PATH = path.join(__dirname, ICON_FILE_NAME);
const TRAY_ICON_PATH = path.join(__dirname, TRAY_ICON_FILE_NAME);

const DEFAULT_SNIPPETS = [
  { id: 1, title: 'Greeting', content: 'Thank you for your message.' },
  { id: 2, title: 'Appreciation', content: 'Thank you for your support.' },
  { id: 3, title: 'AI Instruction', content: 'Please summarize this content.' }
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
  // Ensure all default keys exist
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
 * Loads snippets.
 * @returns {Array<object>} An array of snippet objects.
 */
function loadSnippets() {
  return readJsonFile(SNIPPETS_FILE_PATH, DEFAULT_SNIPPETS);
}

/**
 * Saves snippets.
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
      contextIsolation: false // Consider setting to true for security if possible
    },
    title: 'Snippet Management',
    icon: ICON_PATH,
    show: true // Show immediately
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    mainWindow = null;
  });

  // Send initial theme state after loading
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
    show: false, // Initially hidden
    alwaysOnTop: true,
    skipTaskbar: true, // Don't show in taskbar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Consider setting to true for security if possible
    },
    icon: ICON_PATH
  });

  win.loadFile('snippets.html');

  // Hide the window when it loses focus
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
    // Use template image for macOS dark mode compatibility
    if (process.platform === 'darwin') {
      trayIconImage.setTemplateImage(true);
    }
  } else {
    console.warn('Tray icon file not found at:', TRAY_ICON_PATH, 'Creating empty icon.');
    trayIconImage = nativeImage.createEmpty(); // Fallback to empty icon
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
          mainWindow = createMainWindow(); // Recreate if closed
        }
      }
    },
    { label: 'Show Snippet Selector', click: showSnippetsWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Snippet Tool');
  tray.setContextMenu(contextMenu);

  // Optional: Handle tray icon click (e.g., toggle snippets window)
  tray.on('click', () => {
     if (snippetsWindow && !snippetsWindow.isDestroyed()) {
         if (snippetsWindow.isVisible()) {
             snippetsWindow.hide();
         } else {
             showSnippetsWindow();
         }
     } else {
         showSnippetsWindow(); // Show even if window was closed/destroyed
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
        // Notify all relevant windows about the theme change
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
 * Calculates the optimal position for the snippets window near the cursor
 * and displays the window. Sends necessary data (snippets, theme) to it.
 */
function showSnippetsWindow() {
  if (!snippetsWindow || snippetsWindow.isDestroyed()) {
    snippetsWindow = createSnippetsWindow(); // Recreate if needed
    // Need a slight delay to ensure window is ready for IPC
    setTimeout(() => {
        if (snippetsWindow && !snippetsWindow.isDestroyed()) {
            snippetsWindow.webContents.send('load-snippets', loadSnippets());
            snippetsWindow.webContents.send('theme-changed', isDarkMode);
        }
    }, 100); // Adjust delay if needed
  } else {
      // Window exists, just send data
      snippetsWindow.webContents.send('load-snippets', loadSnippets());
      snippetsWindow.webContents.send('theme-changed', isDarkMode);
  }


  const cursorPosition = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPosition);
  const workArea = currentDisplay.workArea;

  const windowSize = snippetsWindow.getSize();
  const windowWidth = windowSize[0];
  const windowHeight = windowSize[1];

  // Calculate optimal position (prefer bottom-right of cursor)
  let x = cursorPosition.x + 10;
  let y = cursorPosition.y + 10;

  // Adjust if window goes off-screen horizontally
  if (x + windowWidth > workArea.x + workArea.width) {
    x = cursorPosition.x - windowWidth - 10; // Move to left
  }
  // Adjust if window goes off-screen vertically
  if (y + windowHeight > workArea.y + workArea.height) {
    y = cursorPosition.y - windowHeight - 10; // Move above
  }

  // Ensure window stays within work area bounds (final check)
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - windowWidth));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - windowHeight));

  snippetsWindow.setPosition(x, y);
  snippetsWindow.show();
  snippetsWindow.focus(); // Ensure it gets focus
}

/**
 * Registers the global shortcut defined in settings.
 * Unregisters any existing shortcuts first.
 * Attempts to register alternative shortcuts if the primary one fails,
 * saving the successful alternative.
 */
function registerGlobalShortcut() {
  globalShortcut.unregisterAll(); // Clear previous shortcuts

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
          // Notify renderer process about the automatically changed shortcut
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('settings-updated', settings);
          }
          shortcutToRegister = altShortcut; // Update the registered shortcut
          break; // Stop trying alternatives
        }
      } catch (altError) {
          console.error(`Error registering alternative shortcut ${altShortcut}:`, altError);
      }
    }

    if (!altSuccess) {
      console.error('Failed to register any shortcut. Please use the tray icon or configure a different shortcut in settings.');
      // Consider showing a dialog to the user here
      // dialog.showErrorBox('Shortcut Registration Failed', 'Could not register any global shortcut. Please use the tray icon or configure a different shortcut in the settings.');
    }
  } else {
    console.log(`Successfully registered shortcut: ${shortcutToRegister}`);
  }
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  snippetsWindow = createSnippetsWindow(); // Create hidden window on startup
  setupTray();
  setupThemeHandling();
  registerGlobalShortcut(); // Register initial shortcut

  // macOS: Recreate window if dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      // Re-create snippets window as well if needed, or ensure it exists
      if (!snippetsWindow || snippetsWindow.isDestroyed()) {
          snippetsWindow = createSnippetsWindow();
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show(); // Show existing main window
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Unregister shortcuts before quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

/**
 * Handles the 'snippet-selected' event from the snippets window.
 * Copies the selected snippet content to the clipboard, updates its last used time,
 * saves the snippets, and hides the window.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 * @param {{id: number, content: string}} selectedSnippet - The selected snippet object containing id and content.
 */
ipcMain.on('snippet-selected', (event, selectedSnippet) => {
  if (!selectedSnippet || typeof selectedSnippet.id === 'undefined' || typeof selectedSnippet.content !== 'string') {
      console.error('Invalid data received for snippet-selected:', selectedSnippet);
      return;
  }

  clipboard.writeText(selectedSnippet.content);

  // Update lastUsed timestamp
  const snippets = loadSnippets();
  const snippetIndex = snippets.findIndex(s => s.id === selectedSnippet.id);
  if (snippetIndex !== -1) {
      snippets[snippetIndex].lastUsed = Date.now();
      saveSnippets(snippets); // Save updated snippets with timestamp

      // Optionally notify the main window if it's open
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

/**
 * Handles the 'save-snippet' event from the main window.
 * Saves or updates a snippet in the snippets file and notifies the main window.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 * @param {object} snippet - The snippet object to save (may have null/undefined id for new snippets).
 */
ipcMain.on('save-snippet', (event, snippet) => {
  const snippets = loadSnippets();
  const existingIndex = snippet.id !== null && snippet.id !== undefined
    ? snippets.findIndex(s => s.id === snippet.id)
    : -1;

  if (existingIndex >= 0) {
    // Update existing snippet
    snippets[existingIndex] = { ...snippets[existingIndex], ...snippet }; // Merge properties
  } else {
    // Add new snippet with a new ID
    // Ensure ID is unique and numeric
    const maxId = snippets.reduce((max, s) => Math.max(max, typeof s.id === 'number' ? s.id : 0), 0);
    snippet.id = maxId + 1;
    snippets.push(snippet);
  }

  saveSnippets(snippets);
  // Notify the main window renderer process that snippets have been updated
  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('snippets-updated', snippets);
  }
});

/**
 * Handles the 'delete-snippet' event from the main window.
 * Deletes a snippet from the snippets file and notifies the main window.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 * @param {number} snippetId - The ID of the snippet to delete.
 */
ipcMain.on('delete-snippet', (event, snippetId) => {
  let snippets = loadSnippets();
  snippets = snippets.filter(s => s.id !== snippetId);
  saveSnippets(snippets);
  // Notify the main window renderer process
  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('snippets-updated', snippets);
  }
});

/**
 * Handles the 'get-snippets' request from the main window's renderer process.
 * Sends the current list of snippets and theme state back.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 */
ipcMain.on('get-snippets', (event) => {
  const snippets = loadSnippets();
  event.sender.send('snippets-updated', snippets);
  // Send current theme state as well, as the window might have just loaded
  event.sender.send('theme-changed', isDarkMode);
});

/**
 * Handles the 'get-settings' request from the main window's renderer process.
 * Sends the current settings back.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 */
ipcMain.on('get-settings', (event) => {
  const settings = loadSettings();
  event.sender.send('settings-updated', settings);
});

/**
 * Handles the 'update-shortcut' request from the main window's renderer process.
 * Attempts to register the new shortcut. If successful, saves it.
 * If registration fails, attempts to revert to the old shortcut and notifies the renderer.
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 * @param {string} newShortcut - The new shortcut string (e.g., 'Alt+S').
 */
ipcMain.on('update-shortcut', (event, newShortcut) => {
  const settings = loadSettings();
  const oldShortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
  let updateSuccess = false;
  let finalShortcut = oldShortcut; // Assume failure initially

  // Unregister all shortcuts before trying the new one
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
      // Attempt to re-register the old shortcut
      try {
          globalShortcut.register(oldShortcut, showSnippetsWindow);
          console.log(`Successfully re-registered old shortcut: ${oldShortcut}`);
      } catch (revertError) {
          console.error(`Failed to re-register old shortcut ${oldShortcut} after new one failed:`, revertError);
          // At this point, no shortcut might be registered.
          finalShortcut = null; // Indicate no shortcut is active
      }
    }
  } catch (error) {
    console.error(`Error updating shortcut to ${newShortcut}:`, error);
    // Attempt to re-register the old shortcut in case of any error during update
    try {
        globalShortcut.register(oldShortcut, showSnippetsWindow);
        console.log(`Successfully re-registered old shortcut ${oldShortcut} after error.`);
    } catch (revertError) {
        console.error(`Failed to re-register old shortcut ${oldShortcut} after error:`, revertError);
        finalShortcut = null; // Indicate no shortcut is active
    }
  }

  // Notify the renderer of the outcome
  event.sender.send('shortcut-updated', { success: updateSuccess, shortcut: finalShortcut });
  // Also send the potentially updated settings object
  if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', loadSettings());
  }
});
