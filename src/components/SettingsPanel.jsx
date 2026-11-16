import { useEffect, useState } from "preact/hooks";
import { ArrowLeft, Palette, Type, FolderArchive, Keyboard, Moon, Sun, Brain, RotateCcw } from "lucide-preact";
import { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings } from "../services/fsrsSettings";

export default function SettingsPanel({ theme, onThemeChange, fsrsSettings, onFsrsSettingsChange, onBack }) {
  const [draft, setDraft] = useState(() => normalizeFsrsSettings(fsrsSettings || DEFAULT_FSRS_SETTINGS));
  useEffect(() => setDraft(normalizeFsrsSettings(fsrsSettings || DEFAULT_FSRS_SETTINGS)), [fsrsSettings]);
  function update(key, value) {
    const next = normalizeFsrsSettings({ ...draft, [key]: value });
    setDraft(next);
    onFsrsSettingsChange(next);
  }
  const learningText = draft.learningSteps.join(", ");
  const relearningText = draft.relearningSteps.join(", ");
  return (
    <section class="workspace settings-workspace">
      <button class="settings-back" onClick={onBack}><ArrowLeft size={14} /> BACK TO LIBRARY</button>
      <div class="settings-list">
        <section class="settings-row">
          <i><Palette size={18} /></i>
          <div><h2>Appearance</h2><p>Choose a comfortable colour scheme for your workspace.</p></div>
          <div class="theme-switch">
            <button type="button" title="Light theme" aria-label="Light theme" class={theme === "light" ? "is-selected" : ""} onClick={() => onThemeChange("light")}><Sun size={14} /> Light</button>
            <button type="button" title="Dark theme" aria-label="Dark theme" class={theme === "dark" ? "is-selected" : ""} onClick={() => onThemeChange("dark")}><Moon size={14} /> Dark</button>
          </div>
        </section>
        <section class="settings-row"><i><Type size={18} /></i><div><h2>Typography</h2><p>Manrope headings, DM Sans interface text and DM Mono metadata.</p></div><span>EDITORIAL</span></section>
        <section class="settings-row"><i><FolderArchive size={18} /></i><div><h2>Project files</h2><p>Import and export the library as a portable .memz ZIP archive from the File menu.</p></div><span>READY</span></section>
        <section class="settings-row"><i><Keyboard size={18} /></i><div><h2>Keyboard shortcuts</h2><p>Ctrl+N: New notebook · Ctrl+Shift+N: New project · Ctrl+O: Open project · Ctrl+S: Save project.</p></div><span>DESKTOP</span></section>
      </div>
      <section class="fsrs-settings-panel">
        <div class="fsrs-settings-heading"><i><Brain size={18}/></i><div><h2>FSRS scheduling</h2><p>Shared scheduling preferences for all notebooks. Existing review history and due dates are preserved.</p></div></div>
        <div class="fsrs-settings-grid">
          <label>DESIRED RETENTION <strong>{Math.round(draft.desiredRetention * 100)}%</strong>
            <input type="range" min="70" max="97" step="1" value={Math.round(draft.desiredRetention * 100)} onInput={event => update("desiredRetention", Number(event.currentTarget.value) / 100)} />
            <small>Higher retention means more frequent reviews. Default: 90%.</small>
          </label>
          <label>MAXIMUM INTERVAL
            <div class="fsrs-input-suffix"><input type="number" min="1" max="36500" value={draft.maximumInterval} onChange={event => update("maximumInterval", event.currentTarget.value)}/><span>days</span></div>
            <small>Maximum time between scheduled reviews.</small>
          </label>
          <label>LEARNING STEPS
            <input value={learningText} onChange={event => update("learningSteps", event.currentTarget.value)} placeholder="10m, 1h"/>
            <small>Comma-separated steps, e.g. 10m, 1h.</small>
          </label>
          <label>RELEARNING STEPS
            <input value={relearningText} onChange={event => update("relearningSteps", event.currentTarget.value)} placeholder="10m"/>
            <small>Steps used after a failed review.</small>
          </label>
          <label>DAY ROLLOVER
            <select value={draft.rolloverHour} onChange={event => update("rolloverHour", Number(event.currentTarget.value))}>
              {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(hour => <option value={hour}>{String(hour).padStart(2,"0")}:00</option>)}
            </select>
            <small>Defines when a new study day begins in workload statistics.</small>
          </label>
        </div>
        <p class="fsrs-settings-note"><RotateCcw size={13}/> Changing retention or interval limits affects future scheduling only. Existing cards are not silently rescheduled.</p>
      </section>
    </section>
  );
}
