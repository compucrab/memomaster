import { useMemo } from "preact/hooks";
import { ArrowLeft, Target, Clock3, Brain, TrendingUp, AlertCircle } from "lucide-preact";
import { State } from "ts-fsrs";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const studyDayKey = (value, rolloverHour) => {
  const date = new Date(value);
  date.setHours(date.getHours() - rolloverHour);
  return dateKey(date);
};
const monthKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

function classify(card) {
  if (!card.fsrs || card.fsrs.state === State.New || !(card.fsrs.reps > 0)) return "new";
  if (card.fsrs.state === State.Learning || card.fsrs.state === State.Relearning) return "learning";
  return (card.fsrs.scheduled_days || 0) >= 21 ? "mature" : "young";
}

export default function StudyStatus({ notebooks, settings, onBack }) {
  const data = useMemo(() => {
    const history = notebooks.flatMap(n => (n.reviewHistory || []).map(log => ({ ...log, notebookTitle: n.title })));
    const cards = notebooks.flatMap(n => (n.flashcards || []).map(card => ({ ...card, notebookTitle: n.title })));
    const validHistory = history.filter(log => log.review && ["forgot","difficult","good","easy"].includes(log.rating));
    const countedHistory = validHistory.filter(log => Number(log.nextFsrs?.scheduled_days) > 1);
    const ratings = countedHistory.reduce((result, log) => { result[log.rating] = (result[log.rating] || 0) + 1; return result; }, {});
    const remembered = (ratings.difficult || 0) + (ratings.good || 0) + (ratings.easy || 0);
    const now = new Date();
    const retention = countedHistory.length ? remembered / countedHistory.length : null;
    const monthCursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + index, 1);
      const logs = countedHistory.filter(log => monthKey(log.review) === monthKey(date));
      const passes = logs.filter(log => log.rating !== "forgot").length;
      return { label: date.toLocaleDateString(undefined, { month: "short" }), count: logs.length, retention: logs.length ? passes / logs.length : null };
    });
    const rollover = settings?.rolloverHour ?? 4;
    const firstStudyDay = new Date(now);
    firstStudyDay.setHours(rollover, 0, 0, 0);
    if (now < firstStudyDay) firstStudyDay.setDate(firstStudyDay.getDate() - 1);
    const workload = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(firstStudyDay);
      date.setDate(firstStudyDay.getDate() + index);
      const key = studyDayKey(date, rollover);
      return { key, label: index === 0 ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 };
    });
    const workloadIndex = new Map(workload.map((item, index) => [item.key, index]));
    cards.forEach(card => {
      if (!card.fsrs || card.fsrs.state === State.New) return;
      const due = card.fsrs.due ? new Date(card.fsrs.due) : null;
      if (!due || Number.isNaN(due.getTime())) return;
      const dueKey = studyDayKey(due < now ? now : due, rollover);
      const index = workloadIndex.get(dueKey);
      if (index !== undefined) workload[index].count++;
    });
    const breakdown = { new: 0, learning: 0, young: 0, mature: 0 };
    cards.forEach(card => breakdown[classify(card)]++);
    const forgotten = cards.filter(card => (card.fsrs?.lapses || 0) > 0)
      .sort((a,b) => (b.fsrs?.lapses || 0) - (a.fsrs?.lapses || 0))
      .slice(0, 8);
    const dueNow = workload[0]?.count || 0;
    return { countedHistory, ratings, remembered, retention, monthly, workload, breakdown, forgotten, cards, dueNow };
  }, [notebooks, settings]);

  const maxWorkload = Math.max(1, ...data.workload.map(item => item.count));
  const monthlyPoints = data.monthly.map((item,index) => item.retention === null ? null : `${(index / 11) * 500},${90 - item.retention * 70}`).filter(Boolean).join(" ");
  const target = settings?.desiredRetention ?? 0.9;
  const retentionDelta = data.retention === null ? null : Math.round((data.retention - target) * 100);

  return (
    <section class="workspace status-workspace">
      <header class="status-heading"><button class="back-link" onClick={onBack}><ArrowLeft size={14}/> LIBRARY</button><div><h1>Retention & memory</h1><p>How well your cards are retained, and what needs attention.</p></div></header>
      <div class="status-stats-grid">
        <article class="status-stat"><span><Target size={15}/> ACTUAL RETENTION</span><strong>{data.retention === null ? "—" : `${Math.round(data.retention * 100)}%`}</strong><p>{data.retention === null ? "Complete reviews to measure retention" : `${retentionDelta >= 0 ? "+" : ""}${retentionDelta} points vs ${Math.round(target * 100)}% target`}</p></article>
        <article class="status-stat"><span><Brain size={15}/> CARDS TRACKED</span><strong>{data.cards.length.toLocaleString()}</strong><p>{data.dueNow} due in the current study day</p></article>
        <article class="status-stat"><span><Clock3 size={15}/> REVIEWS OVER 1 DAY</span><strong>{data.countedHistory.length.toLocaleString()}</strong><p>Cards scheduled beyond 1 day</p></article>
        <article class="status-stat"><span><TrendingUp size={15}/> DESIRED RETENTION</span><strong>{Math.round(target * 100)}%</strong><p>Current FSRS target</p></article>
      </div>

      <div class="status-two-column">
        <section class="status-panel">
          <div class="status-panel-heading"><div><h2>Monthly retention</h2><p>Successful recall: Hard, Good and Easy</p></div><span>12 MONTHS</span></div>
          <div class="retention-chart">
            <div class="retention-chart-y"><span>100%</span><span>50%</span><span>0%</span></div>
            <svg viewBox="0 0 500 90" preserveAspectRatio="none" role="img" aria-label="Monthly retention trend">
              <line x1="0" x2="500" y1="20" y2="20"/><line x1="0" x2="500" y1="55" y2="55"/>
              <line class="retention-target-line" x1="0" x2="500" y1={90 - target * 70} y2={90 - target * 70}/>
              {data.monthly.map((item,index) => item.retention === null ? null : <circle cx={(index / 11) * 500} cy={90 - item.retention * 70} r="3.5"/> )}
              {data.monthly.length && <polyline points={monthlyPoints} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
          </div>
          <div class="retention-month-labels">{data.monthly.map(item=><span>{item.label}</span>)}</div>
          <p class="status-footnote">The dashed line represents your desired retention. Months without reviews have no data point.</p>
        </section>
        <section class="status-panel">
          <div class="status-panel-heading"><div><h2>Rating distribution</h2><p>How your recall felt during reviews</p></div></div>
          <div class="outcome-list">{[["Again",data.ratings.forgot || 0,"forgot"],["Hard",data.ratings.difficult || 0,"difficult"],["Good",data.ratings.good || 0,"good"],["Easy",data.ratings.easy || 0,"easy"]].map(([label,count,kind])=><div class="outcome-row"><span>{label}</span><div><i class={kind} style={{width:`${data.countedHistory.length ? count / data.countedHistory.length * 100 : 0}%`}}/></div><strong>{count}</strong></div>)}</div>
          <p class="status-footnote">Only reviews that schedule the card beyond 1 day are included. Short learning and relearning repeats are excluded.</p>
        </section>
      </div>

      <section class="status-panel">
        <div class="status-panel-heading"><div><h2>Upcoming workload</h2><p>Scheduled cards grouped by study day · rollover {String(settings?.rolloverHour ?? 4).padStart(2,"0")}:00</p></div><span>NEXT 30 DAYS</span></div>
        <div class="workload-chart">{data.workload.map((item,index)=><div class="workload-column" title={`${item.label}: ${item.count} cards`}><strong>{item.count || ""}</strong><i style={{height:`${Math.max(2,item.count / maxWorkload * 100)}%`}}/><small>{index % 5 === 0 || index === 29 ? item.label : ""}</small></div>)}</div>
      </section>

      <section class="status-panel">
        <div class="status-panel-heading"><div><h2>Card maturity</h2><p>Learning state and review interval classification</p></div></div>
        <div class="maturity-grid">
          {[
            ["New",data.breakdown.new,"Cards not yet reviewed","new"],
            ["Learning",data.breakdown.learning,"In learning or relearning steps","learning"],
            ["Young",data.breakdown.young,"Graduated, interval under 21 days","young"],
            ["Mature",data.breakdown.mature,"Review interval of 21 days or longer","mature"],
          ].map(([label,count,description,kind])=><article class={`maturity-card ${kind}`}><span>{label.toUpperCase()}</span><strong>{count}</strong><small>{description}</small></article>)}
        </div>
      </section>

      <section class="status-panel">
        <div class="status-panel-heading"><div><h2>Frequently forgotten</h2><p>Cards with the highest recorded lapse count</p></div><AlertCircle size={16}/></div>
        {data.forgotten.length ? <div class="forgotten-list">{data.forgotten.map(card=><div class="forgotten-row"><div><strong>{String(card.front || "Untitled card").replace(/[#>*_\x60]/g,"").trim().split("\n")[0]}</strong><small>{card.notebookTitle}</small></div><span>{card.fsrs.lapses} lapses</span></div>)}</div> : <p class="status-empty">No forgotten cards recorded yet. Again responses will identify cards that need more attention.</p>}
      </section>
    </section>
  );
}
