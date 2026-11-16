import { Library, Settings2 } from "lucide-preact";

export default function Sidebar({ activeView, onNavigate, notebooks }) {
  return (
    <aside class="sidebar">
      <button class="brand" onClick={() => onNavigate("library")}>
        <span class="brand-mark">m</span><span>memo<span class="brand-dot">.</span>master</span>
      </button>
      <div class="sidebar-section">
        <p class="sidebar-label">WORKSPACE</p>
        <button class={`nav-item ${activeView === "library" ? "is-active" : ""}`} onClick={() => onNavigate("library")}>
          <Library size={17} /><span>Library</span><span class="nav-count">{notebooks.length}</span>
        </button>
      </div>
      <div class="sidebar-bottom">
        <button class={`nav-item ${activeView === "settings" ? "is-active" : ""}`} onClick={() => onNavigate("settings")}>
          <Settings2 size={17} /><span>Preferences</span>
        </button>
        <div class="sidebar-version">MEMOMASTER <span>0.1.0</span></div>
      </div>
    </aside>
  );
}
