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

function formatDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export default function StudyStatus({ notebooks, settings, onBack }) {
  const data = useMemo(() => {
    const now = new Date();
    const activity = getStudyActivity(notebooks, now, settings?.rolloverHour ?? 4);
    return { ...activity, dueCount: getDueCount(notebooks, now) };
  }, [notebooks, settings]);

  const weeks = [];
  for (let index = 0; index < data.days.length; index += 7) weeks.push(data.days.slice(index, index + 7));
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((day) => new Date(`${day.key}T12:00:00`).getDate() === 1);
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
            {weeks.map((week, index) => (
              <div class="activity-week" key={index}>
                {week.map((day) => <span
                  key={day.key}
                  class={`activity-day level-${day.level}`}
                  title={`${formatDate(day.key)} · ${day.sessions} completed ${day.sessions === 1 ? "session" : "sessions"} · ${day.cards} cards`}
                  aria-label={`${formatDate(day.key)}: ${day.sessions} completed sessions, ${day.cards} cards`}
                />)}
              </div>
            ))}
            </div>
          </div>
          <div class="activity-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i class={`activity-day level-${level}`} />)}<span>More</span></div>
        </div>
      </section>

      <section class="status-panel status-next">
        <div><h2>Ready to study?</h2><p>{data.dueCount ? `${data.dueCount.toLocaleString()} new or due cards across your library.` : "You're all caught up. No new or due cards right now."}</p></div>
        <span class="status-due-count">{data.dueCount.toLocaleString()}<small> cards</small></span>
      </section>
    </section>
  );
}
