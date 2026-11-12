import { useEffect, useMemo, useRef, useState } from "react";
import { Mic2 } from "lucide-react";
import { currentAudioTime } from "../lib/audio";
import type { LyricsLine, LyricsResult } from "../lib/types";
import { usePlayer } from "../store/player";

function activeIndexFor(lines: LyricsLine[], time: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= time + 0.12) active = i;
    else break;
  }
  return active;
}

function currentWordFor(line: LyricsLine, time: number): number {
  let current = -1;
  for (let i = 0; i < line.words.length; i += 1) {
    if (line.words[i].time <= time) current = i;
    else break;
  }
  return current;
}

function SkeletonLyrics() {
  return (
    <div className="lyrics-skeleton">
      {[88, 70, 94, 62, 80, 74, 90, 58].map((width, index) => (
        <div
          key={index}
          className="skel skel-lyric"
          style={{ width: `${width}%`, animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function LyricsPanel({
  lyrics,
  loading,
  error,
}: {
  lyrics: LyricsResult | null;
  loading: boolean;
  error: string | null;
}) {
  const [time, setTime] = useState(() => currentAudioTime());
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seek = usePlayer((state) => state.seek);

  useEffect(() => {
    let frame = 0;
    let last = -1;
    const tick = () => {
      const next = currentAudioTime();
      if (Math.abs(next - last) > 0.04) {
        last = next;
        setTime(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const lines = lyrics?.lines ?? [];
  const synced = Boolean(lyrics?.synced);
  const active = useMemo(() => (synced ? activeIndexFor(lines, time) : -1), [lines, synced, time]);

  useEffect(() => {
    if (!synced || active < 0) return;
    const container = containerRef.current;
    const element = lineRefs.current[active];
    if (!container || !element) return;
    const top = element.offsetTop - container.clientHeight * 0.42;
    container.scrollTo({ top, behavior: "smooth" });
  }, [active, synced, lyrics?.videoId]);

  if (loading) return <SkeletonLyrics />;

  if (error) {
    return (
      <div className="lyrics-empty">
        <Mic2 size={26} />
        <p>Không tải được lời bài hát.</p>
        <span>{error}</span>
      </div>
    );
  }

  if (!lyrics || lines.length === 0) {
    return (
      <div className="lyrics-empty">
        <Mic2 size={26} />
        <p>Bài này chưa có lời.</p>
        <span>Thử một bài khác, hoặc bật “Lời” trên YouTube Music nhé.</span>
      </div>
    );
  }

  return (
    <div className={`lyrics ${synced ? "" : "unsynced"}`} ref={containerRef}>
      {lines.map((line, index) => {
        const isActive = index === active;
        const isPast = active >= 0 && index < active;
        const wordIndex = isActive ? currentWordFor(line, time) : -1;
        return (
          <div
            key={`${line.time}-${index}`}
            ref={(element) => {
              lineRefs.current[index] = element;
            }}
            className={`lyric-line ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
            onClick={() => {
              if (synced) seek(line.time + 0.05);
            }}
          >
            {line.words.length > 0
              ? line.words.map((word, wordPosition) => (
                  <span
                    key={`${word.time}-${wordPosition}`}
                    className={`lyric-word ${wordIndex >= wordPosition ? "sung" : ""} ${
                      wordIndex === wordPosition ? "current-word" : ""
                    }`}
                  >
                    {word.text}
                  </span>
                ))
              : line.text}
          </div>
        );
      })}
    </div>
  );
}
