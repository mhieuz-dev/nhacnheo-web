import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Heart,
  ListPlus,
  Mic2,
  Music2,
} from "lucide-react";
import { artistNames } from "../lib/format";
import { useLyrics } from "../lib/useLyrics";
import { useCurrentSong, usePlayer } from "../store/player";
import { Cover } from "./Cover";
import { LyricsPanel } from "./LyricsPanel";
import { QueuePanel } from "./QueuePanel";

export function NowPlaying() {
  const current = useCurrentSong();
  const nowTab = usePlayer((state) => state.nowTab);
  const setNowTab = usePlayer((state) => state.setNowTab);
  const setView = usePlayer((state) => state.setView);
  const liked = usePlayer((state) => state.liked);
  const toggleLike = usePlayer((state) => state.toggleLike);
  const appendQueue = usePlayer((state) => state.appendQueue);
  const setToast = usePlayer((state) => state.setToast);
  const { data: lyrics, loading, error } = useLyrics(current);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setTilt({ x: 0, y: 0 });
  }, [current?.id]);

  if (!current) {
    return (
      <div className="now-empty">
        <Music2 size={34} />
        <h2>Chưa có bài nào đang phát</h2>
        <p>Chọn một bài trong Khám phá hoặc Tìm kiếm để bắt đầu.</p>
        <button className="btn-primary" onClick={() => setView("home")}>
          Khám phá nhạc
        </button>
      </div>
    );
  }

  const isLiked = liked.includes(current.id);

  return (
    <div className="now">
      <button className="np-back" onClick={() => setView("home")} aria-label="Quay lại">
        <ChevronLeft size={18} />
      </button>

      <section className="np-left">
        <div
          className="np-art-wrap"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            setTilt({ x: y * -5, y: x * 5 });
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className="np-glow" />
          <div
            className="np-art-tilt"
            style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
          >
            <Cover
              src={current.thumbnail}
              alt={current.title}
              className="np-art"
              size={544}
            />
          </div>
        </div>

        <div className="np-meta">
          <div className="np-album">{current.album?.name ?? "YouTube Music"}</div>
          <h1 className="np-title">{current.title}</h1>
          <div className="np-artists">{artistNames(current.artists)}</div>

          <div className="np-actions">
            <button
              className={`pill-btn ${isLiked ? "liked" : ""}`}
              onClick={() => toggleLike(current.id)}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              {isLiked ? "Đã thích" : "Yêu thích"}
            </button>
            <button
              className="pill-btn"
              onClick={() => {
                appendQueue([current]);
                setToast("Đã thêm vào hàng đợi");
              }}
            >
              <ListPlus size={16} />
              Hàng đợi
            </button>
            <a
              className="pill-btn"
              href={`https://music.youtube.com/watch?v=${current.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} />
              Mở trên YouTube
            </a>
          </div>
        </div>
      </section>

      <aside className="np-side">
        <div className="np-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={nowTab === "queue"}
            className={`np-tab ${nowTab === "queue" ? "active" : ""}`}
            onClick={() => setNowTab("queue")}
          >
            QUEUE
          </button>
          <button
            role="tab"
            aria-selected={nowTab === "lyrics"}
            className={`np-tab ${nowTab === "lyrics" ? "active" : ""}`}
            onClick={() => setNowTab("lyrics")}
          >
            LYRICS
          </button>
        </div>

        <div className="np-side-body">
          {nowTab === "lyrics" ? (
            <>
              <div className="np-side-label">
                <Mic2 size={13} />
                Lời bài hát
              </div>
              <LyricsPanel lyrics={lyrics} loading={loading} error={error} />
              {lyrics?.source && lyrics.source !== "none" ? (
                <div className="lyrics-source">
                  Nguồn lời: {lyrics.source === "simpmusic" ? "SimpMusic" : "LRCLIB"}
                  {lyrics.synced ? " · đồng bộ theo từng từ" : " · chưa đồng bộ"}
                </div>
              ) : null}
            </>
          ) : (
            <QueuePanel />
          )}
        </div>
      </aside>
    </div>
  );
}
