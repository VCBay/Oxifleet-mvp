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

let state = {
  baseDriverCount: BASE_DRIVER_COUNT,
  drivers: readStorage(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getDriverState = () => state;

export const addDriver = (driver) => {
  const trimmed = {
    id: driver.id?.trim(),
    name: driver.name?.trim(),
    email: driver.email?.trim(),
    phone: driver.phone?.trim(),
    license: driver.license?.trim(),
    status: driver.status?.trim() || "Active",
    notes: driver.notes?.trim(),
  };

  const nextDriver = {
    id: trimmed.id || createDriverId(),
    name: trimmed.name || "Unnamed driver",
    email: trimmed.email || "unknown@oxifleet.com",
    phone: trimmed.phone || "N/A",
    license: trimmed.license || "N/A",
    status: trimmed.status,
    notes: trimmed.notes || "",
    createdAt: new Date().toISOString(),
  };

  const nextDrivers = [...state.drivers, nextDriver];
  state = {
    ...state,
    drivers: nextDrivers,
  };
  writeStorage(nextDrivers);
  emit();
  return nextDriver;
};

export const subscribeDrivers = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
