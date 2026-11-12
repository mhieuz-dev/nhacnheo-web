export interface ArtistRef {
  name: string;
  id?: string;
}

export interface Song {
  id: string;
  type: "song";
  title: string;
  artists: ArtistRef[];
  album: { name: string; id?: string } | null;
  duration: number;
  thumbnail?: string;
  video?: boolean;
}

export interface AlbumCard {
  id: string;
  type: "album";
  title: string;
  artists: ArtistRef[];
  year?: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface PlaylistCard {
  id: string;
  type: "playlist";
  title: string;
  author?: string;
  count?: number;
  subtitle?: string;
  thumbnail?: string;
}

export interface ArtistCard {
  id: string;
  type: "artist";
  title: string;
  subtitle?: string;
  thumbnail?: string;
}

export type MediaCard = Song | AlbumCard | PlaylistCard | ArtistCard;

export interface HomeSection {
  title: string;
  items: MediaCard[];
}

export interface AlbumDetail extends AlbumCard {
  tracks: Song[];
}

export interface PlaylistDetail extends PlaylistCard {
  tracks: Song[];
}

export interface ArtistDetail extends ArtistCard {
  description?: string;
  topSongs: Song[];
  albums: AlbumCard[];
}

export interface LyricsWord {
  time: number;
  text: string;
}

export interface LyricsLine {
  time: number;
  text: string;
  words: LyricsWord[];
}

export interface LyricsResult {
  videoId: string;
  synced: boolean;
  source: "simpmusic" | "lrclib" | "none";
  lines: LyricsLine[];
}
