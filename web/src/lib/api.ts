import type {
  AlbumDetail,
  ArtistDetail,
  HomeSection,
  LyricsResult,
  MediaCard,
  PlaylistDetail,
  Song,
} from "./types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Máy chủ trả lỗi ${response.status}`);
  }
  return body as T;
}

export const api = {
  home: () => request<{ sections: HomeSection[] }>("/api/home"),
  search: (query: string, type: string) =>
    request<{ items: MediaCard[] }>(
      `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`,
    ),
  album: (id: string) => request<AlbumDetail>(`/api/album/${encodeURIComponent(id)}`),
  playlist: (id: string) =>
    request<PlaylistDetail>(`/api/playlist/${encodeURIComponent(id)}`),
  artist: (id: string) => request<ArtistDetail>(`/api/artist/${encodeURIComponent(id)}`),
  song: (id: string) => request<Song>(`/api/song/${encodeURIComponent(id)}`),
  upNext: (id: string) =>
    request<{ songs: Song[] }>(`/api/upnext/${encodeURIComponent(id)}`),
  lyrics: (videoId: string, song?: Song) => {
    const params = new URLSearchParams();
    if (song) {
      params.set("title", song.title);
      if (song.artists[0]?.name) params.set("artist", song.artists[0].name);
      if (song.album?.name) params.set("album", song.album.name);
      if (song.duration) params.set("duration", String(song.duration));
    }
    const query = params.toString();
    return request<LyricsResult>(
      `/api/lyrics/${encodeURIComponent(videoId)}${query ? `?${query}` : ""}`,
    );
  },
};

export function streamUrl(videoId: string): string {
  return `/api/stream/${encodeURIComponent(videoId)}`;
}
