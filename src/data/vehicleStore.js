const STORAGE_KEY = "oxifleet:vehicles";
const BASE_VEHICLE_COUNT = 24;

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

const createVehicleId = () =>
  `VH-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

let state = {
  baseVehicleCount: BASE_VEHICLE_COUNT,
  vehicles: readStorage(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getVehicleState = () => state;

export const addVehicle = (vehicle) => {
  const trimmed = {
    id: vehicle.id?.trim(),
    model: vehicle.model?.trim(),
    plate: vehicle.plate?.trim(),
    type: vehicle.type?.trim(),
    status: vehicle.status?.trim() || "Active",
    notes: vehicle.notes?.trim(),
  };

  const nextVehicle = {
    id: trimmed.id || createVehicleId(),
    model: trimmed.model || "Unknown model",
    plate: trimmed.plate || "N/A",
    type: trimmed.type || "Truck",
    status: trimmed.status,
    notes: trimmed.notes || "",
    createdAt: new Date().toISOString(),
  };

  const nextVehicles = [...state.vehicles, nextVehicle];
  state = {
    ...state,
    vehicles: nextVehicles,
  };
  writeStorage(nextVehicles);
  emit();
  return nextVehicle;
};

export const subscribeVehicles = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
