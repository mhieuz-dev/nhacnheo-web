import { useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Search } from "lucide-react";
import { api } from "../lib/api";
import { artistNames, greeting } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import type { HomeSection, MediaCard, Song } from "../lib/types";
import { useCurrentSong, usePlayer } from "../store/player";
import { Cover } from "./Cover";
import { MediaCardView } from "./MediaCardView";

function Shelf({
  section,
  onPlay,
  onOpen,
}: {
  section: HomeSection;
  onPlay: (item: MediaCard, queue: Song[]) => void;
  onOpen: (item: MediaCard) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const songs = section.items.filter((item): item is Song => item.type === "song");

  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2>{section.title}</h2>
        <div className="shelf-nav">
          <button
            className="ghost-round"
            aria-label="Cuộn trái"
            onClick={() => scroller.current?.scrollBy({ left: -560, behavior: "smooth" })}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="ghost-round"
            aria-label="Cuộn phải"
            onClick={() => scroller.current?.scrollBy({ left: 560, behavior: "smooth" })}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="shelf-scroll" ref={scroller}>
        {section.items.map((item) => (
          <MediaCardView
            key={`${item.type}-${item.id}`}
            item={item}
            onPlay={() => onPlay(item, songs)}
            onOpen={() => onOpen(item)}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeView() {
  const { data, loading, error } = useAsync(() => api.home().then((result) => result.sections), []);
  const current = useCurrentSong();
  const playing = usePlayer((state) => state.playing);
  const toggle = usePlayer((state) => state.toggle);
  const playSong = usePlayer((state) => state.playSong);
  const openDetail = usePlayer((state) => state.openDetail);
  const setView = usePlayer((state) => state.setView);

  const handleOpen = (item: MediaCard) => {
    if (item.type === "album" || item.type === "playlist" || item.type === "artist") {
      openDetail({ type: item.type, id: item.id, title: item.title });
    }
  };

  return (
    <div className="home">
      <section className="home-hero">
        <div className="greeting">
          <span className="eyebrow">Nghe nhạc như được làm bằng tay</span>
          <h1>{greeting()}</h1>
          <p>
            Tìm một bài vừa ý, hoặc để Nhạc Nhẽo chọn sẵn vài thứ cho bạn. Không quảng cáo,
            không cần tài khoản.
          </p>
          <button className="btn-ghost" onClick={() => setView("search")}>
            <Search size={16} />
            Tìm kiếm bài hát
          </button>
        </div>

        {current ? (
          <div className="hero-now">
            <Cover src={current.thumbnail} alt={current.title} className="hero-now-cover" size={240} />
            <div className="hero-now-text">
              <span className="eyebrow">Đang phát</span>
              <div className="hero-now-title">{current.title}</div>
              <div className="hero-now-artist">{artistNames(current.artists)}</div>
            </div>
            <button className="hero-play" onClick={toggle} aria-label={playing ? "Tạm dừng" : "Phát"}>
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
          </div>
        ) : (
          <div className="hero-quote">
            <span>“</span>
            <p>Âm nhạc là thứ duy nhất không cần lời giải thích.</p>
          </div>
        )}
      </section>

      {error ? <div className="notice">Không tải được trang chủ: {error}</div> : null}

      {loading
        ? Array.from({ length: 3 }).map((_, row) => (
            <section className="shelf" key={`skeleton-${row}`}>
              <div className="shelf-head">
                <div className="skel skel-title" />
              </div>
              <div className="shelf-scroll">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div className="card" key={index}>
                    <div className="skel skel-cover" />
                    <div className="skel skel-line" />
                    <div className="skel skel-line short" />
                  </div>
                ))}
              </div>
            </section>
          ))
        : null}

      {!loading &&
        data?.map((section) => (
          <Shelf
            key={section.title}
            section={section}
            onPlay={(item, queue) => {
              if (item.type === "song") playSong(item, queue);
            }}
            onOpen={handleOpen}
          />
        ))}

      {!loading && !error && data && data.length === 0 ? (
        <div className="notice">Chưa có nội dung. Thử tìm kiếm một bài hát nhé.</div>
      ) : null}

      <footer className="home-footer">
        Nhạc phát trực tiếp từ YouTube Music. Nhạc Nhẽo không lưu hay đăng tải âm thanh.
      </footer>
    </div>
  );
}
