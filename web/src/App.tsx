import { AudioEngine } from "./components/AudioEngine";
import { Backdrop } from "./components/Backdrop";
import { AlbumView, ArtistView, PlaylistView } from "./components/DetailViews";
import { HomeView } from "./components/HomeView";
import { NowPlaying } from "./components/NowPlaying";
import { PlayerBar } from "./components/PlayerBar";
import { SearchView } from "./components/SearchView";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { useCurrentSong, usePlayer } from "./store/player";

export default function App() {
  const view = usePlayer((state) => state.view);
  const detail = usePlayer((state) => state.detail);
  const current = useCurrentSong();

  return (
    <div className="app">
      <Backdrop cover={current?.thumbnail} />
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className={`view ${view === "now" ? "view-now" : ""}`}>
          {view === "home" ? <HomeView /> : null}
          {view === "search" ? <SearchView /> : null}
          {view === "now" ? <NowPlaying /> : null}
          {view === "album" && detail ? <AlbumView key={detail.id} id={detail.id} /> : null}
          {view === "playlist" && detail ? (
            <PlaylistView key={detail.id} id={detail.id} />
          ) : null}
          {view === "artist" && detail ? <ArtistView key={detail.id} id={detail.id} /> : null}
        </main>
        <PlayerBar />
      </div>
      <AudioEngine />
      <Toast />
    </div>
  );
}
