export function studyDayKey(value, rolloverHour = 4) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(date.getHours() - rolloverHour);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftKey(key, amount) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getStudyActivity(notebooks = [], now = new Date(), rolloverHour = 4) {
  const sessions = notebooks.flatMap((notebook) => notebook.studySessions || []);
  const activity = new Map();

  sessions.forEach((session) => {
    if (!session.completedAt || !(Number(session.reviewedCards) > 0)) return;
    const key = studyDayKey(session.completedAt, rolloverHour);
    if (!key) return;
    const item = activity.get(key) || { sessions: 0, cards: 0 };
    item.sessions += 1;
    item.cards += Number(session.reviewedCards) || 0;
    activity.set(key, item);
  });

  const today = studyDayKey(now, rolloverHour);
  const todayDate = dateFromKey(today);
  const rangeStart = dateFromKey(shiftKey(today, -363));
  rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay());
  const rangeEnd = new Date(todayDate);
  rangeEnd.setDate(rangeEnd.getDate() + (6 - rangeEnd.getDay()));
  const days = [];
  for (const date = new Date(rangeStart); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const value = activity.get(key) || { sessions: 0, cards: 0 };
    days.push({
      key,
      ...value,
      empty: key < shiftKey(today, -363) || key > today,
      level: value.cards === 0 ? 0 : value.cards < 5 ? 1 : value.cards < 15 ? 2 : value.cards < 30 ? 3 : 4,
    });
  }

  const activeDays = new Set(activity.keys());
  let streakAnchor = today;
  if (!activeDays.has(today) && activeDays.has(shiftKey(today, -1))) streakAnchor = shiftKey(today, -1);
  let currentStreak = 0;
  while (activeDays.has(streakAnchor)) {
    currentStreak += 1;
    streakAnchor = shiftKey(streakAnchor, -1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previous = null;
  for (const key of [...activeDays].sort()) {
    runningStreak = previous && shiftKey(previous, 1) === key ? runningStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previous = key;
  }

  return {
    days,
    currentStreak,
    longestStreak,
    completedDays: activeDays.size,
    cardsReviewed: [...activity.values()].reduce((sum, item) => sum + item.cards, 0),
    completedSessions: [...activity.values()].reduce((sum, item) => sum + item.sessions, 0),
  };
}
