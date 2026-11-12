import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { usePlayer } from "../store/player";

const labels: Record<string, string> = {
  home: "Khám phá",
  search: "Tìm kiếm",
  album: "Album",
  playlist: "Danh sách phát",
  artist: "Nghệ sĩ",
  now: "Đang phát",
};

export function TopBar() {
  const view = usePlayer((state) => state.view);
  const detail = usePlayer((state) => state.detail);
  const setView = usePlayer((state) => state.setView);
  const closeDetail = usePlayer((state) => state.closeDetail);

  if (view === "now") return null;

  const isDetail = view === "album" || view === "playlist" || view === "artist";
  const title = isDetail ? detail?.title || labels[view] : labels[view];

  return (
    <header className="topbar">
      {isDetail ? (
        <button className="icon-btn" onClick={closeDetail} aria-label="Quay lại">
          <ArrowLeft size={18} />
        </button>
      ) : view === "search" ? (
        <button className="icon-btn" onClick={() => setView("home")} aria-label="Về trang chủ">
          <ArrowLeft size={18} />
        </button>
      ) : null}

      <div className="topbar-title">
        <span className="topbar-kicker">Nhạc Nhẽo</span>
        <h1>{title}</h1>
      </div>

      <div className="topbar-spacer" />

      <span className="badge">
        <Sparkles size={13} />
        Không quảng cáo
      </span>

      {view !== "search" ? (
        <button className="topbar-search" onClick={() => setView("search")}>
          <Search size={16} />
          <span>Tìm bài hát, nghệ sĩ...</span>
          <kbd>/</kbd>
        </button>
      ) : null}
    </header>
  );
}
