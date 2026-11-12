import { Pause, Play, Shuffle } from "lucide-react";
import { api } from "../lib/api";
import { artistNames } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import type { AlbumDetail, ArtistDetail, PlaylistDetail, Song } from "../lib/types";
import { useCurrentSong, usePlayer } from "../store/player";
import { Cover } from "./Cover";
import { MediaCardView } from "./MediaCardView";
import { SongRow } from "./SongRow";

function PlayActions({ tracks }: { tracks: Song[] }) {
  const playCollection = usePlayer((state) => state.playCollection);
  const playing = usePlayer((state) => state.playing);
  const toggle = usePlayer((state) => state.toggle);
  const current = useCurrentSong();
  const currentInList = current ? tracks.some((track) => track.id === current.id) : false;

  return (
    <div className="detail-actions">
      <button
        className="btn-primary"
        onClick={() => {
          if (currentInList && current) {
            toggle();
            return;
          }
          playCollection(tracks, 0, false);
        }}
      >
        {currentInList && playing ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" />
        )}
        {currentInList && playing ? "Tạm dừng" : "Phát tất cả"}
      </button>
      <button className="btn-ghost" onClick={() => playCollection(tracks, 0, true)}>
        <Shuffle size={16} />
        Trộn bài
      </button>
    </div>
  );
}

function DetailHeader({
  eyebrow,
  title,
  subtitle,
  description,
  cover,
  round,
  tracks,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  description?: string;
  cover?: string;
  round?: boolean;
  tracks: Song[];
}) {
  return (
    <header className="detail-head">
      <Cover
        src={cover}
        alt={title}
        className={`detail-cover ${round ? "round" : ""}`}
        size={640}
      />
      <div className="detail-info">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="detail-sub">{subtitle}</p>
        {description ? <p className="detail-desc">{description}</p> : null}
        {tracks.length > 0 ? <PlayActions tracks={tracks} /> : null}
      </div>
    </header>
  );
}

function TrackTable({ tracks }: { tracks: Song[] }) {
  const current = useCurrentSong();
  const playSong = usePlayer((state) => state.playSong);

  return (
    <div className="track-list detail-tracks">
      {tracks.map((song, index) => (
        <SongRow
          key={`${song.id}-${index}`}
          song={song}
          index={index}
          active={current?.id === song.id}
          onPlay={() => playSong(song, tracks)}
        />
      ))}
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="detail-head">
      <div className="skel detail-cover" />
      <div className="detail-info">
        <div className="skel skel-line short" />
        <div className="skel skel-title big" />
        <div className="skel skel-line" />
        <div className="skel skel-line" />
      </div>
    </div>
  );
}

export function AlbumView({ id }: { id: string }) {
  const { data, loading, error } = useAsync<AlbumDetail>(() => api.album(id), [id]);
  if (loading) return <LoadingDetail />;
  if (error || !data) return <div className="notice">{error ?? "Không tìm thấy album"}</div>;
  const tracks = data.tracks.map((track) => ({
    ...track,
    artists: track.artists.length > 0 ? track.artists : data.artists,
    thumbnail: track.thumbnail ?? data.thumbnail,
  }));
  return (
    <div className="detail">
      <DetailHeader
        eyebrow="Album"
        title={data.title}
        subtitle={[artistNames(data.artists), data.year ?? data.subtitle].filter(Boolean).join(" · ")}
        cover={data.thumbnail}
        tracks={tracks}
      />
      <TrackTable tracks={tracks} />
    </div>
  );
}

export function PlaylistView({ id }: { id: string }) {
  const { data, loading, error } = useAsync<PlaylistDetail>(() => api.playlist(id), [id]);
  if (loading) return <LoadingDetail />;
  if (error || !data)
    return <div className="notice">{error ?? "Không tìm thấy danh sách phát"}</div>;
  return (
    <div className="detail">
      <DetailHeader
        eyebrow="Danh sách phát"
        title={data.title}
        subtitle={[
          data.author || data.subtitle,
          `${data.tracks.length} bài`,
        ]
          .filter(Boolean)
          .join(" · ")}
        cover={data.thumbnail}
        tracks={data.tracks}
      />
      <TrackTable tracks={data.tracks} />
    </div>
  );
}

export function ArtistView({ id }: { id: string }) {
  const { data, loading, error } = useAsync<ArtistDetail>(() => api.artist(id), [id]);
  const openDetail = usePlayer((state) => state.openDetail);
  const playSong = usePlayer((state) => state.playSong);
  const current = useCurrentSong();
  if (loading) return <LoadingDetail />;
  if (error || !data) return <div className="notice">{error ?? "Không tìm thấy nghệ sĩ"}</div>;

  return (
    <div className="detail">
      <DetailHeader
        eyebrow="Nghệ sĩ"
        title={data.title}
        subtitle={data.subtitle || "Nghệ sĩ trên YouTube Music"}
        description={data.description}
        cover={data.thumbnail}
        round
        tracks={data.topSongs}
      />
      {data.topSongs.length > 0 ? (
        <>
          <h2 className="section-title">Bài hát hàng đầu</h2>
          <div className="track-list">
            {data.topSongs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index}
                active={current?.id === song.id}
                onPlay={() => playSong(song, data.topSongs)}
              />
            ))}
          </div>
        </>
      ) : null}
      {data.albums.length > 0 ? (
        <>
          <h2 className="section-title">Album</h2>
          <div className="card-grid">
            {data.albums.map((album) => (
              <MediaCardView
                key={album.id}
                item={album}
                onPlay={() => undefined}
                onOpen={() => openDetail({ type: "album", id: album.id, title: album.title })}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
