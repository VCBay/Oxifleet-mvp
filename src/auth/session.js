import { setAuthToken } from "../services/httpClient";

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
setAuthToken(session?.token || "");

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const normalizedRoleOrType = (value) =>
  String(value?.type || value?.role || "")
    .toLowerCase()
    .trim();

const isTwoFactorEnabled = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

const isTwoFactorVerified = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

export const getSession = () => session;

export const setSession = (user) => {
  session = user ? { ...user } : null;
  setAuthToken(session?.token || "");
  writeStorage(session);
  emit();
};

export const clearSession = () => {
  session = null;
  setAuthToken("");
  writeStorage(null);
  emit();
};

export const subscribeSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isDriverSession = (value) => normalizedRoleOrType(value) === "driver";

export const isPosSession = (value) =>
  ["pos", "pos-admin", "pos-sample", "pos_admin"].includes(normalizedRoleOrType(value));

export const isAdminSession = (value) =>
  ["super-admin", "super_admin"].includes(normalizedRoleOrType(value));

export const requiresTwoFactorSetup = (value) =>
  Boolean(value) && !isTwoFactorEnabled(value?.is2fauth);

export const requiresTwoFactorVerification = (value) =>
  Boolean(value) &&
  isTwoFactorEnabled(value?.is2fauth) &&
  !isTwoFactorVerified(value?.twoFactorVerified);

export const getPostTwoFactorRoute = (value) => {
  if (isAdminSession(value)) {
    return "/admin/dashboard/overview";
  }
  if (isDriverSession(value)) {
    if (value?.requiresProfileCompletion) {
      return "/driver-dashboard/profile";
    }
    return "/driver-dashboard/overview";
  }
  if (isPosSession(value)) {
    return "/pos-dashboard";
  }
  return "/dashboard";
};

export const getDefaultRouteForSession = (value) => {
  if (requiresTwoFactorSetup(value)) {
    return "/two-factor-auth";
  }

  if (requiresTwoFactorVerification(value)) {
    return "/two-factor-verify";
  }

  return getPostTwoFactorRoute(value);
};


