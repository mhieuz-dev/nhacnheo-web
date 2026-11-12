import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { coverUrl } from "../lib/format";

interface CoverProps {
  src?: string;
  alt: string;
  className?: string;
  size?: number;
}

export function Cover({ src, alt, className = "", size = 544 }: CoverProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setAttempt(0);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`cover-fallback ${className}`} aria-hidden="true">
        <Music2 size={22} />
      </div>
    );
  }

  const source =
    attempt === 0 ? coverUrl(src, size) : src.replace(/=w\d+-h\d+.*$/, "");

  return (
    <img
      className={`${className} ${loaded ? "cover-loaded" : "cover-loading"}`}
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (attempt === 0) {
          window.setTimeout(() => setAttempt(1), 400);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
