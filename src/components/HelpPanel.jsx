import { ArrowLeft, BookOpen, Keyboard, Info } from "lucide-preact";

const pages = {
  guide: {
    title: "Getting started",
    intro: "MemoMaster works like Anki: it helps you remember information by turning it into question-and-answer cards and bringing each card back when it is useful to review. You do not need to understand the scheduling system to use it.",
    sections: [
      ["Notebooks keep subjects separate", "Create a notebook for a subject or goal, then open it to manage its cards. For example, you might have separate notebooks for history, programming, or a language."],
      ["Cards are questions and answers", "Write a clear question on the Question side and its answer on the Answer side. Keep one idea per card where possible. Use headings, lists, images, equations, tables, and video links when they help explain the idea."],
      ["Chapters organise cards", "Assign a card to a chapter when you want to group related material. Leave it as Unassigned if you do not need chapters. You can search for a chapter while editing a card."],
      ["Browse to find and edit", "The Browse tab lists your cards. Select a card to preview it, switch between Question and Answer, or choose Edit card to make changes."],
      ["Study to practise remembering", "Open the Study tab and choose Scheduled to review cards that are due, or Unscheduled to practise without changing their schedule. Reveal the answer before rating how well you remembered it."],
      ["Understand the four ratings", "Again means you forgot or could not recall the answer. Hard means you remembered it with difficulty. Good means you recalled it correctly. Easy means it was effortless. MemoMaster uses these ratings to plan future scheduled reviews."],
      ["Your work is saved automatically", "Changes are saved in the app's local library. Use File → Save project to create a portable .memz backup at a location you choose. MemoMaster also creates an automatic backup when you close the app."]
    ]
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    intro: "Shortcuts are available when the relevant notebook, editor, or review screen is active. Text-entry fields keep their normal typing behaviour.",
    sections: [
      ["Notebook", `A — Add a new card
S — Open Study
B — Open Browse
Ctrl + Enter — Save the current card and continue with a new card while editing
Ctrl + D — Open the chapter picker while editing a card`],
      ["Scheduled review", `1 — Again
2 — Hard (difficult)
3 — Good
4 — Easy
Space — Reveal the answer; when it is visible, rate Good`],
      ["Unscheduled practice", "Space — Reveal the answer; when it is visible, mark the card Done."],
      ["Editor", `Ctrl + Space — Open the editor command palette
↑ / ↓ — Move through the command palette or chapter picker
Enter — Choose the highlighted option`],
      ["Application", `Ctrl + , — Open Preferences
Ctrl + S — Save project (.memz) and choose a destination`]
    ]
  },
  about: {
    title: "About MemoMaster",
    intro: "A focused flashcard and spaced-repetition desktop app.",
    sections: [
      ["Application", "MemoMaster"],
      ["Version", "0.1.0"],
      ["Developed by", "CompuCrab"],
      ["Technology", "Built with Tauri, Preact, and FSRS scheduling."],
      ["Project", "An independent project by CompuCrab."]
    ]
  }
};

export default function HelpPanel({ page = "guide", onPageChange, onBack, backLabel = "BACK" }) {
  const current = pages[page] || pages.guide;
  const nav = [
    { id: "guide", label: "User guide", Icon: BookOpen },
    { id: "shortcuts", label: "Shortcuts", Icon: Keyboard },
    { id: "about", label: "About", Icon: Info }
  ];
  return <section class="workspace help-workspace">
    <button class="settings-back" onClick={onBack}><ArrowLeft size={14}/> {backLabel}</button>
    <div class="help-layout">
      <aside class="help-navigation" aria-label="Help pages">
        {nav.map(({ id, label, Icon }) => <button type="button" class={page === id ? "is-active" : ""} onClick={() => onPageChange(id)}><Icon size={15}/>{label}</button>)}
      </aside>
      <article class="help-content">
        <span class="help-eyebrow">MEMOMASTER HELP</span>
        <h1>{current.title}</h1>
        <p class="help-intro">{current.intro}</p>
        <div class="help-sections">
          {current.sections.map(([heading, body]) => <section class="help-section"><h2>{heading}</h2><p>{body}</p></section>)}
        </div>
      </article>
    </div>
  </section>;
}
