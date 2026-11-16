import { useEffect, useRef, useState } from "preact/hooks";
import { Check, X } from "lucide-preact";

export default function TextPrompt({ title, value = "", placeholder, submitLabel = "Save", onCancel, onSubmit }) {
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  useEffect(() => {
    const keydown = (event) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return (
    <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <form class="prompt-panel" onSubmit={(event) => { event.preventDefault(); setError(onSubmit(text) || ""); }}>
        <div class="prompt-heading"><h2>{title}</h2><button type="button" aria-label="Close" onClick={onCancel}><X size={16} /></button></div>
        <input ref={inputRef} value={text} onInput={(event) => { setText(event.currentTarget.value); setError(""); }} placeholder={placeholder} />
        {error && <p class="prompt-error" role="alert">{error}</p>}
        <div class="prompt-actions">
          <button type="button" class="prompt-cancel" onClick={onCancel}>Cancel</button>
          <button type="submit" class="prompt-confirm" disabled={!text.trim()}><Check size={14} /> {submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
