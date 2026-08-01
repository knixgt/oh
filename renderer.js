const albumArtwork =
  document.getElementById("album-artwork");

const artworkPlaceholder =
  document.getElementById("artwork-placeholder");

const songTitle =
  document.getElementById("song-title");

const artistName =
  document.getElementById("artist-name");

const albumName =
  document.getElementById("album-name");

const progressSlider =
  document.getElementById("progress-slider");

const currentTime =
  document.getElementById("current-time");

const duration =
  document.getElementById("duration");

const previousButton =
  document.getElementById("previous-button");

const playPauseButton =
  document.getElementById("play-pause-button");

const nextButton =
  document.getElementById("next-button");

const playIcon =
  document.getElementById("play-icon");

const pauseIcon =
  document.getElementById("pause-icon");

const playbackStatus =
  document.getElementById("playback-status");

const statusDot =
  document.getElementById("status-dot");

const minimizeButton =
  document.getElementById("minimize-button");

const closeButton =
  document.getElementById("close-button");

let latestSession = null;

let displayedPositionMs = 0;
let lastPositionUpdateTime = 0;
let isDraggingProgress = false;

function formatTime(milliseconds) {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return "0:00";
  }

  const totalSeconds = Math.floor(
    milliseconds / 1000,
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function normalizeThemeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isHungerGamesTrack(session) {
  const title = normalizeThemeText(session?.title);

  const album = normalizeThemeText(
    session?.albumTitle ||
    session?.album ||
    ""
  );

  const artist = normalizeThemeText(
    session?.artist ||
    ""
  );

  const hungerGamesAlbumTerms = [
    "hunger games",
    "songs from district 12",
    "district 12 and beyond",
    "catching fire",
    "mockingjay",
    "ballad of songbirds",
    "songbirds and snakes",
  ];

  const hungerGamesSongs = [
    "the hanging tree",
    "safe & sound",
    "safe and sound",
    "eyes open",
    "yellow flicker beat",
    "elastic heart",
    "everybody wants to rule the world",
    "can't catch me now",
    "cant catch me now",
    "the old therebefore",
    "pure as the driven snow",
  ];

  const albumMatches = hungerGamesAlbumTerms.some(
    (term) => album.includes(term)
  );

  const songMatches = hungerGamesSongs.some(
    (song) => title.includes(song)
  );

  const soundtrackArtistMatches =
    artist.includes("james newton howard") &&
    (
      album.includes("hunger games") ||
      album.includes("mockingjay") ||
      album.includes("catching fire")
    );

  return (
    albumMatches ||
    songMatches ||
    soundtrackArtistMatches
  );
}


function is1989Track(session) {
  const album = normalizeThemeText(
    session?.albumTitle ||
    session?.album ||
    ""
  );

  const artist = normalizeThemeText(
    session?.artist ||
    ""
  );

  const isTaylorsVersion =
    album.includes("taylor's version") ||
    album.includes("taylors version");

  return (
    artist.includes("taylor swift") &&
    album.includes("1989") &&
    isTaylorsVersion
  );
}

function getThemeForTrack(session) {

  if (isHungerGamesTrack(session)) {
    return "hunger-games";
  }

  if (is1989Track(session)) {
    return "1989";
  }

  return "default";
}

function applyTrackTheme(session) {
  const theme = getThemeForTrack(session);

  document.body.dataset.theme = theme;

  console.log("Applied player theme:", theme);
}


function updateProgressAppearance() {
  const min = Number(progressSlider.min);
  const max = Number(progressSlider.max);
  const value = Number(progressSlider.value);

  const percentage =
    max > min
      ? ((value - min) / (max - min)) * 100
      : 0;

  document.documentElement.style.setProperty(
    "--slider-progress",
    `${percentage}%`,
  );
}

function showArtwork(thumbnail) {
  if (thumbnail) {
    albumArtwork.src = thumbnail;
    albumArtwork.classList.remove("hidden");
    artworkPlaceholder.classList.add("hidden");
    return;
  }

  albumArtwork.removeAttribute("src");
  albumArtwork.classList.add("hidden");
  artworkPlaceholder.classList.remove("hidden");
}

function setControlAvailability(session) {
  previousButton.disabled =
    !session?.controls?.canSkipPrevious;

  nextButton.disabled =
    !session?.controls?.canSkipNext;

  const canTogglePlayback =
    session?.controls?.canPlay ||
    session?.controls?.canPause;

  playPauseButton.disabled = !canTogglePlayback;
}

function showNoSpotifySession() {
  document.body.dataset.theme = "default";
  latestSession = null;
  displayedPositionMs = 0;
  lastPositionUpdateTime = performance.now();
  isDraggingProgress = false;

  showArtwork(null);

  songTitle.textContent = "Spotify not detected";
  artistName.textContent =
    "Start playing something in Spotify";
  albumName.textContent = "";

  progressSlider.min = "0";
  progressSlider.max = "1";
  progressSlider.value = "0";

  currentTime.textContent = "0:00";
  duration.textContent = "0:00";

  playIcon.classList.remove("hidden");
  pauseIcon.classList.add("hidden");

  statusDot.className =
    "status-dot disconnected";

  playbackStatus.textContent =
    "Waiting for Spotify";

  setControlAvailability(null);
  updateProgressAppearance();
}

function renderSpotifySession(session) {

  if (!session) {
    showNoSpotifySession();
    return;
  }

  latestSession = session;

  applyTrackTheme(session);

  songTitle.textContent =
    session.title || "Unknown song";

  songTitle.title = session.title || "";

  artistName.textContent =
    session.artist || "Unknown artist";

  artistName.title = session.artist || "";

  albumName.textContent =
    session.albumTitle || "";

  albumName.title = session.albumTitle || "";

  showArtwork(session.thumbnail);

  const position = Math.max(
    0,
    session.positionMs || 0,
  );

  const trackDuration = Math.max(
    0,
    session.durationMs || 0,
  );

  if (!isDraggingProgress) {
    displayedPositionMs = position;
    lastPositionUpdateTime = performance.now();
  }

  progressSlider.min = "0";
  progressSlider.max = String(
    Math.max(trackDuration, 1),
  );

  if (!isDraggingProgress) {
    progressSlider.value = String(
      Math.min(displayedPositionMs, trackDuration || 0),
    );

    currentTime.textContent =
      formatTime(displayedPositionMs);
  }

  duration.textContent = formatTime(trackDuration);

  const isPlaying =
    session.playbackStatus === "playing";

  playIcon.classList.toggle(
    "hidden",
    isPlaying,
  );

  pauseIcon.classList.toggle(
    "hidden",
    !isPlaying,
  );

  statusDot.className = isPlaying
    ? "status-dot playing"
    : "status-dot paused";

  playbackStatus.textContent = isPlaying
    ? "Playing through Spotify"
    : "Spotify paused";

  setControlAvailability(session);
  updateProgressAppearance();
}

function updateSmoothProgress() {
  if (
    latestSession &&
    !isDraggingProgress &&
    latestSession.playbackStatus === "playing"
  ) {
    const now = performance.now();

    const elapsed =
      now - lastPositionUpdateTime;

    const trackDuration =
      latestSession.durationMs || 0;

    displayedPositionMs = Math.min(
      displayedPositionMs + elapsed,
      trackDuration,
    );

    lastPositionUpdateTime = now;

    progressSlider.value =
      String(displayedPositionMs);

    currentTime.textContent =
      formatTime(displayedPositionMs);

    updateProgressAppearance();
  }

  requestAnimationFrame(updateSmoothProgress);
}

requestAnimationFrame(updateSmoothProgress);

/* Window buttons */

minimizeButton.addEventListener("click", () => {
  window.electronAPI.minimizeWindow();
});

closeButton.addEventListener("click", () => {
  window.electronAPI.closeWindow();
});


async function sendSpotifyCommand(command) {
  previousButton.disabled = true;
  playPauseButton.disabled = true;
  nextButton.disabled = true;

  try {
    const result =
      await window.electronAPI.controlSpotify(command);

    if (!result.success) {
      throw new Error(result.error);
    }

    /*
      The media-session watcher should soon send the updated
      Spotify state back to the renderer.
    */
  } catch (error) {
    console.error(
      `Spotify command '${command}' failed:`,
      error,
    );

    playbackStatus.textContent =
      error.message || "Spotify control failed";

    statusDot.className =
      "status-dot disconnected";
  } finally {
    /*
      Re-enable according to the last session capabilities.
    */
    setControlAvailability(latestSession);
  }
}

previousButton.addEventListener("click", () => {
  sendSpotifyCommand("previous");
});

playPauseButton.addEventListener("click", () => {
  sendSpotifyCommand("toggle");
});

nextButton.addEventListener("click", () => {
  sendSpotifyCommand("next");
});

progressSlider.addEventListener("pointerdown", () => {
  isDraggingProgress = true;
});

progressSlider.addEventListener("input", () => {
  isDraggingProgress = true;

  displayedPositionMs =
    Number(progressSlider.value);

  currentTime.textContent =
    formatTime(displayedPositionMs);

  updateProgressAppearance();
});

progressSlider.addEventListener(
  "change",
  async () => {
    const newPosition =
      Number(progressSlider.value);

    displayedPositionMs =
      newPosition;

    lastPositionUpdateTime =
      performance.now();

    try {
      const result =
        await window.electronAPI.seekSpotify(
          newPosition,
        );

      if (!result.success) {
        throw new Error(
          result.error ||
          "Spotify seek failed",
        );
      }
    } catch (error) {
      console.error(
        "Could not seek Spotify:",
        error,
      );

      playbackStatus.textContent =
        error.message ||
        "Could not seek Spotify";
    } finally {
      isDraggingProgress = false;
    }
  },
);

/* Initial state */

showNoSpotifySession();

window.electronAPI
  .getCurrentSpotifySession()
  .then(renderSpotifySession)
  .catch((error) => {
    console.error(
      "Initial Spotify session request failed:",
      error,
    );

    showNoSpotifySession();
  });

window.electronAPI.onSpotifySessionUpdated(
  renderSpotifySession,
);

window.electronAPI.onSpotifyError((message) => {
  playbackStatus.textContent = message;
  statusDot.className =
    "status-dot disconnected";
});