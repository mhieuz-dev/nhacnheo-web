import { execFile } from "node:child_process";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import type { Request, Response } from "express";

const execFileAsync = promisify(execFile);

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<CacheEntry>>();

function expiryOf(url: string): number {
  try {
    const expire = Number(new URL(url).searchParams.get("expire"));
    if (Number.isFinite(expire) && expire > 0) {
      return Math.max(Date.now() + 5 * 60 * 1000, expire * 1000 - 10 * 60 * 1000);
    }
  } catch {
    // fall through
  }
  return Date.now() + 2 * 60 * 60 * 1000;
}

async function runYtDlp(videoId: string): Promise<CacheEntry> {
  const args = [
    "-f",
    "bestaudio[ext=m4a]/bestaudio",
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--socket-timeout",
    "15",
    "-g",
    `https://music.youtube.com/watch?v=${videoId}`,
  ];
  if (process.env.YTDLP_COOKIES) {
    args.unshift("--cookies", process.env.YTDLP_COOKIES);
  }
  if (process.env.YTDLP_EXTRACTOR_ARGS) {
    args.unshift("--extractor-args", process.env.YTDLP_EXTRACTOR_ARGS);
  }
  const { stdout } = await execFileAsync("yt-dlp", args, {
    timeout: 45_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const url = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http"))
    .pop();
  if (!url) throw new Error("yt-dlp không trả về URL phát nhạc");
  return { url, expiresAt: expiryOf(url) };
}

export async function resolveStream(videoId: string, force = false): Promise<CacheEntry> {
  const cached = cache.get(videoId);
  if (!force && cached && cached.expiresAt > Date.now()) return cached;
  const inFlight = pending.get(videoId);
  if (inFlight) return inFlight;
  const job = runYtDlp(videoId)
    .then((entry) => {
      cache.set(videoId, entry);
      return entry;
    })
    .finally(() => pending.delete(videoId));
  pending.set(videoId, job);
  return job;
}

function copyHeaders(upstream: globalThis.Response, res: Response) {
  const contentType = upstream.headers.get("content-type") ?? "audio/mp4";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=3600");
  for (const name of ["content-length", "content-range", "content-encoding"]) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
}

export async function proxyAudio(req: Request, res: Response): Promise<void> {
  const videoId = String(req.params.id);
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: "videoId không hợp lệ" });
    return;
  }

  const requestUpstream = async (entry: CacheEntry) =>
    fetch(entry.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://music.youtube.com/",
        Accept: "*/*",
        ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
      },
    });

  let entry = await resolveStream(videoId);
  let upstream = await requestUpstream(entry);

  if (upstream.status === 403) {
    cache.delete(videoId);
    entry = await resolveStream(videoId, true);
    upstream = await requestUpstream(entry);
  }

  if (!upstream.ok && upstream.status !== 206) {
    res.status(502).json({
      error: "Không lấy được luồng âm thanh",
      status: upstream.status,
    });
    return;
  }

  copyHeaders(upstream, res);
  res.status(upstream.status);

  if (req.method === "HEAD") {
    await upstream.body?.cancel();
    res.end();
    return;
  }

  if (!upstream.body) {
    res.status(502).json({ error: "Luồng âm thanh rỗng" });
    return;
  }

  const stream = Readable.fromWeb(upstream.body as any);
  res.on("close", () => {
    stream.destroy();
    upstream.body?.cancel().catch(() => undefined);
  });
  stream.on("error", () => res.destroy());
  stream.pipe(res);
}
