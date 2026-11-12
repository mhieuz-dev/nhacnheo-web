import type { AlbumCard, AlbumDetail, ArtistCard, ArtistDetail, MediaCard, PlaylistCard, PlaylistDetail, Song } from "./types.js";

export function secondsFromText(text?: string | null): number {
  if (!text) return 0;
  const parts = text.trim().split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const candidate = value as { toString?: () => string };
  try {
    return candidate.toString ? candidate.toString() : String(value);
  } catch {
    return "";
  }
}

export function thumbOf(item: any): string | undefined {
  const list =
    item?.thumbnails ??
    item?.thumbnail?.contents ??
    (Array.isArray(item?.thumbnail) ? item.thumbnail : undefined);
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const sorted = [...list].sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0));
  return sorted[0]?.url;
}

function artistsOf(item: any): { name: string; id?: string }[] {
  const raw = item?.artists ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((artist: any) => ({
      name: textOf(artist?.name),
      id: artist?.channel_id ?? artist?.id,
    }))
    .filter((artist) => artist.name.length > 0);
}

function flexSubtitle(item: any): string {
  const columns = item?.flex_columns;
  if (!Array.isArray(columns)) return "";
  return columns
    .slice(1)
    .map((column: any) => textOf(column?.title ?? column?.text))
    .filter(Boolean)
    .join(" · ");
}

function durationOf(item: any): number {
  const seconds = item?.duration?.seconds;
  if (typeof seconds === "number" && seconds > 0) return seconds;
  return secondsFromText(item?.duration?.text);
}

export function normalizeSong(item: any): Song | null {
  const id = item?.id ?? item?.video_id;
  const title = textOf(item?.title);
  if (!id || !title) return null;
  return {
    id,
    type: "song",
    title,
    artists: artistsOf(item),
    album: item?.album?.name
      ? { name: textOf(item.album.name), id: item.album.id }
      : null,
    duration: durationOf(item),
    thumbnail: thumbOf(item),
    video: item?.item_type === "video",
  };
}

export function normalizeItem(item: any): MediaCard | null {
  const itemType = item?.item_type;
  const thumb = thumbOf(item);
  if (itemType === "song" || itemType === "video") return normalizeSong(item);
  if (itemType === "album") {
    const title = textOf(item?.title);
    if (!item?.id || !title) return null;
    const card: AlbumCard = {
      id: item.id,
      type: "album",
      title,
      artists: artistsOf(item),
      year: item?.year ? textOf(item.year) : undefined,
      subtitle: textOf(item?.subtitle) || flexSubtitle(item),
      thumbnail: thumb,
    };
    return card;
  }
  if (itemType === "artist") {
    const title = textOf(item?.title) || textOf(item?.name);
    if (!item?.id || !title) return null;
    return {
      id: item.id,
      type: "artist",
      title,
      subtitle: textOf(item?.subtitle) || flexSubtitle(item) || textOf(item?.subscribers),
      thumbnail: thumb,
    };
  }
  if (itemType === "playlist") {
    const title = textOf(item?.title);
    if (!item?.id || !title) return null;
    return {
      id: item.id,
      type: "playlist",
      title,
      author: textOf(item?.author?.name) || textOf(item?.author),
      count: typeof item?.item_count === "number" ? item.item_count : undefined,
      subtitle: textOf(item?.subtitle) || flexSubtitle(item),
      thumbnail: thumb,
    };
  }
  return null;
}

export function normalizeItems(items: any): MediaCard[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeItem).filter((item): item is MediaCard => item !== null);
}

export function normalizeAlbum(album: any): AlbumDetail {
  const header = album?.header;
  const tracks: Song[] = [];
  for (const item of Array.isArray(album?.contents) ? album.contents : []) {
    const song = normalizeSong(item);
    if (song) tracks.push(song);
  }
  const strapline = textOf(header?.strapline_text_one);
  const artists =
    artistsOf(header).length > 0
      ? artistsOf(header)
      : strapline && strapline !== "N/A"
        ? strapline.split(",").map((name) => ({ name: name.trim() }))
        : [];
  return {
    id: header?.endpoint?.payload?.browseId ?? album?.url ?? "",
    type: "album",
    title: textOf(header?.title),
    artists,
    year: undefined,
    subtitle: textOf(header?.subtitle),
    thumbnail: thumbOf(header) ?? tracks[0]?.thumbnail,
    tracks,
  };
}

export function normalizePlaylist(playlist: any): PlaylistDetail {
  const header = playlist?.header;
  const tracks: Song[] = [];
  for (const item of Array.isArray(playlist?.contents) ? playlist.contents : []) {
    const song = normalizeSong(item);
    if (song) tracks.push(song);
  }
  const strapline = textOf(header?.strapline_text_one);
  return {
    id: "",
    type: "playlist",
    title: textOf(header?.title),
    author: textOf(header?.author?.name) || (strapline !== "N/A" ? strapline : ""),
    count: tracks.length,
    subtitle: textOf(header?.subtitle),
    thumbnail: thumbOf(header) ?? tracks[0]?.thumbnail,
    tracks,
  };
}

export function normalizeArtist(artist: any): ArtistDetail {
  const header = artist?.header;
  const sections: any[] = Array.isArray(artist?.sections) ? artist.sections : [];
  const topShelf = sections.find((section) => section?.type === "MusicShelf");
  const topSongs = normalizeItems(topShelf?.contents).filter(
    (item): item is Song => item.type === "song",
  );
  const albums: AlbumCard[] = [];
  for (const section of sections) {
    if (section?.type !== "MusicCarouselShelf") continue;
    for (const item of normalizeItems(section?.contents)) {
      if (item.type === "album") albums.push(item);
    }
  }
  return {
    id: "",
    type: "artist",
    title: textOf(header?.title),
    subtitle: textOf(header?.subtitle),
    thumbnail: thumbOf(header),
    description: textOf(header?.description),
    topSongs,
    albums,
  };
}
