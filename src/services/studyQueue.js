import { State } from "ts-fsrs";

export function getStudyQueueCounts(cards = [], now = new Date(), rolloverHour = 4) {
  const dayStart = new Date(now);
  dayStart.setHours(rolloverHour, 0, 0, 0);
  if (now < dayStart) dayStart.setDate(dayStart.getDate() - 1);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  return cards.reduce((counts, card) => {
    const state = card.fsrs?.state ?? State.New;
    if (!card.fsrs || state === State.New) {
      counts.new += 1;
      return counts;
    }

    if (state !== State.Learning && state !== State.Relearning && state !== State.Review) return counts;

    const due = card.fsrs.due ? new Date(card.fsrs.due) : null;
    const isDueToday = !due || Number.isNaN(due.getTime()) || due < nextDayStart;
    if (!isDueToday) return counts;

    if (state === State.Learning || state === State.Relearning) counts.learning += 1;
    else counts.review += 1;
    return counts;
  }, { new: 0, learning: 0, review: 0 });
}
