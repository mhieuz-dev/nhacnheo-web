import { Disc3, Home, ListMusic, Search } from "lucide-react";
import { useCurrentSong, usePlayer } from "../store/player";

const items = [
  { key: "home", view: "home", label: "Khám phá", icon: Home },
  { key: "search", view: "search", label: "Tìm kiếm", icon: Search },
  { key: "now", view: "now", label: "Đang phát", icon: Disc3, tab: "lyrics" },
  { key: "queue", view: "now", label: "Hàng đợi", icon: ListMusic, tab: "queue" },
] as const;

export function Sidebar() {
  const view = usePlayer((state) => state.view);
  const nowTab = usePlayer((state) => state.nowTab);
  const setView = usePlayer((state) => state.setView);
  const setNowTab = usePlayer((state) => state.setNowTab);
  const current = useCurrentSong();

  return (
    <nav className="rail" aria-label="Điều hướng chính">
      <button className="rail-logo" onClick={() => setView("home")} aria-label="Nhạc Nhẽo">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
          <path
            d="M9 18a3 3 0 1 0 2-2.83V7l7-1.4v3.2l-5 1V18a3 3 0 1 0 2-2.83"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {items.map((item) => {
        const Icon = item.icon;
        const active =
          view === item.view &&
          (!("tab" in item) || nowTab === item.tab);
        const disabled = item.view === "now" && !current;
        return (
          <button
            key={item.key}
            className={`rail-btn ${active ? "active" : ""}`}
            onClick={() => {
              if (disabled) return;
              if ("tab" in item) setNowTab(item.tab);
              setView(item.view);
            }}
            disabled={disabled}
            title={item.label}
            aria-label={item.label}
          >
            <Icon size={19} strokeWidth={1.8} />
          </button>
        );
      })}

      <div className="rail-spacer" />

      <div className="rail-eq" title="Không quảng cáo">
        <span />
        <span />
        <span />
        <span />
      </div>
    </nav>
  );
}
