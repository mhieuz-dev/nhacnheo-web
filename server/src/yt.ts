import { Innertube } from "youtubei.js";
import {
  normalizeAlbum,
  normalizeArtist,
  normalizeItems,
  normalizePlaylist,
  normalizeSong,
  thumbOf,
} from "./normalize.js";
import type {
  AlbumDetail,
  ArtistDetail,
  HomeSection,
  MediaCard,
  PlaylistDetail,
  Song,
} from "./types.js";

const SEARCH_TYPES: Record<string, string> = {
  songs: "song",
  albums: "album",
  artists: "artist",
  playlists: "playlist",
  videos: "video",
};

let clientPromise: Promise<Innertube> | null = null;

export function getClient(): Promise<Innertube> {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      lang: "vi",
      location: "VN",
      retrieve_player: false,
      generate_session_locally: true,
    });
  }
  return clientPromise;
}

const SECTION_TITLES: Record<string, string> = {
  "Today's Hits": "Hit hôm nay",
  "New releases": "Mới phát hành",
  "New music videos": "Video nhạc mới",
  Trending: "Thịnh hành",
  "Top songs": "Bài hát hàng đầu",
  Charts: "Bảng xếp hạng",
  "Moods & genres": "Tâm trạng và thể loại",
  "Popular playlists": "Danh sách phát nổi bật",
  "Forgotten favourites": "Bài cũ nhớ lại",
};

let homeCache: { at: number; sections: HomeSection[] } | null = null;

export async function getHome(): Promise<HomeSection[]> {
  if (homeCache && Date.now() - homeCache.at < 10 * 60 * 1000) {
    return homeCache.sections;
  }
  const yt = await getClient();
  const feed = await yt.music.getHomeFeed();
  const explore = await yt.music.getExplore().catch(() => null);
  const sections: HomeSection[] = [];
  const seen = new Set<string>();
  for (const section of [...(feed.sections ?? []), ...((explore as any)?.sections ?? [])]) {
    if ((section as any).type !== "MusicCarouselShelf") continue;
    const items = normalizeItems((section as any).contents);
    if (items.length === 0) continue;
    const rawTitle = (section as any).header?.title?.toString?.() ?? "";
    const title = SECTION_TITLES[rawTitle] ?? rawTitle;
    const key = `${title}|${items[0]?.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sections.push({ title: title || "Dành cho bạn", items });
  }
  const result = sections.slice(0, 10);
  if (explore) homeCache = { at: Date.now(), sections: result };
  return result;
}

export async function search(query: string, type: string): Promise<MediaCard[]> {
  const yt = await getClient();
  const mapped = SEARCH_TYPES[type] ?? "song";
  const result = await yt.music.search(query, { type: mapped as any });
  const shelf = (result as any).contents?.[0];
  return normalizeItems(shelf?.contents);
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const yt = await getClient();
  const album = await yt.music.getAlbum(id);
  const detail = normalizeAlbum(album);
  detail.id = id;
  if (!detail.title) throw new Error("Không tìm thấy album");
  return detail;
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  const yt = await getClient();
  const playlist = await yt.music.getPlaylist(id);
  const detail = normalizePlaylist(playlist);
  detail.id = id;
  if (!detail.title) throw new Error("Không tìm thấy danh sách phát");
  return detail;
}

export async function getArtist(id: string): Promise<ArtistDetail> {
  const yt = await getClient();
  const artist = await yt.music.getArtist(id);
  const detail = normalizeArtist(artist);
  detail.id = id;
  if (!detail.title) throw new Error("Không tìm thấy nghệ sĩ");
  return detail;
}

export async function getSong(id: string): Promise<Song> {
  const yt = await getClient();
  const info = await yt.music.getInfo(id);
  const basic = (info as any).basic_info ?? {};
  const title = basic.title ?? "";
  if (!title) throw new Error("Không tìm thấy bài hát");
  return {
    id,
    type: "song",
    title,
    artists: basic.author ? [{ name: basic.author }] : [],
    album: null,
    duration: basic.duration ?? 0,
    thumbnail: thumbOf({ thumbnails: basic.thumbnail }),
  };
}

export async function getUpNext(videoId: string): Promise<Song[]> {
  const yt = await getClient();
  const upNext = await yt.music.getUpNext(videoId, true);
  const songs: Song[] = [];
  for (const item of (upNext as any).contents ?? []) {
    const song = normalizeSong(item);
    if (song) songs.push(song);
  }
  return songs;
}
