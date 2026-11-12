import type { LyricsResult, LyricsLine, LyricsWord } from "./types.js";

const SIMPMUSIC_API = "https://api-lyrics.simpmusic.org/v1";
const LRCLIB_API = "https://lrclib.net/api";
const LRCLIB_UA = "NhacNheoWeb/0.1 (personal music client)";

interface LyricsMeta {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

function parseWords(content: string): LyricsWord[] {
  const words: LyricsWord[] = [];
  const pattern = /<(\d+):(\d+(?:\.\d+)?)>([^<]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const time = Number(match[1]) * 60 + Number(match[2]);
    const text = decodeEntities(match[3]);
    if (text.trim().length > 0) words.push({ time, text });
  }
  return words;
}

export function parseLrc(raw: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const header = line.match(/^((?:\[\d+:\d+(?:\.\d+)?\])+)(.*)$/);
    if (!header) continue;
    const stamps = [...header[1].matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    let content = header[2] ?? "";
    const words = content.includes("<") ? parseWords(content) : [];
    if (content.includes("<")) {
      content = content.replace(/<\d+:\d+(?:\.\d+)?>/g, "");
    }
    content = decodeEntities(content.trim());
    if (!content && words.length === 0) continue;
    for (const stamp of stamps) {
      const time = Number(stamp[1]) * 60 + Number(stamp[2]);
      lines.push({
        time,
        text: content || words.map((word) => word.text).join("").trim(),
        words: words.map((word) => ({ ...word })),
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function plainToLines(text: string): LyricsLine[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ time: 0, text: decodeEntities(line), words: [] }));
}

async function fromSimpMusic(videoId: string): Promise<LyricsResult | null> {
  try {
    const response = await fetch(`${SIMPMUSIC_API}/${encodeURIComponent(videoId)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SimpMusicLyrics/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as any;
    const entry = Array.isArray(body?.data) ? body.data[0] : null;
    if (!entry) return null;
    const rich = typeof entry.richSyncLyrics === "string" ? entry.richSyncLyrics : "";
    const synced = typeof entry.syncedLyrics === "string" ? entry.syncedLyrics : "";
    const plain = typeof entry.plainLyric === "string" ? entry.plainLyric : "";
    if (rich) {
      const lines = parseLrc(rich);
      if (lines.length > 0) {
        return { videoId, source: "simpmusic", synced: true, lines };
      }
    }
    if (synced) {
      const lines = parseLrc(synced);
      if (lines.length > 0) {
        return { videoId, source: "simpmusic", synced: true, lines };
      }
    }
    if (plain) {
      return { videoId, source: "simpmusic", synced: false, lines: plainToLines(plain) };
    }
    return null;
  } catch {
    return null;
  }
}

async function fromLrclib(meta: LyricsMeta): Promise<LyricsResult | null> {
  if (!meta.title || !meta.artist) return null;
  const params = new URLSearchParams({
    track_name: meta.title,
    artist_name: meta.artist,
  });
  if (meta.album) params.set("album_name", meta.album);
  if (meta.duration) params.set("duration", String(Math.round(meta.duration)));

  const headers = { Accept: "application/json", "User-Agent": LRCLIB_UA };
  try {
    const direct = await fetch(`${LRCLIB_API}/get?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (direct.ok) {
      const body = (await direct.json()) as any;
      const synced = typeof body?.syncedLyrics === "string" ? body.syncedLyrics : "";
      const plain = typeof body?.plainLyrics === "string" ? body.plainLyrics : "";
      if (synced) {
        const lines = parseLrc(synced);
        if (lines.length > 0) {
          return { videoId: "", source: "lrclib", synced: true, lines };
        }
      }
      if (plain) {
        return { videoId: "", source: "lrclib", synced: false, lines: plainToLines(plain) };
      }
    }

    const searchParams = new URLSearchParams({
      track_name: meta.title,
      artist_name: meta.artist,
    });
    const search = await fetch(`${LRCLIB_API}/search?${searchParams.toString()}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!search.ok) return null;
    const results = (await search.json()) as any[];
    if (!Array.isArray(results)) return null;
    const withSync = results.find((item) => typeof item?.syncedLyrics === "string" && item.syncedLyrics);
    const chosen = withSync ?? results.find((item) => typeof item?.plainLyrics === "string");
    if (!chosen) return null;
    if (withSync) {
      return {
        videoId: "",
        source: "lrclib",
        synced: true,
        lines: parseLrc(chosen.syncedLyrics),
      };
    }
    return {
      videoId: "",
      source: "lrclib",
      synced: false,
      lines: plainToLines(chosen.plainLyrics),
    };
  } catch {
    return null;
  }
}

const cache = new Map<string, { at: number; result: LyricsResult }>();

export async function getLyrics(videoId: string, meta: LyricsMeta): Promise<LyricsResult> {
  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.at < 30 * 60 * 1000) return cached.result;

  const fromPrimary = await fromSimpMusic(videoId);
  if (fromPrimary) {
    cache.set(videoId, { at: Date.now(), result: fromPrimary });
    return fromPrimary;
  }
  const fromFallback = await fromLrclib(meta);
  const result: LyricsResult = fromFallback
    ? { ...fromFallback, videoId }
    : { videoId, source: "none", synced: false, lines: [] };
  cache.set(videoId, { at: Date.now(), result });
  return result;
}
