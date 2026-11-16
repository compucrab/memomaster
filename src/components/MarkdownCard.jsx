import { useState } from "preact/hooks";
import { Eye, PencilLine } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";

export default function MarkdownCard({ markdown, onChange }) {
  const [editing, setEditing] = useState(false);

  return (
    <article class="markdown-card">
      <div class="markdown-card-toolbar">
        <span>UNTITLED CARD <i /></span>
        <div>
          <button
            class={!editing ? "is-selected" : ""}
            onClick={() => setEditing(false)}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            class={editing ? "is-selected" : ""}
            onClick={() => setEditing(true)}
          >
            <PencilLine size={13} /> Edit
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          class="markdown-editor"
          value={markdown}
          onInput={(event) => onChange(event.currentTarget.value)}
          spellcheck="false"
        />
      ) : (
        <div
          class="markdown-prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
        />
      )}
    </article>
  );
}
