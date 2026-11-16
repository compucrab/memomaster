export const DEFAULT_FSRS_SETTINGS = Object.freeze({
  desiredRetention: 0.9,
  learningSteps: ["10m"],
  relearningSteps: ["10m"],
  maximumInterval: 36500,
  rolloverHour: 4,
});

export function normalizeFsrsSettings(value = {}) {
  const retention = Number(value.desiredRetention);
  const maximumInterval = Number(value.maximumInterval);
  const rolloverHour = Number(value.rolloverHour);
  const parseSteps = (steps, fallback) => {
    const values = Array.isArray(steps) ? steps : String(steps || "").split(",");
    const clean = values.map((step) => String(step).trim()).filter((step) => /^\d+(\.\d+)?\s*(s|m|h|d)$/i.test(step));
    return clean.length ? clean : fallback;
  };
  return {
    desiredRetention: Number.isFinite(retention) ? Math.min(0.97, Math.max(0.70, retention)) : DEFAULT_FSRS_SETTINGS.desiredRetention,
    learningSteps: parseSteps(value.learningSteps, DEFAULT_FSRS_SETTINGS.learningSteps),
    relearningSteps: parseSteps(value.relearningSteps, DEFAULT_FSRS_SETTINGS.relearningSteps),
    maximumInterval: Number.isFinite(maximumInterval) ? Math.min(36500, Math.max(1, Math.round(maximumInterval))) : DEFAULT_FSRS_SETTINGS.maximumInterval,
    rolloverHour: Number.isFinite(rolloverHour) ? Math.min(12, Math.max(0, Math.round(rolloverHour))) : DEFAULT_FSRS_SETTINGS.rolloverHour,
  };
}

export function loadFsrsSettings() {
  try {
    const saved = localStorage.getItem("memomaster-fsrs-settings");
    return normalizeFsrsSettings(saved ? JSON.parse(saved) : DEFAULT_FSRS_SETTINGS);
  } catch {
    return DEFAULT_FSRS_SETTINGS;
  }
}

export function saveFsrsSettings(settings) {
  const normalized = normalizeFsrsSettings(settings);
  try { localStorage.setItem("memomaster-fsrs-settings", JSON.stringify(normalized)); } catch {}
  return normalized;
}
