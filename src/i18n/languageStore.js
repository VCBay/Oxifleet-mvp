const STORAGE_KEY = "oxifleet:language";
const SUPPORTED_LANGUAGES = new Set(["en", "de"]);

const normalizeLanguage = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : "de";
};

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return "de";
  }
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "de";
  }
};

const writeStorage = (value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage write failures.
  }
};

let language = readStorage();
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getLanguage = () => language;

export const setLanguage = (nextLanguage) => {
  const normalized = normalizeLanguage(nextLanguage);
  if (normalized === language) {
    return language;
  }
  language = normalized;
  writeStorage(language);
  emit();
  return language;
};

export const subscribeLanguage = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

