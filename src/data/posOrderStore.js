const STORAGE_KEY = "oxifleet:pos-orders";

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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};

const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAttachment = (file = {}) => ({
  name: String(file.name || "document").trim() || "document",
  size: toNumber(file.size),
  type: String(file.type || "application/octet-stream"),
});

const normalizePartItem = (item = {}) => {
  const qty = Math.max(0, toNumber(item.qty || 0));
  const unitCost = Math.max(0, toNumber(item.unitCost || 0));
  return {
    id: String(item.id || createId("PART")).trim(),
    name: String(item.name || "Part item").trim() || "Part item",
    qty,
    unitCost,
    total: Math.round(qty * unitCost),
  };
};

const normalizeLabourItem = (item = {}) => {
  const hours = Math.max(0, toNumber(item.hours || 0));
  const rate = Math.max(0, toNumber(item.rate || 0));
  return {
    id: String(item.id || createId("LAB")).trim(),
    name: String(item.name || "Labour item").trim() || "Labour item",
    hours,
    rate,
    total: Math.round(hours * rate),
  };
};

const normalizeOrder = (order = {}, forcedStatus) => {
  const parts = Array.isArray(order.parts) ? order.parts.map(normalizePartItem) : [];
  const labour = Array.isArray(order.labour)
    ? order.labour.map(normalizeLabourItem)
    : [];
  const partsTotal = parts.reduce((sum, item) => sum + item.total, 0);
  const labourTotal = labour.reduce((sum, item) => sum + item.total, 0);
  const attachments = Array.isArray(order.attachments)
    ? order.attachments.map(normalizeAttachment)
    : [];
  const status = forcedStatus || String(order.status || "Draft").trim() || "Draft";
  const createdAt = order.createdAt || new Date().toISOString();
  return {
    id: String(order.id || createId("POSO")).trim(),
    status,
    vehicleId: String(order.vehicleId || "").trim(),
    vehiclePlate: String(order.vehiclePlate || "").trim(),
    serviceType: String(order.serviceType || "General service").trim(),
    problemType: String(order.problemType || "").trim(),
    description: String(order.description || "").trim(),
    priority: String(order.priority || "Normal").trim(),
    parts,
    labour,
    attachments,
    notes: String(order.notes || "").trim(),
    submittedBy: String(order.submittedBy || "").trim(),
    partsTotal,
    labourTotal,
    total: Math.round(partsTotal + labourTotal),
    createdAt,
    updatedAt: new Date().toISOString(),
    submittedAt:
      status === "Submitted"
        ? order.submittedAt || new Date().toISOString()
        : "",
  };
};

const defaultOrderState = {
  draftOrders: [],
  submittedOrders: [],
};

const normalizeState = (value = {}) => ({
  draftOrders: Array.isArray(value.draftOrders)
    ? value.draftOrders.map((order) => normalizeOrder(order, "Draft"))
    : defaultOrderState.draftOrders,
  submittedOrders: Array.isArray(value.submittedOrders)
    ? value.submittedOrders.map((order) => normalizeOrder(order, "Submitted"))
    : defaultOrderState.submittedOrders,
});

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    writeStorage(normalized);
    return normalized;
  }
  writeStorage(defaultOrderState);
  return defaultOrderState;
};

let state = initializeState();
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateState = (nextState) => {
  state = normalizeState(nextState);
  writeStorage(state);
  emit();
};

export const getPosOrderState = () => state;

export const savePosOrderDraft = (order) => {
  const normalized = normalizeOrder(order, "Draft");
  const existingIndex = state.draftOrders.findIndex((item) => item.id === normalized.id);
  const nextDraftOrders = [...state.draftOrders];
  if (existingIndex >= 0) {
    nextDraftOrders[existingIndex] = normalized;
  } else {
    nextDraftOrders.unshift(normalized);
  }
  updateState({
    ...state,
    draftOrders: nextDraftOrders,
  });
  return normalized;
};

export const deletePosOrderDraft = (draftId) => {
  const targetId = String(draftId || "").trim();
  if (!targetId) {
    return false;
  }
  const nextDraftOrders = state.draftOrders.filter((item) => item.id !== targetId);
  if (nextDraftOrders.length === state.draftOrders.length) {
    return false;
  }
  updateState({
    ...state,
    draftOrders: nextDraftOrders,
  });
  return true;
};

export const submitPosOrder = (order, submittedBy = "") => {
  const normalized = normalizeOrder(
    {
      ...order,
      submittedBy,
      submittedAt: new Date().toISOString(),
    },
    "Submitted"
  );

  const nextSubmitted = [normalized, ...state.submittedOrders];
  const nextDrafts = state.draftOrders.filter((item) => item.id !== normalized.id);

  updateState({
    ...state,
    draftOrders: nextDrafts,
    submittedOrders: nextSubmitted,
  });
  return normalized;
};

export const duplicateSubmittedPosOrder = (orderId) => {
  const targetId = String(orderId || "").trim();
  if (!targetId) {
    return null;
  }
  const source = state.submittedOrders.find((item) => item.id === targetId);
  if (!source) {
    return null;
  }
  const duplicate = normalizeOrder(
    {
      ...source,
      id: createId("POSO"),
      status: "Draft",
      createdAt: new Date().toISOString(),
      submittedAt: "",
    },
    "Draft"
  );
  updateState({
    ...state,
    draftOrders: [duplicate, ...state.draftOrders],
  });
  return duplicate;
};

export const subscribePosOrders = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
