const STORAGE_KEY = "oxifleet:session";

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStorage = (value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};

let session = readStorage();
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getSession = () => session;

export const setSession = (user) => {
  session = user ? { ...user } : null;
  writeStorage(session);
  emit();
};

export const clearSession = () => {
  session = null;
  writeStorage(null);
  emit();
};

export const subscribeSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
