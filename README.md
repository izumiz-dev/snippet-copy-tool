# Snippet Copy Tool

Snippet Copy Tool is a desktop application that allows you to easily manage frequently used text snippets and copy them anywhere. It is especially useful for streamlining repetitive input in AI chats and development work.

## Features

- **Snippet Management**: Add, edit, and delete text snippets with titles and content.
- **Customizable Shortcuts**: Freely set the shortcut key to display the snippet selection window (default: Alt+S).
- **Popup Selection**: The snippet selection window appears at the mouse cursor position.
- **Clipboard Integration**: Selected snippets are automatically copied to the clipboard.
- **System Tray Resident**: Runs in the background and appears only when needed.
- **Dark Mode Support**: Automatically switches according to the system theme.

## Usage

1. **Launch the App**: When you start the application, the snippet management screen appears and an icon is shown in the system tray.
2. **Manage Snippets**: You can add, edit, and delete snippets on the management screen.
3. **Select Snippet**: Press the configured shortcut key (default: Alt+S) or right-click the system tray icon and select "Show Snippet Selector" to display the snippet selection window at the cursor position.
4. **Copy and Paste Snippet**: When you select a snippet, it is copied to the clipboard. You can paste it anywhere with "Ctrl+V" (or "Command+V" on Mac).

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/snippet-copy-tool.git
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
├── main.js           # Main process
├── package.json      # Project settings
├── snippets.html     # Snippet selection popup
└── tray-icon.png     # System tray icon
```

## Main Features

### 1. Cross-Platform Support
Designed to work on Windows, macOS, and Linux.

### 2. Dark Mode Support
Automatically switches between light and dark modes according to the system theme.

### 3. Persistent Settings
Snippets and shortcut settings are saved in the user's application data directory and persist after restarting the app.

### 4. Simple Interface
Intuitive UI design allows you to start using it immediately without special knowledge. Tabs switch between snippet management and settings.

### 5. Shortcut Customization
You can freely customize the shortcut key to display the snippet selection window from the settings screen. Just enter the key combination to change it.

## Limitations

- Automatic paste is not implemented (only copy to clipboard)
- File attachments and rich text are not supported
- Categories and tags are not implemented

## Future Enhancements

- Snippet categorization
- Template feature (variable replacement)
- Cloud sync
- Search functionality

## License

MIT License

## Author

Your Name
