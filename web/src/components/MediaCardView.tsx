import { Play, User } from "lucide-react";
import { artistNames } from "../lib/format";
import type { MediaCard } from "../lib/types";
import { Cover } from "./Cover";

interface MediaCardViewProps {
  item: MediaCard;
  onPlay: () => void;
  onOpen: () => void;
}

function subtitleOf(item: MediaCard): string {
  if (item.type === "song") return artistNames(item.artists);
  if (item.type === "album") {
    return (
      item.subtitle ||
      [artistNames(item.artists), item.year].filter(Boolean).join(" · ")
    );
  }
  if (item.type === "playlist") {
    return item.author || item.subtitle || "Danh sách phát";
  }
  return item.subtitle || "Nghệ sĩ";
}

export function MediaCardView({ item, onPlay, onOpen }: MediaCardViewProps) {
  const round = item.type === "artist";
  return (
    <article
      className={`card ${round ? "round" : ""}`}
      onClick={item.type === "song" ? onPlay : onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (item.type === "song") onPlay();
          else onOpen();
        }
      }}
    >
      <div className="card-cover">
        <Cover src={item.thumbnail} alt={item.title} size={320} />
        <span className="card-play">
          {item.type === "song" ? (
            <Play size={17} fill="currentColor" />
          ) : item.type === "artist" ? (
            <User size={17} />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </span>
      </div>
      <div className="card-title">{item.title}</div>
      <div className="card-sub">{subtitleOf(item)}</div>
    </article>
  );
}
