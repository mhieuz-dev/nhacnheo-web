import express from "express";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAlbum, getArtist, getHome, getPlaylist, getSong, getUpNext, search } from "./yt.js";
import { proxyAudio } from "./stream.js";
import { getLyrics } from "./lyrics.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../../web/dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

function fail(res: express.Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function wrap(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response) => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Lỗi không xác định";
      console.error(`[api] ${req.method} ${req.originalUrl}:`, message);
      if (!res.headersSent) fail(res, 500, message);
    });
  };
}

function validId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,64}$/.test(id);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get(
  "/api/home",
  wrap(async (_req, res) => {
    const sections = await getHome();
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ sections });
  }),
);

app.get(
  "/api/search",
  wrap(async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    const type = String(req.query.type ?? "songs");
    if (!query) {
      fail(res, 400, "Thiếu từ khóa tìm kiếm");
      return;
    }
    if (query.length > 120) {
      fail(res, 400, "Từ khóa quá dài");
      return;
    }
    const items = await search(query, type);
    res.json({ items });
  }),
);

app.get(
  "/api/album/:id",
  wrap(async (req, res) => {
    if (!validId(String(req.params.id))) {
      fail(res, 400, "id album không hợp lệ");
      return;
    }
    res.json(await getAlbum(String(req.params.id)));
  }),
);

app.get(
  "/api/playlist/:id",
  wrap(async (req, res) => {
    if (!validId(String(req.params.id))) {
      fail(res, 400, "id playlist không hợp lệ");
      return;
    }
    res.json(await getPlaylist(String(req.params.id)));
  }),
);

app.get(
  "/api/artist/:id",
  wrap(async (req, res) => {
    if (!validId(String(req.params.id))) {
      fail(res, 400, "id nghệ sĩ không hợp lệ");
      return;
    }
    res.json(await getArtist(String(req.params.id)));
  }),
);

app.get(
  "/api/song/:id",
  wrap(async (req, res) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(String(req.params.id))) {
      fail(res, 400, "videoId không hợp lệ");
      return;
    }
    res.json(await getSong(String(req.params.id)));
  }),
);

app.get(
  "/api/upnext/:id",
  wrap(async (req, res) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(String(req.params.id))) {
      fail(res, 400, "videoId không hợp lệ");
      return;
    }
    const songs = await getUpNext(String(req.params.id));
    res.json({ songs });
  }),
);

app.get(
  "/api/lyrics/:id",
  wrap(async (req, res) => {
    const videoId = String(req.params.id);
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      fail(res, 400, "videoId không hợp lệ");
      return;
    }
    const result = await getLyrics(videoId, {
      title: req.query.title ? String(req.query.title) : undefined,
      artist: req.query.artist ? String(req.query.artist) : undefined,
      album: req.query.album ? String(req.query.album) : undefined,
      duration: req.query.duration ? Number(req.query.duration) : undefined,
    });
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json(result);
  }),
);

app.get("/api/stream/:id", (req, res) => {
  proxyAudio(req, res).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Không phát được bài này";
    console.error(`[stream] ${String(req.params.id)}:`, message);
    if (!res.headersSent) fail(res, 502, message);
  });
});

app.use("/api", (_req, res) => {
  fail(res, 404, "Không có endpoint này");
});

app.use(express.static(webDist));
app.use((_req, res) => {
  res.sendFile(path.join(webDist, "index.html"), (error) => {
    if (error && !res.headersSent) {
      res.status(404).send("Chưa build giao diện. Chạy: npm run dev");
    }
  });
});

app.listen(port, () => {
  console.log(`[api] http://localhost:${port}`);
  execFile("yt-dlp", ["--version"], (error, stdout) => {
    if (error) {
      console.warn("[api] Không tìm thấy yt-dlp. Cài bằng: pipx install yt-dlp");
      return;
    }
    console.log(`[api] yt-dlp ${stdout.trim()}`);
  });
});
