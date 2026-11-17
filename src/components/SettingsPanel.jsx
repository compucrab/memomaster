import { useEffect, useRef, useState } from "preact/hooks";
import { ArrowLeft, Palette, Moon, Sun, Brain, RotateCcw } from "lucide-preact";
import { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings } from "../services/fsrsSettings";

export default function SettingsPanel({ theme, onThemeChange, fsrsSettings, onFsrsSettingsChange, onBack }) {
  const [draft, setDraft] = useState(() => normalizeFsrsSettings(fsrsSettings || DEFAULT_FSRS_SETTINGS));
  const [learningText, setLearningText] = useState(draft.learningSteps.join(", "));
  const [relearningText, setRelearningText] = useState(draft.relearningSteps.join(", "));
  const [maximumText, setMaximumText] = useState(String(draft.maximumInterval));
  const firstSettingInputRef = useRef(null);
  useEffect(() => { firstSettingInputRef.current?.focus(); }, []);
  useEffect(() => {
    const next = normalizeFsrsSettings(fsrsSettings || DEFAULT_FSRS_SETTINGS);
    setDraft(next);
    setLearningText(next.learningSteps.join(", "));
    setRelearningText(next.relearningSteps.join(", "));
    setMaximumText(String(next.maximumInterval));
  }, [fsrsSettings]);
  function update(key, value) {
    const next = normalizeFsrsSettings({ ...draft, [key]: value });
    setDraft(next);
    onFsrsSettingsChange(next);
  }
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
      </div>
      <section class="fsrs-settings-panel">
        <div class="fsrs-settings-heading"><i><Brain size={18}/></i><div><h2>FSRS scheduling</h2><p>Shared scheduling preferences for all notebooks. Existing review history and due dates are preserved.</p></div></div>
        <div class="fsrs-settings-grid">
          <label>DESIRED RETENTION <strong>{Math.round(draft.desiredRetention * 100)}%</strong>
            <input ref={firstSettingInputRef} type="range" min="70" max="97" step="1" value={Math.round(draft.desiredRetention * 100)} onInput={event => update("desiredRetention", Number(event.currentTarget.value) / 100)} />
            <small>Higher retention means more frequent reviews. Default: 90%.</small>
          </label>
          <label>MAXIMUM INTERVAL
            <div class="fsrs-input-suffix"><input type="number" min="1" max="36500" value={maximumText} onInput={event => setMaximumText(event.currentTarget.value)} onBlur={() => update("maximumInterval", maximumText)}/><span>days</span></div>
            <small>Maximum time between scheduled reviews.</small>
          </label>
          <label>LEARNING STEPS
            <input value={learningText} onInput={event => setLearningText(event.currentTarget.value)} onBlur={() => update("learningSteps", learningText)} placeholder="1m, 10m"/>
            <small>Comma-separated steps. Default: 1m, 10m.</small>
          </label>
          <label>RELEARNING STEPS
            <input value={relearningText} onInput={event => setRelearningText(event.currentTarget.value)} onBlur={() => update("relearningSteps", relearningText)} placeholder="10m"/>
            <small>Steps used after a failed review.</small>
          </label>
          <label>DAY ROLLOVER
            <select value={draft.rolloverHour} onChange={event => update("rolloverHour", Number(event.currentTarget.value))}>
              {Array.from({ length: 24 }, (_, hour) => hour).map(hour => <option value={hour}>{String(hour).padStart(2,"0")}:00</option>)}
            </select>
            <small>Defines when a new study day begins for scheduling and workload statistics.</small>
          </label>
        </div>
        <p class="fsrs-settings-note"><RotateCcw size={13}/> Changing retention or interval limits affects future scheduling only. Existing cards are not silently rescheduled.</p>
      </section>
    </section>
  );
}
