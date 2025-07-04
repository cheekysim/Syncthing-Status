import * as vscode from "vscode";
import axios from "axios";
import { exec } from "child_process";

declare const setTimeout: (
  callback: (...args: any[]) => void,
  ms: number
) => any;
declare const setInterval: (callback: () => void, ms: number) => any;
declare const clearInterval: (id: any) => void;

let statusBarItem: vscode.StatusBarItem;
let updateInterval: any = null;
let outputChannel: vscode.OutputChannel;
let isCurrentlyActive = false;

// Cache and state management
let lastInBytes = 0;
let lastOutBytes = 0;
let lastEditTime = 0;
let lastCheckTime = 0;
let lastErrorTime = 0;
let errorCount = 0;
let typeTimeout: any = null;
let lastSuccessfulResponse: any = null;
let lastConnectionStatus = true;
let isSyncing = false;
let hasIncompleteFolder = false;

const ACTIVE_TIMEOUT = 10000;
const MIN_CHECK_INTERVAL = 2000;
const MAX_ERROR_BACKOFF = 300000; // 5 minutes
const ERROR_BACKOFF_FACTOR = 2;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Syncthing Status");
  context.subscriptions.push(outputChannel);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1 // Priority to ensure visibility
  );
  statusBarItem.name = "Syncthing Status";
  statusBarItem.tooltip = "Click to refresh Syncthing status";
  statusBarItem.command = "syncthing.refresh";

  // Register command to refresh Syncthing status
  let disposable = vscode.commands.registerCommand(
    "syncthing.refresh",
    async () => {
      const config = vscode.workspace.getConfiguration("syncthing");

      // Show refreshing indicator
      const originalText = statusBarItem.text;
      statusBarItem.text = "$(sync~spin) Refreshing...";
      statusBarItem.tooltip = "Refreshing Syncthing status...";

      // Perform multiple checks over 3 seconds
      for (let i = 0; i < 3; i++) {
        await updateSyncStatus(config);
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Final status update
      await updateSyncStatus(config);
    }
  );

  // Register command to open Syncthing Web UI (secondary command)
  let openWebUIDisposable = vscode.commands.registerCommand(
    "syncthing.openWebUI",
    () => {
      const config = vscode.workspace.getConfiguration("syncthing");
      const apiUrl = config.get<string>("apiUrl");
      vscode.env.openExternal(
        vscode.Uri.parse(apiUrl || "http://localhost:8384")
      );
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(openWebUIDisposable);
  context.subscriptions.push(statusBarItem);

  // Replace Git commit monitoring with comprehensive Git change monitoring
  let lastGitState = "";
  const checkGitChanges = async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const config = vscode.workspace.getConfiguration("syncthing");
    const gitPath = config.get<string>("gitPath") || "git";

    for (const folder of workspaceFolders) {
      // Check both HEAD and refs to catch all changes
      exec(
        `${gitPath} rev-parse HEAD && ${gitPath} symbolic-ref -q HEAD && ${gitPath} status --porcelain`,
        { cwd: folder.uri.fsPath },
        (error: any, stdout: any) => {
          if (error) return;
          const currentState = stdout.trim();
          if (lastGitState && currentState !== lastGitState) {
            // Git change detected, perform immediate check
            const now = Date.now();
            lastEditTime = now;
            updateSyncStatus(config);

            // Perform another check after 5 seconds
            setTimeout(() => {
              lastEditTime = Date.now();
              updateSyncStatus(config);
            }, 5000);
          }
          lastGitState = currentState;
        }
      );
    }
  };

  // Check Git changes every 5 seconds
  setInterval(checkGitChanges, 5000);
  checkGitChanges(); // Initial check

  // Replace the text document change listener with file save listener
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      const now = Date.now();
      lastEditTime = now;

      // If it's been a while since last check, trigger immediate check
      if (now - lastCheckTime > ACTIVE_TIMEOUT) {
        updateSyncStatus(vscode.workspace.getConfiguration("syncthing"));
      }
    })
  );

  const config = vscode.workspace.getConfiguration("syncthing");

  updateSyncStatus(config);
  setUpdateInterval(config, false);

  // Add configuration change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e: any) => {
      if (e.affectsConfiguration("syncthing")) {
        const newConfig = vscode.workspace.getConfiguration("syncthing");
        setUpdateInterval(newConfig, isCurrentlyActive);
      }
    })
  );
}

export function deactivate() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  statusBarItem.dispose();
}

function setUpdateInterval(
  config: vscode.WorkspaceConfiguration,
  active: boolean
) {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  const interval = active
    ? config.get<number>("activeInterval") ?? 5000
    : config.get<number>("refreshInterval") ?? 15000;

  updateInterval = setInterval(() => updateSyncStatus(config), interval);
  isCurrentlyActive = active;
}

