import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../lib/api";
import type { MediaCard, Song } from "../lib/types";
import { useCurrentSong, usePlayer } from "../store/player";
import { MediaCardView } from "./MediaCardView";
import { SongRow } from "./SongRow";

type SearchType = "songs" | "albums" | "artists" | "playlists";

const TABS: { value: SearchType; label: string }[] = [
  { value: "songs", label: "Bài hát" },
  { value: "albums", label: "Album" },
  { value: "artists", label: "Nghệ sĩ" },
  { value: "playlists", label: "Playlist" },
];

const SUGGESTIONS = ["JustaTee", "Thằng Điên", "V-pop", "Lofi Việt", "Indie", "Bolero"];

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem("nhacnheo-recent");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function SearchView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("songs");
  const [results, setResults] = useState<MediaCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(loadRecent);

  const playSong = usePlayer((state) => state.playSong);
  const openDetail = usePlayer((state) => state.openDetail);
  const current = useCurrentSong();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      api
        .search(trimmed, type)
        .then(({ items }) => {
          if (!alive) return;
          setResults(items);
          setRecent((previous) => {
            const next = [trimmed, ...previous.filter((item) => item !== trimmed)].slice(0, 8);
            localStorage.setItem("nhacnheo-recent", JSON.stringify(next));
            return next;
          });
        })
        .catch((reason: unknown) => {
          if (alive) {
            setError(reason instanceof Error ? reason.message : "Tìm kiếm thất bại");
            setResults([]);
          }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 380);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, type]);

  const songs = results.filter((item): item is Song => item.type === "song");

  return (
    <div className="search-page">
      <div className="search-intro">
        <span className="eyebrow">Tìm trong cả kho YouTube Music</span>
        <h1>Bạn muốn nghe gì?</h1>
      </div>

      <div className="search-box">
        <Search size={20} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tên bài hát, nghệ sĩ, album..."
          spellCheck={false}
        />
        {query ? (
          <button className="icon-btn small" onClick={() => setQuery("")} aria-label="Xóa">
            <X size={16} />
          </button>
        ) : (
          <kbd>Enter</kbd>
        )}
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={type === tab.value}
            className={`tab ${type === tab.value ? "active" : ""}`}
            onClick={() => setType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!query.trim() ? (
        <div className="search-empty">
          <div className="eyebrow">Gợi ý cho bạn</div>
          <div className="chips">
            {SUGGESTIONS.map((item) => (
              <button key={item} className="chip" onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
          {recent.length > 0 ? (
            <>
              <div className="eyebrow spaced">Tìm gần đây</div>
              <div className="chips">
                {recent.map((item) => (
                  <button key={item} className="chip ghost" onClick={() => setQuery(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="track-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="track skeleton-row" key={index}>
              <div className="skel skel-cover small" />
              <div className="skel skel-line" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="notice">{error}</div> : null}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
        <div className="notice">Không tìm thấy kết quả cho “{query.trim()}”.</div>
      ) : null}

      {!loading && songs.length > 0 && type === "songs" ? (
        <div className="track-list">
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              active={current?.id === song.id}
              onPlay={() => playSong(song, songs)}
            />
          ))}
        </div>
      ) : null}

      {!loading && type !== "songs" && results.length > 0 ? (
        <div className="card-grid">
          {results.map((item) => (
            <MediaCardView
              key={`${item.type}-${item.id}`}
              item={item}
              onPlay={() => {
                if (item.type === "song") playSong(item, results.filter((entry): entry is Song => entry.type === "song"));
              }}
              onOpen={() => {
                if (item.type === "album" || item.type === "playlist" || item.type === "artist") {
                  openDetail({ type: item.type, id: item.id, title: item.title });
                }
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
