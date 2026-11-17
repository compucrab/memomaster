import { useEffect, useRef } from "preact/hooks";
import { Search, Plus, BarChart3 } from "lucide-preact";

export default function Topbar({ title, query, onQueryChange, onCreate, onStudyStatus }) {
  const searchRef = useRef(null);
  useEffect(() => { searchRef.current?.focus(); }, []);
  return (
    <header class="topbar">
      <div class="topbar-breadcrumb">
        <span>MemoMaster</span>
        <b>/</b>
        <strong>{title}</strong>
      </div>

      <div class="topbar-actions">
        <label class="search-field">
          <Search size={15} />
          <input
            ref={searchRef}
            value={query}
            onInput={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Find a notebook..."
          />
        </label>

        <button class="topbar-status-button" onClick={onStudyStatus}><BarChart3 size={15} /> Study status</button>
        <button class="button-primary" onClick={onCreate}>
          <Plus size={15} />
          New notebook
        </button>
      </div>
    </header>
  );
}
