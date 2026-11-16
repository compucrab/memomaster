import { getMemoryOverview } from "../services/fsrs";

function point(value, width, height) {
  return `${value * width},${height - value * height}`;
}

export default function MemoryOverview({ card, settings }) {
  const memory = getMemoryOverview(card, new Date(), settings);
  if (!memory) return null;
  const width = 320, height = 90;
  const points = memory.curve.map((item) => point(item.probability, width, height)).join(" ");
  const currentX = Math.min(width, Math.max(0, memory.elapsedDays / memory.horizon * width));
  return (
    <section class="memory-overview">
      <div class="memory-overview-heading"><div><h3>Memory</h3><p>FSRS estimate · recall probability is an estimate</p></div><span>{Math.round(memory.retrievability * 100)}% recall</span></div>
      <div class="memory-metrics">
        <div><span>STABILITY · 90% INTERVAL</span><strong>{memory.stability < 1 ? `${Math.round(memory.stability * 24)} hours` : `${memory.stability.toFixed(1)} days`}</strong></div>
        <div><span>DIFFICULTY</span><strong>{memory.difficulty.toFixed(1)} / 10</strong></div>
        <div><span>RETRIEVABILITY</span><strong>{Math.round(memory.retrievability * 100)}%</strong></div>
      </div>
      <div class="memory-curve">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Estimated memory recall probability decays over time">
          {[0.25,0.5,0.75].map((level) => <line x1="0" x2={width} y1={height - level * height} y2={height - level * height} />)}
          <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line class="memory-current-marker" x1={currentX} x2={currentX} y1="0" y2={height}/>
        </svg>
        <div><span>Last review</span><span>+{Math.round(memory.horizon)} days</span></div>
        <small class="memory-curve-legend">Dashed marker: current position</small>
      </div>
      <p class="memory-overview-footnote">{memory.stateLabel} · {memory.lapses} lapses · last reviewed {Math.max(0, Math.floor(memory.elapsedDays))} days ago</p>
    </section>
  );
}
