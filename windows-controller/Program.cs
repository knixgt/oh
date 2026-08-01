using Windows.Media.Control;

internal static class Program
{
    private const string SpotifyAppId = "Spotify.exe";

    private static async Task<int> Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.Error.WriteLine(
                "Usage: windows-controller <play|pause|toggle|next|previous|seek> [positionMs]"
            );

            return 1;
        }

        string command = args[0].Trim().ToLowerInvariant();

        try
        {
            GlobalSystemMediaTransportControlsSessionManager manager =
                await GlobalSystemMediaTransportControlsSessionManager
                    .RequestAsync();

            GlobalSystemMediaTransportControlsSession? spotifySession =
                manager
                    .GetSessions()
                    .FirstOrDefault(session =>
                        string.Equals(
                            session.SourceAppUserModelId,
                            SpotifyAppId,
                            StringComparison.OrdinalIgnoreCase
                        )
                    );

            if (spotifySession is null)
            {
                Console.Error.WriteLine(
                    "Spotify media session was not found."
                );

                return 2;
            }

            bool succeeded = command switch
            {
                "play" =>
                    await spotifySession.TryPlayAsync(),

                "pause" =>
                    await spotifySession.TryPauseAsync(),

                "toggle" =>
                    await TogglePlayback(spotifySession),

                "next" =>
                    await spotifySession.TrySkipNextAsync(),

                "previous" or "prev" =>
                    await spotifySession.TrySkipPreviousAsync(),

                "seek" =>
                    await SeekPlayback(
                        spotifySession,
                        args
                    ),

                _ => throw new ArgumentException(
                    $"Unknown command: {command}"
                ),
            };

            if (!succeeded)
            {
                Console.Error.WriteLine(
                    $"Spotify rejected the '{command}' command."
                );

                return 3;
            }

            Console.WriteLine("OK");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error);
            return 4;
        }
    }

    private static async Task<bool> TogglePlayback(
        GlobalSystemMediaTransportControlsSession session
    )
    {
        GlobalSystemMediaTransportControlsSessionPlaybackInfo info =
            session.GetPlaybackInfo();

        return info.PlaybackStatus switch
        {
            GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing =>
                await session.TryPauseAsync(),

            GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused =>
                await session.TryPlayAsync(),

            _ =>
                await session.TryPlayAsync(),
        };
    }

    
    private static async Task<bool> SeekPlayback(
        GlobalSystemMediaTransportControlsSession session,
        string[] args
    )
    {
        if (args.Length < 2)
        {
            throw new ArgumentException(
                "Seek requires a position in milliseconds."
            );
        }

        if (!long.TryParse(args[1], out long positionMs))
        {
            throw new ArgumentException(
                "Invalid seek position."
            );
        }

        if (positionMs < 0)
        {
            throw new ArgumentException(
                "Seek position cannot be negative."
            );
        }

        long positionTicks =
            positionMs * 10_000;

        return await session
            .TryChangePlaybackPositionAsync(
                positionTicks
            );
    }
}