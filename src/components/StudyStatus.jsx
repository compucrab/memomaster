import { useMemo } from "preact/hooks";
import { ArrowLeft, BookOpen, CalendarDays, Clock3, Flame, Layers3, Target } from "lucide-preact";

const DAY = 86400000;
const dateKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formatDay = (d) => new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(d);

function streaks(activity, today) {
  let current = 0, cursor = new Date(today);
  if (!activity.has(dateKey(cursor))) cursor.setDate(cursor.getDate()-1);
  while (activity.has(dateKey(cursor))) { current++; cursor.setDate(cursor.getDate()-1); }
  let longest = 0, run = 0, previous = null;
  for (const key of [...activity.keys()].sort()) {
    const date = new Date(`${key}T00:00:00`);
    run = previous && date.getTime()-previous.getTime()===DAY ? run+1 : 1;
    longest = Math.max(longest,run); previous = date;
  }
  return {current,longest};
}

export default function StudyStatus({ notebooks, onBack }) {
  const data = useMemo(() => {
    const history = notebooks.flatMap(n => (n.reviewHistory||[]).map(log=>({...log,notebookId:n.id})));
    const activity = new Map();
    history.forEach(log => { if(log.review){const key=dateKey(log.review);activity.set(key,(activity.get(key)||0)+1);} });
    const today = dayStart(new Date()), cards = notebooks.flatMap(n=>n.flashcards||[]);
    const streak = streaks(activity,today);
    const ratings = history.reduce((a,l)=>{a[l.rating]=(a[l.rating]||0)+1;return a;},{});
    const daysStart = new Date(today); daysStart.setDate(daysStart.getDate()-363); daysStart.setDate(daysStart.getDate()-daysStart.getDay());
    const days = Array.from({length:371},(_,i)=>{const date=new Date(daysStart);date.setDate(daysStart.getDate()+i);return {date,count:activity.get(dateKey(date))||0};});
    const maxCount=Math.max(1,...days.map(d=>d.count));
    const endOfToday = new Date(today); endOfToday.setDate(endOfToday.getDate() + 1);
    const upcoming=Array.from({length:7},(_,i)=>{const date=new Date(today);date.setDate(date.getDate()+i);return {date,count:cards.filter(c=>{if(!c.fsrs?.due)return i===0;const dueDate=new Date(c.fsrs.due);return i===0?dueDate<endOfToday:dateKey(dueDate)===dateKey(date);}).length};});
    const remembered=(ratings.easy||0)+(ratings.difficult||0);
    return {history,activity,ratings,days,maxCount,upcoming,cards,streak,remembered,activeDays:activity.size,
      recall:history.length?Math.round(remembered/history.length*100):0,
      due:cards.filter(c=>!c.fsrs?.due||new Date(c.fsrs.due)<=new Date()).length};
  },[notebooks]);
  const learned=data.cards.filter(c=>(c.fsrs?.reps||0)>0).length;
  const months=data.days.filter(d=>d.date.getDate()===1).map(d=>({label:new Intl.DateTimeFormat(undefined,{month:"short"}).format(d.date),offset:Math.floor((d.date-data.days[0].date)/DAY/7)}));

  return <section class="workspace status-workspace">
    <header class="status-heading"><button class="back-link" onClick={onBack}><ArrowLeft size={14}/> LIBRARY</button><div><h1>Study status</h1><p>Your learning activity and retention at a glance.</p></div></header>
    <div class="status-stats-grid">
      <article class="status-stat"><span><Flame size={15}/> CURRENT STREAK</span><strong>{data.streak.current} <small>days</small></strong><p>Longest: {data.streak.longest} days</p></article>
      <article class="status-stat"><span><CalendarDays size={15}/> REVIEWS</span><strong>{data.history.length.toLocaleString()}</strong><p>{data.activeDays} active days</p></article>
      <article class="status-stat"><span><Target size={15}/> RECALL RATE</span><strong>{data.recall}<small>%</small></strong><p>Difficult or Easy responses</p></article>
      <article class="status-stat"><span><Layers3 size={15}/> CARDS REVIEWED</span><strong>{learned}<small> / {data.cards.length}</small></strong><p>{data.due} due now</p></article>
    </div>
    <section class="status-panel consistency-panel">
      <div class="status-panel-heading"><div><h2>Consistency</h2><p>Daily reviews over the last year</p></div><span>{data.activeDays} active days</span></div>
      <div class="heatmap-scroll"><div class="heatmap-months">{months.map(m=><span style={{gridColumn:m.offset+1}}>{m.label}</span>)}</div><div class="heatmap">
        {data.days.map(day=>{const level=day.count?Math.min(4,Math.ceil(day.count/data.maxCount*4)):0;return <i key={dateKey(day.date)} class={`heatmap-cell level-${level}`} title={`${day.count} reviews · ${formatDay(day.date)}`}/>;})}
      </div></div>
      <div class="heatmap-legend"><span>Less</span>{[0,1,2,3,4].map(level=><i class={`heatmap-cell level-${level}`}/>)}<span>More</span></div>
    </section>
    <div class="status-two-column">
      <section class="status-panel"><div class="status-panel-heading"><div><h2>Review outcomes</h2><p>How each review felt</p></div></div>
        <div class="outcome-list">{[["Easy",data.ratings.easy||0,"easy"],["Difficult",data.ratings.difficult||0,"difficult"],["Forgot",data.ratings.forgot||0,"forgot"]].map(([label,count,kind])=><div class="outcome-row"><span>{label}</span><div><i class={kind} style={{width:`${data.history.length?count/data.history.length*100:0}%`}}/></div><strong>{count}</strong></div>)}</div>
        <p class="status-footnote">Recall rate counts Difficult and Easy responses as remembered.</p>
      </section>
      <section class="status-panel"><div class="status-panel-heading"><div><h2>Upcoming reviews</h2><p>Cards scheduled by day</p></div><Clock3 size={16}/></div>
        <div class="upcoming-list">{data.upcoming.map((item,i)=><div class="upcoming-row"><span>{i===0?"Today":i===1?"Tomorrow":formatDay(item.date)}</span><strong>{item.count}</strong></div>)}</div>
      </section>
    </div>
    <section class="status-panel notebook-progress-panel"><div class="status-panel-heading"><div><h2>Notebook progress</h2><p>Cards reviewed and waiting in each notebook</p></div><BookOpen size={16}/></div>
      {notebooks.length?<div class="notebook-progress-list">{notebooks.map(n=>{const cards=n.flashcards||[],done=cards.filter(c=>(c.fsrs?.reps||0)>0).length,due=cards.filter(c=>!c.fsrs?.due||new Date(c.fsrs.due)<=new Date()).length,pct=cards.length?Math.round(done/cards.length*100):0;return <div class="notebook-progress-row"><div class="notebook-progress-title"><strong>{n.title}</strong><span>{done}/{cards.length} reviewed · {due} due</span></div><div class="notebook-progress-track"><i style={{width:`${pct}%`}}/></div></div>;})}</div>:<p class="status-empty">Create a notebook and add cards to start tracking progress.</p>}
    </section>
  </section>;
}
