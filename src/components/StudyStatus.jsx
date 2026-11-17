import { useMemo } from "preact/hooks";
import { ArrowLeft, Flame, Trophy, CalendarDays, Layers3 } from "lucide-preact";
import { State } from "ts-fsrs";
import { getStudyActivity } from "../services/studyActivity";

function getDueCount(notebooks, now) {
  return notebooks.reduce((total, notebook) => {
    return total + (notebook.flashcards || []).filter((card) => {
      if (!card.fsrs || card.fsrs.state === State.New) return true;
      if (!card.fsrs.due) return false;
      const due = new Date(card.fsrs.due);
      return Number.isNaN(due.getTime()) || due <= now;
    }).length;
  }, 0);
}

function getAttentionItems(notebooks, now) {
  const items = [];
  const addItem = (notebook, label, cards, sessions) => {
    if (!cards.length) return;
    let fresh = 0, due = 0, overdue = 0;
    cards.forEach((card) => {
      if (!card.fsrs || card.fsrs.state === State.New) { fresh += 1; return; }
      if (!card.fsrs.due) return;
      const dueAt = new Date(card.fsrs.due);
      if (Number.isNaN(dueAt.getTime()) || dueAt <= now) {
        due += 1;
        if (!Number.isNaN(dueAt.getTime()) && dueAt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) overdue += 1;
      }
    });
    const lastStudied = sessions.filter((session) => session.completedAt && Number(session.reviewedCards) > 0).map((session) => new Date(session.completedAt)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => b - a)[0] || null;
    if (fresh + due === 0) return;
    items.push({ notebookId: notebook.id, notebook: notebook.title, label, total: cards.length, fresh, due, overdue, lastStudied });
  };
  notebooks.forEach((notebook) => {
    const cards = notebook.flashcards || [];
    const sessions = notebook.studySessions || [];
    addItem(notebook, "Whole notebook", cards, sessions);
    (Array.isArray(notebook.chapters) ? notebook.chapters : []).forEach((chapter) => {
      const chapterCards = cards.filter((card) => card.chapterId === chapter.id);
      const chapterSessions = sessions.filter((session) => session.scopeType === "chapter" && session.chapterId === chapter.id);
      addItem(notebook, chapter.name, chapterCards, chapterSessions);
    });
  });
  return items.sort((a, b) => b.overdue - a.overdue || b.due - a.due || b.fresh - a.fresh || (a.lastStudied?.getTime() || 0) - (b.lastStudied?.getTime() || 0)).slice(0, 8);
}

function formatLastStudied(date) {
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never completed";
}
function formatDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export default function StudyStatus({ notebooks, settings, onBack }) {
  const data = useMemo(() => {
    const now = new Date();
    const activity = getStudyActivity(notebooks, now, settings?.rolloverHour ?? 4);
    return { ...activity, dueCount: getDueCount(notebooks, now), attentionItems: getAttentionItems(notebooks, now) };
  }, [notebooks, settings]);

  const weeks = [];
  for (let index = 0; index < data.days.length; index += 7) weeks.push(data.days.slice(index, index + 7));
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((day) => !day.empty && new Date(`${day.key}T12:00:00`).getDate() === 1);
    return firstOfMonth
      ? new Date(`${firstOfMonth.key}T12:00:00`).toLocaleDateString(undefined, { month: "short" })
      : "";
  });

  return (
    <section class="workspace status-workspace">
      <header class="status-heading">
        <button class="back-link" onClick={onBack}><ArrowLeft size={14} /> LIBRARY</button>
        <div><h1>Study activity</h1><p>Your consistency, progress, and what needs attention.</p></div>
      </header>

      <div class="status-stats-grid">
        <article class="status-stat"><span><Flame size={15} /> CURRENT STREAK</span><strong>{data.currentStreak}<small> days</small></strong><p>Consecutive completed study days</p></article>
        <article class="status-stat"><span><Trophy size={15} /> LONGEST STREAK</span><strong>{data.longestStreak}<small> days</small></strong><p>Your personal best</p></article>
        <article class="status-stat"><span><CalendarDays size={15} /> STUDY DAYS</span><strong>{data.completedDays.toLocaleString()}</strong><p>Days with a completed review</p></article>
        <article class="status-stat"><span><Layers3 size={15} /> CARDS REVIEWED</span><strong>{data.cardsReviewed.toLocaleString()}</strong><p>Across completed sessions</p></article>
      </div>

      <section class="status-panel activity-panel">
        <div class="status-panel-heading"><div><h2>Consistency</h2><p>Each square is a day you completed a notebook or chapter review.</p></div><span>LAST 12 MONTHS</span></div>
        <div class="activity-scroll">
          <div class="activity-months" style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}>
            {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
          </div>
          <div class="activity-graph-wrap">
            <div class="activity-weekday-labels" aria-hidden="true">{["", "Mon", "", "Wed", "", "Fri", ""].map((label) => <span>{label}</span>)}</div>
            <div class="activity-graph" role="img" aria-label="Study consistency over the last 12 months">
              {data.days.map((day) => <span key={day.key} class={`activity-day level-${day.level} ${day.empty ? "empty" : ""}`} title={day.empty ? "" : `${formatDate(day.key)} · ${day.sessions} completed sessions · ${day.cards} cards`} aria-label={day.empty ? "" : `${formatDate(day.key)}: ${day.sessions} sessions, ${day.cards} cards`} />)}
            </div>
          </div>
          <div class="activity-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i class={`activity-day level-${level}`} />)}<span>More</span></div>
        </div>
      </section>

      <section class="status-panel attention-panel">
        <div class="status-panel-heading"><div><h2>Needs attention</h2><p>Notebooks and chapters with cards waiting to be studied.</p></div><span>{data.attentionItems.length} AREAS</span></div>
        {data.attentionItems.length ? (
          <div class="attention-list">
            {data.attentionItems.map((item) => (
              <article class="attention-row" key={item.notebookId + "-" + item.label}>
                <div class="attention-name"><strong>{item.label === "Whole notebook" ? item.notebook : item.label}</strong><small>{item.label === "Whole notebook" ? "Entire notebook" : item.notebook} · {item.total} cards · Last completed: {formatLastStudied(item.lastStudied)}</small></div>
                <div class="attention-counts">{item.overdue > 0 && <span class="attention-overdue">{item.overdue} overdue</span>}{item.due > 0 && <span>{item.due} due</span>}{item.fresh > 0 && <span>{item.fresh} new</span>}</div>
              </article>
            ))}
          </div>
        ) : <p class="attention-empty">Everything is up to date. No notebook or chapter needs attention.</p>}
      </section>
      <section class="status-panel status-next">
        <div><h2>Ready to study?</h2><p>{data.dueCount ? `${data.dueCount.toLocaleString()} new or due cards across your library.` : "You're all caught up. No new or due cards right now."}</p></div>
        <span class="status-due-count">{data.dueCount.toLocaleString()}<small> cards</small></span>
      </section>
    </section>
  );
}
