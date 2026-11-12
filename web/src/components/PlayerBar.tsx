import type { CSSProperties } from "react";
import {
  Heart,
  ListPlus,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { artistNames, formatTime } from "../lib/format";
import { useCurrentSong, usePlayer } from "../store/player";
import { Cover } from "./Cover";

export function PlayerBar() {
  const current = useCurrentSong();
  const playing = usePlayer((state) => state.playing);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const repeat = usePlayer((state) => state.repeat);
  const shuffle = usePlayer((state) => state.shuffle);
  const liked = usePlayer((state) => state.liked);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const seek = usePlayer((state) => state.seek);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggleMute = usePlayer((state) => state.toggleMute);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const toggleLike = usePlayer((state) => state.toggleLike);
  const appendQueue = usePlayer((state) => state.appendQueue);
  const setToast = usePlayer((state) => state.setToast);
  const setView = usePlayer((state) => state.setView);
  const setNowTab = usePlayer((state) => state.setNowTab);

  if (!current) return null;

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const isLiked = liked.includes(current.id);

  return (
    <div className="player-bar">
      <input
        className="seek"
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => seek(Number(event.target.value))}
        style={{ "--progress": `${progress * 100}%` } as CSSProperties}
        aria-label="Tua bài"
      />
      <span className="pb-time start">{formatTime(currentTime)}</span>
      <span className="pb-time end">{duration > 0 ? formatTime(duration) : "--:--"}</span>

      <div className="pb-left">
        <Cover src={current.thumbnail} alt={current.title} className="pb-cover" size={120} />
        <div className="pb-text">
          <div className="pb-title">{current.title}</div>
          <div className="pb-artist">{artistNames(current.artists)}</div>
        </div>
        <button
          className={`pb-icon ${isLiked ? "liked" : ""}`}
          onClick={() => toggleLike(current.id)}
          aria-label={isLiked ? "Bỏ thích" : "Thích"}
          title={isLiked ? "Bỏ thích" : "Thích"}
        >
          <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="pb-center">
        <button
          className={`pb-btn ${shuffle ? "on" : ""}`}
          onClick={toggleShuffle}
          aria-label="Trộn bài"
          title="Trộn bài"
        >
          <Shuffle size={17} />
        </button>
        <button className="pb-btn" onClick={previous} aria-label="Bài trước" title="Bài trước">
          <SkipBack size={19} fill="currentColor" />
        </button>
        <button
          className="pb-play"
          onClick={toggle}
          aria-label={playing ? "Tạm dừng" : "Phát"}
        >
          {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <button className="pb-btn" onClick={() => next()} aria-label="Bài sau" title="Bài sau">
          <SkipForward size={19} fill="currentColor" />
        </button>
        <button
          className={`pb-btn ${repeat !== "off" ? "on" : ""}`}
          onClick={cycleRepeat}
          aria-label="Lặp lại"
          title={repeat === "one" ? "Lặp một bài" : repeat === "all" ? "Lặp cả hàng đợi" : "Lặp lại"}
        >
          {repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
        </button>
      </div>

      <div className="pb-right">
        <button
          className="pb-btn"
          onClick={() => {
            appendQueue([current]);
            setToast("Đã thêm vào hàng đợi");
          }}
          aria-label="Thêm vào hàng đợi"
          title="Thêm vào hàng đợi"
        >
          <ListPlus size={17} />
        </button>
        <button className="pb-btn" onClick={toggleMute} aria-label="Tắt tiếng" title="Tắt tiếng">
          {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input
          className="volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          aria-label="Âm lượng"
        />
        <button
          className="pb-btn"
          onClick={() => {
            setNowTab("lyrics");
            setView("now");
          }}
          aria-label="Mở trình phát"
          title="Mở trình phát"
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  );
}
