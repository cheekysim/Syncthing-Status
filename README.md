# Syncthing Status for VS Code

A Visual Studio Code extension that displays your Syncthing synchronization status directly in the editor's status bar.

## Features

- Real-time sync status monitoring
- Click-to-open Syncthing Web UI
- Adaptive refresh rates based on sync activity
- Visual indicators for different sync states:
  - ✓ Synced (check mark)
  - ↻ Currently syncing (spinning icon)
  - ✎ Changes pending sync (edit icon)
  - ⚠ Connection error (warning icon)

## Installation

1. Install the extension from the VS Code Marketplace
2. Configure your Syncthing API key and URL in VS Code settings

## Configuration

This extension requires the following settings:

| Setting                     | Description                            | Default                   |
| --------------------------- | -------------------------------------- | ------------------------- |
| `syncthing.apiKey`          | Your Syncthing API key                 | `""`                      |
| `syncthing.apiUrl`          | URL of your Syncthing instance         | `"http://localhost:8384"` |
| `syncthing.refreshInterval` | Status check interval when idle (ms)   | `30000`                   |
| `syncthing.activeInterval`  | Status check interval during sync (ms) | `5000`                    |
| `syncthing.debug`           | Enable debug logging                   | `false`                   |

### Finding Your API Key

1. Open your Syncthing Web UI
2. Go to Actions → Settings
3. Look for "API Key" under the General section

## License

MIT
