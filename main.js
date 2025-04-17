// electron.jsのメインプロセス側のコード (main.js)
const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;
let snippetsWindow;

// システムテーマの状態をグローバル変数として保持
let isDarkMode = nativeTheme.shouldUseDarkColors;

// データの保存先
const snippetsFilePath = path.join(app.getPath('userData'), 'snippets.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

// デフォルト設定
const defaultSettings = {
  shortcut: 'Alt+S'
};

// 設定データの読み込み
function loadSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

// 設定データの保存
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// スニペットデータの読み込み
function loadSnippets() {
  try {
    if (fs.existsSync(snippetsFilePath)) {
      const data = fs.readFileSync(snippetsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading snippets:', error);
  }
  // Default snippets
  return [
    { id: 1, title: 'Greeting', content: 'Thank you for your message.' },
    { id: 2, title: 'Appreciation', content: 'Thank you for your support.' },
    { id: 3, title: 'AI Instruction', content: 'Please summarize this content.' }
  ];
}

// スニペットデータの保存
function saveSnippets(snippets) {
  try {
    fs.writeFileSync(snippetsFilePath, JSON.stringify(snippets, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving snippets:', error);
  }
}

function createWindow() {
  // メイン管理ウィンドウ
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Snippet Management',
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // スニペットの選択ウィンドウ（初期状態は非表示）
  snippetsWindow = new BrowserWindow({
    width: 300,
    height: 400,
    frame: false,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png')
  });
  
  snippetsWindow.loadFile('snippets.html');
  
  // スニペットウィンドウが閉じられないようにする
  snippetsWindow.on('blur', () => {
    snippetsWindow.hide();
  });

  // システムトレイのセットアップ
  let trayIcon;
  
  // トレイアイコンの読み込み（ファイルが存在する場合）
  const trayIconPath = path.join(__dirname, 'tray-icon.png');
  if (fs.existsSync(trayIconPath)) {
    trayIcon = nativeImage.createFromPath(trayIconPath);
    if (process.platform === 'darwin') {
      trayIcon = trayIcon.template = true; // macOS用テンプレートアイコン
    }
  } else {
    // トレイアイコンがない場合は空のアイコンを作成
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Snippet Manager', click: () => mainWindow.show() },
    { label: 'Show Snippet Selector', click: showSnippetsWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Snippet Tool');
  tray.setContextMenu(contextMenu);
  
  // グローバルショートカットの登録
  registerGlobalShortcut();
  
  // テーマ変更時の処理
  nativeTheme.on('updated', () => {
    isDarkMode = nativeTheme.shouldUseDarkColors;
    // すべてのウィンドウにテーマ変更を通知
    mainWindow.webContents.send('theme-changed', isDarkMode);
    if (snippetsWindow && !snippetsWindow.isDestroyed()) {
      snippetsWindow.webContents.send('theme-changed', isDarkMode);
    }
  });
}

// スニペット選択ウィンドウを表示
function showSnippetsWindow() {
  // マウスカーソルの位置を取得
  const { screen } = require('electron');
  const cursorPosition = screen.getCursorScreenPoint();
  
  // 現在のスクリーン情報を取得
  const currentDisplay = screen.getDisplayNearestPoint(cursorPosition);
  const workArea = currentDisplay.workArea;
  
  // スニペットウィンドウのサイズを取得
  const windowSize = snippetsWindow.getSize();
  const windowWidth = windowSize[0];
  const windowHeight = windowSize[1];
  
  // 最適な位置を計算（マウスの少し右下に表示）
  let x = cursorPosition.x + 10; // マウスから少し右にオフセット
  let y = cursorPosition.y + 10; // マウスから少し下にオフセット
  
  // 画面右端からはみ出す場合は左側に表示
  if (x + windowWidth > workArea.x + workArea.width) {
    x = cursorPosition.x - windowWidth - 10;
  }
  
  // 画面下端からはみ出す場合は上側に表示
  if (y + windowHeight > workArea.y + workArea.height) {
    y = cursorPosition.y - windowHeight - 10;
  }
  
  // 計算された位置にウィンドウを表示
  snippetsWindow.setPosition(x, y);
  snippetsWindow.show();
  snippetsWindow.webContents.send('load-snippets', loadSnippets());
  // 現在のテーマ状態も送信
  snippetsWindow.webContents.send('theme-changed', isDarkMode);
}

// アプリ準備完了時
app.whenReady().then(() => {
  createWindow();
  
  // 初期テーマ状態を送信
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('theme-changed', isDarkMode);
  });
  
  // macOSでの対応
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 全てのウィンドウが閉じられたら終了（ただしmacOSでは例外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// グローバルショートカットの登録関数
function registerGlobalShortcut() {
  // 既存のショートカットを解除
  globalShortcut.unregisterAll();
  
  // 設定からショートカットを読み込み
  const settings = loadSettings();
  let shortcut = settings.shortcut || 'Alt+S';
  
  // ショートカットの登録試行
  try {
    console.log(`Trying to register shortcut ${shortcut}...`);
    const success = globalShortcut.register(shortcut, showSnippetsWindow);
    
    if (!success) {
      console.error(`Failed to register shortcut ${shortcut}`);
      
      // 代替ショートカットのリスト
      const alternativeShortcuts = ['Ctrl+Shift+Space', 'Alt+Shift+S', 'Ctrl+Alt+S', 'Alt+Z', 'Ctrl+Alt+Z'];
      
      // 代替ショートカットを試す
      let altSuccess = false;
      for (const altShortcut of alternativeShortcuts) {
        console.log(`Trying alternative shortcut ${altShortcut}...`);
        altSuccess = globalShortcut.register(altShortcut, showSnippetsWindow);
        
        if (altSuccess) {
          console.log(`Successfully registered alternative shortcut ${altShortcut}`);
          
          // 成功した代替ショートカットを設定に保存
          settings.shortcut = altShortcut;
          saveSettings(settings);
          
          // メインウィンドウが準備できていれば、通知を送信
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('settings-updated', settings);
          }
          
          break;
        }
      }
      
      // すべての代替ショートカットも失敗した場合の処理
      if (!altSuccess) {
        console.error('Failed to register any shortcut. Please use the tray icon.');
      }
    } else {
      console.log(`Successfully registered shortcut ${shortcut}`);
    }
  } catch (error) {
    console.error(`Shortcut registration error:`, error);
    
    // If an error occurs, guide to use tray icon
    console.error('Error occurred during shortcut registration. Please use the tray icon.');
  }
}

// スニペットを選択したときの処理
ipcMain.on('snippet-selected', (event, snippetContent) => {
  // クリップボードにコピー
  clipboard.writeText(snippetContent);
  
  // スニペットウィンドウを非表示
  snippetsWindow.hide();
  
  // 通知を表示
  const { Notification } = require('electron');
  new Notification({
    title: 'Snippet copied',
    body: 'Press Ctrl+V (or Command+V) to paste anywhere.',
    icon: path.join(__dirname, 'icon.png')
  }).show();
});

// 新しいスニペットの追加・更新
ipcMain.on('save-snippet', (event, snippet) => {
  const snippets = loadSnippets();
  
  // 既存のスニペットの更新または新規追加
  const existingIndex = snippets.findIndex(s => s.id === snippet.id);
  if (existingIndex >= 0) {
    snippets[existingIndex] = snippet;
  } else {
    // 新規追加の場合は新しいIDを割り当て
    snippet.id = Math.max(0, ...snippets.map(s => s.id)) + 1;
    snippets.push(snippet);
  }
  
  saveSnippets(snippets);
  mainWindow.webContents.send('snippets-updated', snippets);
});

// スニペットの削除
ipcMain.on('delete-snippet', (event, snippetId) => {
  const snippets = loadSnippets().filter(s => s.id !== snippetId);
  saveSnippets(snippets);
  mainWindow.webContents.send('snippets-updated', snippets);
});

// スニペットの取得要求
ipcMain.on('get-snippets', (event) => {
  const snippets = loadSnippets();
  event.sender.send('snippets-updated', snippets);
  // 現在のテーマ状態も送信
  event.sender.send('theme-changed', isDarkMode);
});

// 設定の取得要求
ipcMain.on('get-settings', (event) => {
  const settings = loadSettings();
  event.sender.send('settings-updated', settings);
});

// ショートカット設定の更新
ipcMain.on('update-shortcut', (event, shortcut) => {
  const settings = loadSettings();
  const oldShortcut = settings.shortcut;
  settings.shortcut = shortcut;
  saveSettings(settings);
  
  // 既存のショートカットを解除
  globalShortcut.unregisterAll();
  
  // 新しいショートカットを登録してみる
  try {
    const success = globalShortcut.register(shortcut, showSnippetsWindow);
    
    if (success) {
      // 成功した場合
      console.log(`Successfully registered shortcut "${shortcut}"`);
      
      // 設定の更新を通知
      mainWindow.webContents.send('settings-updated', settings);
      
      // 成功メッセージを送信
      event.sender.send('shortcut-updated', { success: true, shortcut });
    } else {
      // 失敗した場合は元のショートカットに戻す
      console.error(`Failed to register shortcut "${shortcut}"`);
      
      // 元のショートカットを再設定
      settings.shortcut = oldShortcut;
      saveSettings(settings);
      
      // 元のショートカットを登録し直す
      registerGlobalShortcut();
      
      // 失敗メッセージを送信
      event.sender.send('shortcut-updated', { success: false, shortcut });
    }
  } catch (error) {
    console.error(`ショートカット登録エラー:`, error);
    
    // 元のショートカットを再設定
    settings.shortcut = oldShortcut;
    saveSettings(settings);
    
    // 元のショートカットを登録し直す
    registerGlobalShortcut();
    
    // 失敗メッセージを送信
    event.sender.send('shortcut-updated', { success: false, shortcut });
  }
});
