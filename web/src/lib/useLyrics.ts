import { useEffect, useState } from "react";
import { api } from "./api";
import type { LyricsResult, Song } from "./types";

const cache = new Map<string, LyricsResult>();
const pending = new Map<string, Promise<LyricsResult>>();

export function useLyrics(song: Song | null) {
  const [data, setData] = useState<LyricsResult | null>(() =>
    song ? cache.get(song.id) ?? null : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!song) {
      setData(null);
      setLoading(false);
      return;
    }
    const cached = cache.get(song.id);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let alive = true;
    setData(null);
    setLoading(true);
    setError(null);

    let job = pending.get(song.id);
    if (!job) {
      job = api.lyrics(song.id, song);
      pending.set(song.id, job);
    }

    job
      .then((result) => {
        cache.set(song.id, result);
        if (alive) setData(result);
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : "Không tải được lời bài hát");
      })
      .finally(() => {
        pending.delete(song.id);
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [song?.id]);

  return { data, loading, error };
}