async function updateSyncStatus(config: vscode.WorkspaceConfiguration) {
  const now = Date.now();

  // Implement rate limiting
  if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
    return;
  }
  lastCheckTime = now;

  const apiKey = config.get<string>("apiKey");
  const apiUrl = config.get<string>("apiUrl");
  const debug = config.get<boolean>("debug");

  if (!apiKey) {
    statusBarItem.text = "$(warning) Syncthing";
    statusBarItem.tooltip = "No API Key configured";
    statusBarItem.show();
    return;
  }

  try {
    // Use cached data if we're in error backoff
    if (errorCount > 0 && lastSuccessfulResponse) {
      const backoffTime = Math.min(
        1000 * Math.pow(ERROR_BACKOFF_FACTOR, errorCount),
        MAX_ERROR_BACKOFF
      );
      if (now - lastErrorTime < backoffTime) {
        updateStatusBarWithData(lastSuccessfulResponse);
        return;
      }
    }

    const [statusResponse, folderResponse] = await Promise.all([
      axios
        .get(`${apiUrl}/rest/system/connections`, {
          headers: { "X-API-Key": apiKey },
          timeout: 5000,
        })
        .catch(() =>
          axios.get(`${apiUrl}/rest/stats/device`, {
            headers: { "X-API-Key": apiKey },
            timeout: 5000,
          })
        ),
      axios
        .get(`${apiUrl}/rest/db/completion`, {
          headers: { "X-API-Key": apiKey },
          timeout: 5000,
        })
        .catch(() =>
          axios.get(`${apiUrl}/rest/stats/folder`, {
            headers: { "X-API-Key": apiKey },
            timeout: 5000,
          })
        ),
    ]);

    // Cache successful response
    lastSuccessfulResponse = { statusResponse, folderResponse };
    errorCount = 0;

    if (!lastConnectionStatus) {
      // Connection restored
      lastConnectionStatus = true;
      vscode.window.showInformationMessage("Syncthing connection restored");
    }

    const result = updateStatusBarWithData(lastSuccessfulResponse);
    isSyncing = result.isSyncing;
    hasIncompleteFolder = result.hasIncompleteFolder;

    // Check if we need to switch intervals based on sync status
    const shouldBeActive = isSyncing || hasIncompleteFolder;
    if (shouldBeActive !== isCurrentlyActive) {
      setUpdateInterval(config, shouldBeActive);
    }

    if (debug) {
      outputChannel.appendLine(`[${new Date().toISOString()}] API Response:`);
      outputChannel.appendLine(JSON.stringify(statusResponse.data, null, 2));
      outputChannel.appendLine("Folder status:");
      outputChannel.appendLine(JSON.stringify(folderResponse.data, null, 2));
    }
  } catch (error) {
    lastErrorTime = now;
    errorCount++;

    if (lastConnectionStatus) {
      // Connection lost
      lastConnectionStatus = false;
      vscode.window.showWarningMessage("Lost connection to Syncthing");
    }

    if (debug) {
      outputChannel.appendLine(`[${new Date().toISOString()}] Error details:`);
      outputChannel.appendLine(JSON.stringify(error, null, 2));
    }

    statusBarItem.text = "$(error) Syncthing: Error";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
    statusBarItem.show();
  }
}

function updateStatusBarWithData({ statusResponse, folderResponse }: any) {
  const total = statusResponse.data.total || statusResponse.data;
  const currentInBytes = total.inBytesTotal || total.receivedBytes || 0;
  const currentOutBytes = total.outBytesTotal || total.sentBytes || 0;

  hasIncompleteFolder = folderResponse.data.completion
    ? folderResponse.data.completion < 100
    : Object.values(folderResponse.data).some(
        (folder: any) => folder.needBytes > 0 || folder.needDeletes > 0
      );

  isSyncing =
    currentInBytes > lastInBytes ||
    currentOutBytes > lastOutBytes ||
    hasIncompleteFolder;

  const isActiveEdit = Date.now() - lastEditTime < ACTIVE_TIMEOUT;

  lastInBytes = currentInBytes;
  lastOutBytes = currentOutBytes;

  if (isActiveEdit && hasIncompleteFolder) {
    statusBarItem.text = "$(edit) Syncthing";
    statusBarItem.tooltip = "Changes pending sync";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  } else if (isSyncing) {
    statusBarItem.text = "$(sync~spin) Syncthing";
    statusBarItem.tooltip = `Syncing - In: ${formatBytes(
      currentInBytes
    )}, Out: ${formatBytes(currentOutBytes)}`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = "$(check) Syncthing";
    statusBarItem.tooltip = `Synced - In: ${formatBytes(
      currentInBytes
    )}, Out: ${formatBytes(currentOutBytes)}`;
    statusBarItem.backgroundColor = undefined;
    lastEditTime = 0; // Reset edit time when sync is complete
  }

  statusBarItem.show();

  return { isSyncing, hasIncompleteFolder };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
