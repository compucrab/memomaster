import { Search, Plus, Command, ChartNoAxesColumn } from "lucide-preact";

export default function Topbar({ title, query, onQueryChange, onCreate, onStudyStatus }) {
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
            value={query}
            onInput={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Find a notebook..."
          />
          <kbd><Command size={10} /> K</kbd>
        </label>

        <button class="topbar-status-button" onClick={onStudyStatus}><ChartNoAxesColumn size={15} /> Study status</button>
        <button class="button-primary" onClick={onCreate}>
          <Plus size={15} />
          New notebook
        </button>
      </div>
    </header>
  );
}
