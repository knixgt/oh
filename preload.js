const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => {
    ipcRenderer.send("window:minimize");
  },

  closeWindow: () => {
    ipcRenderer.send("window:close");
  },

  controlSpotify: (command) => {
    return ipcRenderer.invoke(
      "spotify:control",
      command,
    );
  },

  seekSpotify: (positionMs) => {
    return ipcRenderer.invoke(
      "spotify:seek",
      positionMs,
    );
  },

  getCurrentSpotifySession: () => {
    return ipcRenderer.invoke(
      "spotify:get-current-session",
    );
  },

  onSpotifySessionUpdated: (callback) => {
    const listener = (_event, session) => {
      callback(session);
    };

    ipcRenderer.on(
      "spotify:session-updated",
      listener,
    );

    return () => {
      ipcRenderer.removeListener(
        "spotify:session-updated",
        listener,
      );
    };
  },

  onSpotifyError: (callback) => {
    const listener = (_event, message) => {
      callback(message);
    };

    ipcRenderer.on(
      "spotify:error",
      listener,
    );

    return () => {
      ipcRenderer.removeListener(
        "spotify:error",
        listener,
      );
    };
  },
});