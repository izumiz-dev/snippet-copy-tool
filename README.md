# Snippet Copy Tool

Snippet Copy Tool is a cross-platform desktop application for managing and quickly copying frequently used text snippets. It is especially useful for streamlining repetitive input in AI chats, development, and daily work.

## Features

- **Snippet Management**: Add, edit, and delete text snippets with titles and content.
- **Customizable Shortcut**: Set your preferred global shortcut key to open the snippet selector window (default: Alt+S). If the shortcut is unavailable, alternatives are automatically tried.
- **Popup Selector**: The snippet selector window appears at the mouse cursor position for quick access.
- **Clipboard Integration**: Selected snippets are automatically copied to the clipboard.
- **System Tray**: Runs in the background and is accessible from the system tray icon.
- **Dark Mode Support**: Automatically switches between light and dark mode according to the system theme.
- **Persistent Data**: Snippets and settings are saved in your user data directory and persist after restart.
- **Simple UI**: Intuitive interface with tabs for snippet management and settings.
- **Search**: Quickly filter snippets by title or content.

## Usage

1. **Launch the App**: Start the application. The snippet management window appears, and an icon is shown in the system tray.
2. **Manage Snippets**: Add, edit, or delete snippets in the management window.
3. **Select Snippet**: Press the configured shortcut key (default: Alt+S) or use the tray icon menu to open the snippet selector at the mouse cursor position.
4. **Copy and Paste**: Selecting a snippet copies it to the clipboard. Paste it anywhere with Ctrl+V (or Command+V on Mac).

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
# Generate icons
npm run build-icons

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
- **Jimp**: Icon generation

## File Structure

```
snippet-copy-tool/
├── build/            # Build artifacts
│   └── icons/        # Icons of various sizes
├── icons/            # Icon sources
├── node_modules/     # Dependencies (gitignored)
├── build-icons.js    # Icon generation script
├── icon.png          # Main app icon
├── index.html        # Snippet management and settings UI
├── index.css         # Main UI styles
├── main.js           # Electron main process
├── package.json      # Project settings
├── snippets.html     # Snippet selector popup
└── tray-icon.png     # System tray icon
```

## Main Features

### 1. Cross-Platform Support
Works on Windows, macOS, and Linux.

### 2. Dark Mode Support
Follows your system's light/dark mode automatically.

### 3. Persistent Settings
Snippets and shortcut settings are saved and persist after restarting the app.

### 4. Simple Interface
Easy-to-use UI with tabs for snippet management and settings.

### 5. Shortcut Customization
Customize the global shortcut key from the settings tab. If the chosen shortcut is unavailable, alternatives are tried and saved automatically.

### 6. Search
Filter snippets by title or content in real time.

## Limitations

- Automatic paste is not implemented (only copy to clipboard)
- File attachments and rich text are not supported
- Categories and tags are not implemented

## Planned Enhancements

- Snippet categorization
- Template/variable replacement
- Cloud sync
- More advanced search

## License

MIT License

## Author

Your Name
