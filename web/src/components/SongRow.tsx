import { ListPlus, Pause, Play } from "lucide-react";
import { artistNames, formatTime } from "../lib/format";
import { usePlayer } from "../store/player";
import type { Song } from "../lib/types";
import { Cover } from "./Cover";

interface SongRowProps {
  song: Song;
  index: number;
  active?: boolean;
  onPlay: () => void;
  showAlbum?: boolean;
}

export function SongRow({
  song,
  index,
  active = false,
  onPlay,
  showAlbum = true,
}: SongRowProps) {
  const playing = usePlayer((state) => state.playing);
  const appendQueue = usePlayer((state) => state.appendQueue);
  const setToast = usePlayer((state) => state.setToast);

  return (
    <div
      className={`track ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="track-index">
        {active ? (
          <span className={`eq ${playing ? "playing" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span>{String(index + 1).padStart(2, "0")}</span>
        )}
      </div>

      <div className="track-main">
        <Cover src={song.thumbnail} alt={song.title} className="track-cover" size={80} />
        <div className="track-text">
          <div className="track-title">{song.title}</div>
          <div className="track-artist">{artistNames(song.artists)}</div>
        </div>
      </div>

      {showAlbum ? (
        <div className="track-album">{song.album?.name ?? ""}</div>
      ) : null}

      <div className="track-duration">
        {song.duration > 0 ? formatTime(song.duration) : ""}
      </div>

      <div className="track-actions">
        <button
          className="mini-btn"
          title="Thêm vào hàng đợi"
          aria-label="Thêm vào hàng đợi"
          onClick={(event) => {
            event.stopPropagation();
            appendQueue([song]);
            setToast("Đã thêm vào hàng đợi");
          }}
        >
          <ListPlus size={16} />
        </button>
        <span className="track-play" aria-hidden="true">
          {active && playing ? <Pause size={15} /> : <Play size={15} />}
        </span>
      </div>
    </div>
  );
}
