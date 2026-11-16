import { useState } from "preact/hooks";
import { ArrowLeft, Check, Plus } from "lucide-preact";
import RichTextEditor from "./RichTextEditor";

export default function CardEditor({ card, chapters = [], onSave, onCancel, onAddChapter, onAddTopic }) {
  const [draft, setDraft] = useState(() => ({ ...card }));
  const [side, setSide] = useState("front");
  const selectedChapter = chapters.find((chapter) => chapter.id === draft.chapterId);
  const topics = selectedChapter?.topics ?? [];

  function update(changes) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  return (
    <section class="card-editor-page">
      <header class="card-editor-header">
        <button class="back-link" onClick={onCancel}><ArrowLeft size={14} /> BACK TO CARD</button>
        <div class="card-editor-heading"><h1>Edit card</h1><span>QUESTION AND ANSWER</span></div>
        <button class="study-primary" onClick={() => onSave(draft)}><Check size={15} /> Save card</button>
      </header>

      <div class="card-editor-body">
        <div class="card-editor-tabs" role="tablist" aria-label="Card content">
          <button type="button" role="tab" aria-selected={side === "front"} class={side === "front" ? "is-active" : ""} onClick={() => setSide("front")}>Question</button>
          <button type="button" role="tab" aria-selected={side === "back"} class={side === "back" ? "is-active" : ""} onClick={() => setSide("back")}>Answer</button>
        </div>

        <div class="card-editor-writing">
          {side === "front" ? (
            <RichTextEditor key="front" label="QUESTION" value={draft.front} placeholder="Write your question..." onChange={(front) => update({ front })} />
          ) : (
            <RichTextEditor key="back" label="ANSWER" value={draft.back} placeholder="Write your answer..." onChange={(back) => update({ back })} />
          )}
        </div>

        <div class="card-editor-organization">
          <label>CHAPTER
            <select value={draft.chapterId || ""} onChange={(event) => update({ chapterId: event.currentTarget.value, topicId: "" })}>
              <option value="">Unassigned</option>
              {chapters.map((chapter) => <option value={chapter.id}>{chapter.name}</option>)}
            </select>
          </label>
          <button class="card-add-structure" type="button" onClick={onAddChapter}><Plus size={13} /> New chapter</button>
          <label>TOPIC
            <select value={draft.topicId || ""} disabled={!selectedChapter} onChange={(event) => update({ topicId: event.currentTarget.value })}>
              <option value="">Unassigned</option>
              {topics.map((topic) => <option value={topic.id}>{topic.name}</option>)}
            </select>
          </label>
          <button class="card-add-structure" type="button" disabled={!selectedChapter} onClick={() => onAddTopic(draft.chapterId)}><Plus size={13} /> New topic</button>
        </div>
      </div>
    </section>
  );
}
