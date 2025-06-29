# Syncthing Status for VS Code

A Visual Studio Code extension that shows Syncthing sync status in the status bar with interactive refresh capabilities.

## Features

- Shows current Syncthing sync status in the status bar
- **Click the status bar item to refresh and check for changes over 3 seconds**
- Updates status automatically at configurable intervals
- Increases update frequency when actively syncing
- Switches to active monitoring mode when files are saved
- Monitors all Git changes (commits, branches, checkouts) and checks sync status
- Open Syncthing Web UI via command palette

## Usage

### Status Bar Interaction

- **Click the Syncthing status bar item**: Triggers an immediate refresh that checks for changes 4 times over 3 seconds
- **Tooltip**: Hover over the status bar item to see detailed sync information

### Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Refresh Syncthing Status` - Manually refresh the sync status
- `Open Syncthing Web UI` - Open the Syncthing web interface

## Configuration

- `syncthing.apiKey`: Your Syncthing API key
- `syncthing.apiUrl`: Syncthing API URL (default: <http://localhost:8384>)
- `syncthing.refreshInterval`: Update interval when idle in milliseconds (default: 15000)
- `syncthing.activeInterval`: Update interval when syncing in milliseconds (default: 5000)
- `syncthing.debug`: Enable debug logging (default: false)
- `syncthing.gitPath`: Path to Git executable (default: "git")

## Status Indicators

- `$(check) Syncthing` - Everything is synced
- `$(sync~spin) Syncthing` - Currently syncing
- `$(edit) Syncthing` - Changes pending sync after recent file save
- `$(sync~spin) Refreshing...` - Manual refresh in progress
- `$(error) Syncthing` - Connection error
- `$(warning) Syncthing` - Missing API key

## Smart Monitoring

The extension intelligently monitors your workspace and adjusts its behavior:

- **File Save Detection**: Automatically triggers sync status checks when you save files
- **Git Change Monitoring**: Detects Git operations (commits, branch switches, etc.) and checks sync status
- **Adaptive Intervals**: Uses faster refresh rates when actively syncing, slower when idle
- **Error Handling**: Implements backoff strategies for connection issues and caches last known state

## Getting Started

1. Install the extension
2. Configure your Syncthing API key in VS Code settings (`syncthing.apiKey`)
3. (Optional) Configure your Syncthing API URL if different from default
4. (Optional) Adjust the refresh intervals to your preference
5. Click the status bar item to manually refresh or use the command palette

## Testing the Extension

To test the extension during development:

1. Open the extension project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new VS Code window, configure your Syncthing settings
4. Test the refresh functionality by clicking the status bar item
5. Use the command palette to test both commands

## Requirements

- Visual Studio Code 1.80.0 or newer
- Running Syncthing instance with API access
- Git (optional, for Git change monitoring)

## License

MIT
