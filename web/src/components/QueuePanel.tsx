import { ListMusic, Trash2 } from "lucide-react";
import { artistNames, formatTime } from "../lib/format";
import { usePlayer } from "../store/player";
import { Cover } from "./Cover";

export function QueuePanel() {
  const queue = usePlayer((state) => state.queue);
  const index = usePlayer((state) => state.index);
  const playing = usePlayer((state) => state.playing);
  const playCollection = usePlayer((state) => state.playCollection);
  const removeAt = usePlayer((state) => state.removeAt);

  if (queue.length === 0) {
    return (
      <div className="lyrics-empty">
        <ListMusic size={26} />
        <p>Hàng đợi đang trống.</p>
        <span>Chọn một bài để bắt đầu nghe.</span>
      </div>
    );
  }

  return (
    <div className="queue">
      <div className="queue-head">
        <span>Hàng đợi</span>
        <span>{queue.length} bài</span>
      </div>
      {queue.map((song, position) => {
        const active = position === index;
        return (
          <div
            key={`${song.id}-${position}`}
            className={`queue-item ${active ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => playCollection(queue, position)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                playCollection(queue, position);
              }
            }}
          >
            <div className="queue-cover-wrap">
              <Cover src={song.thumbnail} alt={song.title} className="queue-cover" size={96} />
              {active ? (
                <span className={`eq small ${playing ? "playing" : ""}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </div>
            <div className="queue-text">
              <div className="queue-title">{song.title}</div>
              <div className="queue-artist">{artistNames(song.artists)}</div>
            </div>
            <div className="queue-meta">
              <span>{song.duration > 0 ? formatTime(song.duration) : ""}</span>
              <button
                className="mini-btn queue-remove"
                title="Xóa khỏi hàng đợi"
                aria-label="Xóa khỏi hàng đợi"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAt(position);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
