# Syncthing Status for VS Code

A Visual Studio Code extension that shows Syncthing sync status in the status bar.

## Features

- Shows current Syncthing sync status in the status bar
- Updates status automatically at configurable intervals
- Increases update frequency when actively syncing
- Switches to active monitoring mode when files are saved
- Monitors all Git changes (commits, branches, checkouts) and checks sync status
- Click the status bar item to open Syncthing Web UI

## Configuration

- `syncthing.apiKey`: Your Syncthing API key
- `syncthing.apiUrl`: Syncthing API URL (default: http://localhost:8384)
- `syncthing.refreshInterval`: Update interval when idle in milliseconds (default: 30000)
- `syncthing.activeInterval`: Update interval when syncing in milliseconds (default: 5000)
- `syncthing.debug`: Enable debug logging (default: false)
- `syncthing.gitPath`: Path to Git executable (default: "git")

## Status Indicators

- `$(check) Syncthing` - Everything is synced
- `$(sync~spin) Syncthing` - Currently syncing
- `$(edit) Syncthing` - Changes pending sync after recent file save
- `$(error) Syncthing` - Connection error
- `$(warning) Syncthing` - Missing API key

## Getting Started

1. Install the extension
2. Configure your Syncthing API key in VS Code settings
3. (Optional) Adjust the refresh intervals to your preference

## Requirements

- Visual Studio Code 1.80.0 or newer
- Running Syncthing instance with API access

## License

MIT
