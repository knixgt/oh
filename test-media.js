const { getAllSessions, shutdown } = require("windows-media-sessions");

async function testMediaSessions() {
  try {
    const sessions = await getAllSessions();
    const fs = require("fs");

    if (sessions.length === 0) {
      console.log("No Windows media sessions found.");
      console.log("Start playing something in Spotify, then run this again.");
      return;
    }

    console.log(`Found ${sessions.length} media session(s).\n`);

    for (const session of sessions) {
      console.log("====================================");
      console.log("App:", session.sourceAppDisplayName);
      console.log("App ID:", session.sourceAppUserModelId);
      console.log("Title:", session.title);
      console.log("Artist:", session.artist);
      console.log("Album:", session.albumTitle);
      console.log("Status:", session.playbackStatus);

      console.log(
        "Position:",
        session.timeline?.positionMs ?? "Unavailable",
      );

      console.log(
        "Duration:",
        session.timeline?.durationMs ?? "Unavailable",
      );

      console.log("Controls:", session.controls);

      console.log(
        "Album artwork:",
        session.thumbnail ? "Available" : "Unavailable",
      );
      if(session.sourceAppUserModelId === "Spotify.exe" && session.thumbnail){
        const match = session.thumbnail.match(/^data:image\/(\w+);base64,(.+)$/,);
        if (match){
            const extension = match[1]==="jpeg" ? "jpg" : match[1];
            const imageBuffer=Buffer.from(match[2], "base64");

            fs.writeFileSync(`spotify_album_artwork.${extension}`, imageBuffer);
            console.log(`Album artwork saved as spotify_album_artwork.${extension}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to read media sessions:");
    console.error(error);
  } finally {
    await shutdown();
  }
}

testMediaSessions();