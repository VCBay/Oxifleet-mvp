const STORAGE_KEY = "oxifleet:drivers";
const BASE_DRIVER_COUNT = 10;

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

const createDriverId = () =>
  `DR-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const clampScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const defaultServiceHistory = (driverId) => {
  const numericId = Number(String(driverId || "").replace(/\D/g, "")) || 0;
  return [
    {
      date: "2026-02-11",
      event: "Pre-trip inspection completed",
      vehicleId: `VH-${600 + (numericId % 200)}`,
    },
    {
      date: "2026-02-06",
      event: "HOS log reviewed",
      vehicleId: `VH-${580 + (numericId % 170)}`,
    },
  ];
};

const normalizeHistoryEntry = (entry) => ({
  date: entry?.date?.trim() || new Date().toISOString().slice(0, 10),
  event: entry?.event?.trim() || "Service update",
  vehicleId: entry?.vehicleId?.trim() || "",
});

const normalizeDriver = (driver = {}) => {
  const id = driver.id?.trim() || createDriverId();
  const activityStatus =
    driver.activityStatus?.trim() || driver.status?.trim() || "Active";
  const complianceScore = clampScore(driver.complianceScore);
  const history = Array.isArray(driver.serviceHistory)
    ? driver.serviceHistory.map(normalizeHistoryEntry)
    : defaultServiceHistory(id);

  return {
    id,
    name: driver.name?.trim() || "Unnamed driver",
    email: driver.email?.trim() || "unknown@oxifleet.com",
    phone: driver.phone?.trim() || "N/A",
    license: driver.license?.trim() || "N/A",
    status: activityStatus,
    activityStatus,
    assignedVehicleId: driver.assignedVehicleId?.trim() || "",
    complianceScore: complianceScore ?? 80,
    accessLevel: driver.accessLevel?.trim() || "Standard",
    notes: driver.notes?.trim() || "",
    serviceHistory: history.slice(0, 5),
    createdAt: driver.createdAt || new Date().toISOString(),
  };
};

let state = {
  baseDriverCount: BASE_DRIVER_COUNT,
  drivers: readStorage().map(normalizeDriver),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getDriverState = () => state;

export const addDriver = (driver) => {
  const nextDriver = normalizeDriver(driver);

  const nextDrivers = [...state.drivers, nextDriver];
  state = {
    ...state,
    drivers: nextDrivers,
  };
  writeStorage(nextDrivers);
  emit();
  return nextDriver;
};

export const updateDriver = (driverId, updates = {}) => {
  const targetId = driverId?.trim();
  if (!targetId) {
    return null;
  }

  let updatedDriver = null;
  const nextDrivers = state.drivers.map((driver) => {
    if (driver.id !== targetId) {
      return driver;
    }
    updatedDriver = normalizeDriver({
      ...driver,
      ...updates,
      id: driver.id,
      createdAt: driver.createdAt,
    });
    return updatedDriver;
  });

  if (!updatedDriver) {
    return null;
  }

  state = {
    ...state,
    drivers: nextDrivers,
  };
  writeStorage(nextDrivers);
  emit();
  return updatedDriver;
};

export const removeDriver = (driverId) => {
  const targetId = driverId?.trim();
  if (!targetId) {
    return false;
  }

  const nextDrivers = state.drivers.filter((driver) => driver.id !== targetId);
  if (nextDrivers.length === state.drivers.length) {
    return false;
  }

  state = {
    ...state,
    drivers: nextDrivers,
  };
  writeStorage(nextDrivers);
  emit();
  return true;
};

export const subscribeDrivers = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
