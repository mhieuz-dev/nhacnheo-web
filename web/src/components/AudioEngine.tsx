import { useEffect, useRef } from "react";
import { api, streamUrl } from "../lib/api";
import { setAudioElement } from "../lib/audio";
import { artistNames, coverUrl } from "../lib/format";
import { useCurrentSong, usePlayer } from "../store/player";

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const current = useCurrentSong();
  const playing = usePlayer((state) => state.playing);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const queueLength = usePlayer((state) => state.queue.length);
  const index = usePlayer((state) => state.index);
  const prefetched = useRef(new Set<string>());

  useEffect(() => {
    setAudioElement(audioRef.current);
    return () => setAudioElement(null);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    audio.pause();
    audio.src = streamUrl(current.id);
    audio.load();
    if (current.thumbnail) {
      const hi = new Image();
      hi.src = coverUrl(current.thumbnail, 544);
      const low = new Image();
      low.src = coverUrl(current.thumbnail, 240);
    }
    const store = usePlayer.getState();
    store.setTime(0);
    store.setDuration(current.duration || 0);
    if (current.duration <= 0 || !current.thumbnail) {
      api
        .song(current.id)
        .then((song) => {
          usePlayer.getState().patchSong(current.id, {
            duration: current.duration || song.duration,
            thumbnail: current.thumbnail || song.thumbnail,
            artists: current.artists.length > 0 ? current.artists : song.artists,
            album: current.album ?? song.album,
          });
        })
        .catch(() => undefined);
    }
    if (store.playing) {
      audio.play().catch(() => {
        usePlayer.getState().setPlaying(false);
        usePlayer.getState().setToast("Trình duyệt chặn tự động phát, bấm nút phát nhé.");
      });
    }
  }, [current?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => {
        usePlayer.getState().setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    document.title = current
      ? `${current.title} - ${artistNames(current.artists)} | Nhạc Nhẽo`
      : "Nhạc Nhẽo Web";
  }, [current?.id]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: artistNames(current.artists),
      album: current.album?.name ?? "Nhạc Nhẽo",
      artwork: current.thumbnail
        ? [
            {
              src: coverUrl(current.thumbnail, 544),
              sizes: "544x544",
              type: "image/jpeg",
            },
          ]
        : [],
    });

    const actions: [MediaSessionAction, () => void][] = [
      ["play", () => usePlayer.getState().setPlaying(true)],
      ["pause", () => usePlayer.getState().setPlaying(false)],
      ["nexttrack", () => usePlayer.getState().next()],
      ["previoustrack", () => usePlayer.getState().previous()],
      ["seekbackward", () => {
        const state = usePlayer.getState();
        state.seek(state.currentTime - 10);
      }],
      ["seekforward", () => {
        const state = usePlayer.getState();
        state.seek(state.currentTime + 10);
      }],
    ];
    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // ignore unsupported actions
      }
    }
  }, [current?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, [contenteditable='true'], button, a, [role='button']",
        )
      ) {
        return;
      }
      const state = usePlayer.getState();
      if (event.code === "Space") {
        event.preventDefault();
        state.toggle();
      } else if (event.code === "ArrowRight") {
        state.seek(state.currentTime + 5);
      } else if (event.code === "ArrowLeft") {
        state.seek(state.currentTime - 5);
      } else if (event.key.toLowerCase() === "n") {
        state.next();
      } else if (event.key.toLowerCase() === "p") {
        state.previous();
      } else if (event.key.toLowerCase() === "m") {
        state.toggleMute();
      } else if (event.key === "/") {
        event.preventDefault();
        state.setView("search");
      } else if (event.key === "Escape") {
        if (state.view === "now" || state.detail) state.setView("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!current) return;
    const state = usePlayer.getState();
    if (state.queue.length - state.index > 4) return;
    if (prefetched.current.has(current.id)) return;
    prefetched.current.add(current.id);
    api
      .upNext(current.id)
      .then(({ songs }) => {
        if (songs.length > 0) usePlayer.getState().appendQueue(songs);
      })
      .catch(() => undefined);
  }, [current?.id, queueLength, index]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      playsInline
      onTimeUpdate={(event) => {
        const audio = event.currentTarget;
        usePlayer.getState().setTime(audio.currentTime);
        if (
          "mediaSession" in navigator &&
          "setPositionState" in navigator.mediaSession &&
          Number.isFinite(audio.duration) &&
          audio.duration > 0
        ) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              position: Math.min(audio.currentTime, audio.duration),
              playbackRate: audio.playbackRate,
            });
          } catch {
            // ignore
          }
        }
      }}
      onLoadedMetadata={(event) => {
        const duration = event.currentTarget.duration;
        if (Number.isFinite(duration) && duration > 0) {
          const state = usePlayer.getState();
          state.setDuration(duration);
          if (current) state.patchSong(current.id, { duration });
        }
      }}
      onEnded={() => {
        const state = usePlayer.getState();
        if (state.repeat === "one") {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => undefined);
          }
          return;
        }
        state.next(true);
      }}
      onError={() => {
        usePlayer.getState().setToast("Không phát được bài này. Thử bài khác nhé.");
        usePlayer.getState().setPlaying(false);
      }}
    />
  );
}
