import { ArrowLeft, FileText, BookOpen } from "lucide-preact";
import MarkdownCard from "./MarkdownCard";

const starterMarkdown = `# Welcome to your notebook

This is a **Markdown card**. Use it to collect explanations, examples, and ideas worth revisiting.

## A simple place to begin

- Write in Markdown
- Keep each card focused on one idea
- Organise your notes as your knowledge grows

> Good notes are not a transcript. They are a tool for thinking.`;

export default function NotebookView({ notebook, onUpdate, onBack }) {
  const markdown = notebook.markdown ?? starterMarkdown;

  return (
    <section class="workspace notebook-workspace">
      <button class="back-link" onClick={onBack}>
        <ArrowLeft size={14} /> ALL NOTEBOOKS
      </button>

      <div class="notebook-detail-head">
        <i data-color={notebook.color} />
        <div>
          <p class="eyebrow">NOTEBOOK / COLLECTION</p>
          <h1>{notebook.title}</h1>
          <input
            value={notebook.description}
            onInput={(event) => onUpdate({ description: event.currentTarget.value })}
            aria-label="Notebook description"
          />
        </div>
      </div>

      <div class="notebook-detail-meta">
        <span><BookOpen size={14} /> {notebook.chapters} CHAPTERS</span>
        <span><FileText size={14} /> {notebook.cards} CARDS</span>
      </div>

      <div class="notebook-content-grid">
        <div>
          <div class="section-rule">
            <span>QUICK NOTE</span>
            <span>MARKDOWN</span>
          </div>
          <MarkdownCard
            markdown={markdown}
            onChange={(value) => onUpdate({ markdown: value })}
          />
        </div>

        <aside class="notebook-aside">
          <p class="eyebrow">GETTING STARTED</p>
          <h3>Build your knowledge, one idea at a time.</h3>
          <p>Cards contain Markdown content. Keep each card focused on one idea.</p>
          <span class="coming-soon">CARD ORGANISATION · COMING NEXT</span>
        </aside>
      </div>
    </section>
  );
}
