const { spawn } = require("child_process");
const {
  app,
  BrowserWindow,
  ipcMain,
} = require("electron");

const path = require("path");

const {
  getAllSessions,
  onSessionsChanged,
  shutdown,
} = require("windows-media-sessions");

let mainWindow = null;
let stopWatchingSessions = null;

function findSpotifySession(sessions) {
  return (
    sessions.find(
      (session) =>
        session.sourceAppUserModelId === "Spotify.exe",
    ) ?? null
  );
}

function serializeSpotifySession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    appId: session.sourceAppUserModelId,
    appName: session.sourceAppDisplayName ?? "Spotify",

    title: session.title ?? "Unknown song",
    artist: session.artist ?? "Unknown artist",
    albumTitle: session.albumTitle ?? "",

    playbackStatus: session.playbackStatus,

    positionMs: session.timeline?.positionMs ?? 0,
    durationMs: session.timeline?.durationMs ?? 0,

    thumbnail: session.thumbnail ?? null,

    controls: {
      canPlay: session.controls?.canPlay ?? false,
      canPause: session.controls?.canPause ?? false,
      canSkipNext:
        session.controls?.canSkipNext ?? false,
      canSkipPrevious:
        session.controls?.canSkipPrevious ?? false,
    },
  };
}

function getControllerPath() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "spotify-controller.exe",
    );
  }

  return path.join(
    __dirname,
    "resources",
    "spotify-controller.exe",
  );
}

function runSpotifyCommand(command, ...args) {
  return new Promise((resolve, reject) => {
    const controllerPath = getControllerPath();

    const controllerProcess = spawn(
      controllerPath,
      [command, ...args.map(String)],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let standardOutput = "";
    let standardError = "";

    controllerProcess.stdout.on("data", (data) => {
      standardOutput += data.toString();
    });

    controllerProcess.stderr.on("data", (data) => {
      standardError += data.toString();
    });

    controllerProcess.on("error", (error) => {
      reject(
        new Error(
          `Could not start Spotify controller: ${error.message}`,
        ),
      );
    });

    controllerProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({
          success: true,
          output: standardOutput.trim(),
        });

        return;
      }

      reject(
        new Error(
          standardError.trim() ||
            `Spotify controller exited with code ${exitCode}.`,
        ),
      );
    });
  });
}

function sendSpotifySession(sessions) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const spotifySession = findSpotifySession(sessions);

  mainWindow.webContents.send(
    "spotify:session-updated",
    serializeSpotifySession(spotifySession),
  );
}

async function startSpotifyWatcher() {
  try {
    const initialSessions = await getAllSessions();
    sendSpotifySession(initialSessions);

    stopWatchingSessions = onSessionsChanged(
      (sessions) => {
        sendSpotifySession(sessions);
      },
    );
  } catch (error) {
    console.error(
      "Could not start Spotify session watcher:",
      error,
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "spotify:error",
        "Could not read Windows media sessions.",
      );
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 390,
    height: 650,

    minWidth: 350,
    minHeight: 580,

    frame: false,
    transparent: true,
    resizable: false,

    backgroundColor: "#00000000",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Uncomment while debugging:
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.once(
    "did-finish-load",
    async () => {
      await startSpotifyWatcher();
    },
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* Window controls */

ipcMain.on("window:minimize", (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  );

  window?.minimize();
});

ipcMain.on("window:close", (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  );

  window?.close();
});

/* Let renderer request the current state */

ipcMain.handle("spotify:get-current-session", async () => {
  try {
    const sessions = await getAllSessions();

    return serializeSpotifySession(
      findSpotifySession(sessions),
    );
  } catch (error) {
    console.error(
      "Could not retrieve Spotify session:",
      error,
    );

    return null;
  }
});

ipcMain.handle(
  "spotify:control",
  async (_event, command) => {
    const allowedCommands = new Set([
      "play",
      "pause",
      "toggle",
      "next",
      "previous",
    ]);

    if (!allowedCommands.has(command)) {
      return {
        success: false,
        error: "Invalid Spotify command.",
      };
    }

    try {
      await runSpotifyCommand(command);

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        `Spotify command '${command}' failed:`,
        error,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
);

ipcMain.handle(
  "spotify:seek",
  async (_event, positionMs) => {
    const requestedPosition =
      Number(positionMs);

    if (
      !Number.isFinite(requestedPosition) ||
      requestedPosition < 0
    ) {
      return {
        success: false,
        error: "Invalid seek position.",
      };
    }

    try {
      await runSpotifyCommand(
        "seek",
        Math.round(requestedPosition),
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Spotify seek failed:",
        error,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", async () => {
  if (stopWatchingSessions) {
    stopWatchingSessions();
    stopWatchingSessions = null;
  }

  await shutdown();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});