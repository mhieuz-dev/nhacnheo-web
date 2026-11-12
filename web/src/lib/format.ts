export function formatTime(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function artistNames(artists?: { name: string }[]): string {
  if (!artists || artists.length === 0) return "Không rõ nghệ sĩ";
  return artists.map((artist) => artist.name).join(", ");
}

export function coverUrl(url?: string, size = 544): string {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
  }
  return url;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Khuya rồi, nghe nhẹ thôi";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}
