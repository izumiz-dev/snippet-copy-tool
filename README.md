# Snippet Copy Tool

<p align="center">
  <img src="./icon.png" alt="Snippet Copy Tool Icon" width="128">
</p>

Snippet Copy Tool is a cross-platform desktop application for managing and quickly copying frequently used text snippets. It is especially useful for streamlining repetitive input in AI chats, development, and daily work.

## Features

- **Snippet & Folder Management**: Add, edit, delete, and organize snippets using folders. Create, rename, delete, and reorder folders.
- **Customizable Shortcut**: Set your preferred global shortcut key (default: Alt+S). If unavailable, alternatives are tried and the first successful one is saved automatically.
- **Smart Popup Selector**: The snippet selector window appears near the mouse cursor, automatically adjusting its position to stay within screen bounds. Close it quickly with the Escape key.
- **Clipboard Integration**: Selected snippets are automatically copied to the clipboard.
- **System Tray Integration**: Runs in the background. Access manager, toggle selector visibility via click, or quit from the tray icon menu.
- **Dark Mode Support**: Automatically adapts to the system's light or dark theme.
- **Persistent Data**: Snippets, folders, and settings are saved in your system's standard user data directory and persist across restarts. The specific location depends on your operating system (e.g., `%APPDATA%` on Windows, `~/Library/Application Support` on macOS, `~/.config` on Linux). The application uses Electron's `app.getPath('userData')` to determine the exact path.
- **Simple UI**: Intuitive interface with tabs for snippet management, folder management, and settings.
- **Search**: Quickly filter snippets by title or content across all folders.

## Usage

1. **Launch the App**: Start the application. The snippet management window appears, and an icon is shown in the system tray.
2. **Manage Snippets & Folders**: Use the management window to add/edit/delete snippets and assign them to folders. Manage folders (create, rename, delete, reorder) in the dedicated tab.
3. **Select Snippet**: Press the configured shortcut key (default: Alt+S) or click the tray icon to open the snippet selector near the mouse cursor. Use search or browse folders.
4. **Copy and Paste**: Selecting a snippet copies it to the clipboard. Close the selector with Escape or by clicking away. Paste with Ctrl+V (or Command+V on Mac).

## Installation

```bash
# Clone the repository
git clone https://github.com/izumiz-dev/snippet-copy-tool.git
cd snippet-copy-tool

# Install dependencies
npm install

# Start the application
npm start
```

## Build

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux

# Build for all platforms
npm run build
```

## Tech Stack

- **Electron**: Cross-platform desktop app framework
- **Node.js**: Backend processing
- **HTML/CSS/JavaScript**: UI implementation
- **clipboardy**: Clipboard operations

## File Structure

```
snippet-copy-tool/
├── build/            # Build artifacts (gitignored)
├── node_modules/     # Dependencies (gitignored)
├── icon.png          # Main app icon (macOS/Linux)
├── icon.ico          # Main app icon (Windows)
├── index.html        # Snippet management and settings UI
├── index.css         # Main UI styles
├── main.js           # Electron main process
├── package.json      # Project settings
├── snippets.html     # Snippet selector popup
└── README.md         # This file
```

## Limitations

- Automatic paste is not implemented (only copies to clipboard).
- File attachments and rich text snippets are not supported.

## Planned Enhancements

- Template/variable replacement within snippets.
- Cloud synchronization options.
- More advanced search/filtering capabilities.

## License

MIT License

