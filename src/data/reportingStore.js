const STORAGE_KEY = "oxifleet:report-schedules";

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};

const createScheduleId = () =>
  `RPT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const parseRecipients = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizeSchedule = (schedule = {}) => ({
  id: String(schedule.id || createScheduleId()).trim(),
  name: String(schedule.name || "Scheduled report").trim() || "Scheduled report",
  reportType:
    String(schedule.reportType || "Service spending report").trim() ||
    "Service spending report",
  frequency: String(schedule.frequency || "Weekly").trim() || "Weekly",
  runAt: String(schedule.runAt || "08:00").trim() || "08:00",
  recipients: parseRecipients(schedule.recipients),
  active: schedule.active !== false,
  createdAt: schedule.createdAt || new Date().toISOString(),
});

const getDefaultSchedules = () => [
  normalizeSchedule({
    id: "RPT-DEMO-001",
    name: "Weekly Fleet Finance Summary",
    reportType: "Service spending report",
    frequency: "Weekly",
    runAt: "09:00",
    recipients: ["finance@oxifleet.com", "ops@oxifleet.com"],
    active: true,
  }),
  normalizeSchedule({
    id: "RPT-DEMO-002",
    name: "Monthly Compliance Review",
    reportType: "Policy compliance report",
    frequency: "Monthly",
    runAt: "10:30",
    recipients: ["compliance@oxifleet.com"],
    active: true,
  }),
];

const ensureSeedSchedules = (existingSchedules) => {
  const normalizedExisting = existingSchedules.map(normalizeSchedule);
  const defaultSchedules = getDefaultSchedules().map(normalizeSchedule);
  const existingIds = new Set(
    normalizedExisting.map((schedule) => String(schedule?.id || "").trim())
  );
  const missingDefaults = defaultSchedules.filter(
    (schedule) => !existingIds.has(String(schedule?.id || "").trim())
  );

  if (missingDefaults.length === 0) {
    return normalizedExisting;
  }

  const merged = [...missingDefaults, ...normalizedExisting];
  writeStorage(merged);
  return merged;
};

const initializeSchedules = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return ensureSeedSchedules(stored);
  }
  const defaults = getDefaultSchedules().map(normalizeSchedule);
  writeStorage(defaults);
  return defaults;
};

let state = {
  schedules: initializeSchedules(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateSchedules = (nextSchedules) => {
  state = {
    ...state,
    schedules: nextSchedules.map(normalizeSchedule),
  };
  writeStorage(state.schedules);
  emit();
};

export const getReportingState = () => state;

export const addReportSchedule = (schedule) => {
  const nextSchedule = normalizeSchedule(schedule);
  updateSchedules([...state.schedules, nextSchedule]);
  return nextSchedule;
};

export const removeReportSchedule = (scheduleId) => {
  const targetId = String(scheduleId || "").trim();
  if (!targetId) {
    return false;
  }
  const next = state.schedules.filter((schedule) => schedule.id !== targetId);
  if (next.length === state.schedules.length) {
    return false;
  }
  updateSchedules(next);
  return true;
};

export const toggleReportSchedule = (scheduleId) => {
  const targetId = String(scheduleId || "").trim();
  if (!targetId) {
    return null;
  }
  let updated = null;
  const next = state.schedules.map((schedule) => {
    if (schedule.id !== targetId) {
      return schedule;
    }
    updated = {
      ...schedule,
      active: !schedule.active,
    };
    return updated;
  });
  if (!updated) {
    return null;
  }
  updateSchedules(next);
  return updated;
};

export const subscribeReporting = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
