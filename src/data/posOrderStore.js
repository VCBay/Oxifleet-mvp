import {
  getSeedVehicleSnapshot,
  isLegacySeedVehicleModel,
} from "./seedVehicleCatalog";

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

const normalizeServiceLine = (item = {}) => ({
  id: String(item.id || createId("SRV")).trim(),
  name: String(item.name || "Service line").trim() || "Service line",
  count: Math.max(0, toNumber(item.count || 0)),
  unitPrice: Math.max(0, toNumber(item.unitPrice || 0)),
  favorite: Boolean(item.favorite),
});

const normalizeTyreSelection = (item = {}) => ({
  position: String(item.position || "Position").trim() || "Position",
  action: String(item.action || "Inspect").trim() || "Inspect",
  reason: String(item.reason || "").trim(),
  selectedTyreId: String(item.selectedTyreId || "").trim(),
  selectedTyreLabel: String(item.selectedTyreLabel || "").trim(),
  tyreCode: String(item.tyreCode || "").trim(),
  manufacturer: String(item.manufacturer || "").trim(),
  material: String(item.material || "").trim(),
  seasonality: String(item.seasonality || "").trim(),
  unitPrice: Math.max(0, toNumber(item.unitPrice || 0)),
});

const normalizeOrder = (order = {}, forcedStatus) => {
  const seedVehicle = getSeedVehicleSnapshot(order.vehicleId);
  const parts = Array.isArray(order.parts) ? order.parts.map(normalizePartItem) : [];
  const labour = Array.isArray(order.labour)
    ? order.labour.map(normalizeLabourItem)
    : [];
  const partsTotal = parts.reduce((sum, item) => sum + item.total, 0);
  const labourTotal = labour.reduce((sum, item) => sum + item.total, 0);
  const attachments = Array.isArray(order.attachments)
    ? order.attachments.map(normalizeAttachment)
    : [];
  const tyreSelections = Array.isArray(order.tyreSelections)
    ? order.tyreSelections.map(normalizeTyreSelection)
    : [];
  const serviceLines = Array.isArray(order.serviceLines)
    ? order.serviceLines.map(normalizeServiceLine)
    : [];
  const status = forcedStatus || String(order.status || "Draft").trim() || "Draft";
  const createdAt = order.createdAt || new Date().toISOString();
  const subtotal = Math.max(0, toNumber(order.subtotal || partsTotal + labourTotal));
  const vatRate = toNumber(order.vatRate || 0);
  const vatAmount = Math.max(0, toNumber(order.vatAmount || subtotal * vatRate));
  const grossTotal = Math.max(
    0,
    toNumber(order.total || order.totalGross || subtotal + vatAmount)
  );
  return {
    id: String(order.id || createId("POSO")).trim(),
    status,
    vehicleId: String(order.vehicleId || "").trim(),
    vehiclePlate:
      String(order.vehiclePlate || "").trim() ||
      seedVehicle?.plate ||
      "",
    requestId: String(order.requestId || "").trim(),
    srCode: String(order.srCode || "").trim(),
    driverName: String(order.driverName || "").trim(),
    driverLicense: String(order.driverLicense || "").trim(),
    fleetName: String(order.fleetName || "").trim(),
    checkInDateTime: String(order.checkInDateTime || "").trim(),
    driverOdometerReading: Math.max(0, toNumber(order.driverOdometerReading || 0)),
    driverOdometerUnit:
      String(order.driverOdometerUnit || "km").trim().toLowerCase() === "miles"
        ? "miles"
        : "km",
    verifiedOdometerReading: Math.max(0, toNumber(order.verifiedOdometerReading || 0)),
    verifiedOdometerUnit:
      String(order.verifiedOdometerUnit || "km").trim().toLowerCase() === "miles"
        ? "miles"
        : "km",
    vehicleModel:
      order.vehicleModel && !isLegacySeedVehicleModel(order.vehicleModel)
        ? String(order.vehicleModel).trim()
        : seedVehicle?.model || String(order.vehicleModel || "").trim(),
    serviceType: String(order.serviceType || "General service").trim(),
    problemType: String(order.problemType || "").trim(),
    description: String(order.description || "").trim(),
    priority: String(order.priority || "Normal").trim(),
    parts,
    labour,
    tyreSelections,
    serviceLines,
    attachments,
    notes: String(order.notes || "").trim(),
    submittedBy: String(order.submittedBy || "").trim(),
    partsTotal,
    labourTotal,
    subtotal: Math.round(subtotal),
    vatRate,
    vatAmount: Math.round(vatAmount),
    total: Math.round(grossTotal),
    createdAt,
    updatedAt: new Date().toISOString(),
    submittedAt:
      status === "Submitted"
        ? order.submittedAt || new Date().toISOString()
        : "",
  };
};

const getDefaultOrderState = () => ({
  draftOrders: [
    normalizeOrder(
      {
        id: "POSD-5001",
        vehicleId: "VH-884",
        vehiclePlate: "TX-8841",
        serviceType: "Brake service",
        problemType: "Brake wear indicator",
        description: "Front axle brake pad wear and vibration reported during route.",
        priority: "High",
        parts: [
          { id: "PART-5001", name: "Brake pad set", qty: 1, unitCost: 780 },
          { id: "PART-5002", name: "Brake fluid", qty: 2, unitCost: 38 },
        ],
        labour: [{ id: "LAB-5001", name: "Brake inspection + fitment", hours: 2.5, rate: 120 }],
        attachments: [
          { name: "brake-wear-photo.jpg", size: 184200, type: "image/jpeg" },
          { name: "route-check-report.pdf", size: 312440, type: "application/pdf" },
        ],
        notes: "Draft created by POS advisor for manager review.",
        createdAt: "2026-02-20T09:14:00.000Z",
        updatedAt: "2026-02-20T09:40:00.000Z",
      },
      "Draft"
    ),
    normalizeOrder(
      {
        id: "POSD-5002",
        vehicleId: "VH-241",
        vehiclePlate: "TX-2417",
        serviceType: "Tyre replacement",
        problemType: "Rear axle tyre sidewall cut",
        description: "Replace two rear tyres and perform alignment check.",
        priority: "Emergency",
        parts: [
          { id: "PART-5003", name: "Tyre 11R22.5", qty: 2, unitCost: 445 },
          { id: "PART-5004", name: "Valve stem set", qty: 2, unitCost: 12 },
        ],
        labour: [{ id: "LAB-5002", name: "Tyre fitment + balancing", hours: 1.8, rate: 135 }],
        attachments: [{ name: "tyre-damage-axle2.png", size: 210320, type: "image/png" }],
        notes: "Awaiting supplier confirmation for Michelin stock.",
        createdAt: "2026-02-21T06:48:00.000Z",
        updatedAt: "2026-02-21T07:05:00.000Z",
      },
      "Draft"
    ),
    normalizeOrder(
      {
        id: "POSD-5003",
        vehicleId: "VH-553",
        vehiclePlate: "TX-5532",
        serviceType: "Engine diagnostics",
        problemType: "Intermittent check-engine warning",
        description: "Run fault code scan and inspect injector performance.",
        priority: "Normal",
        parts: [{ id: "PART-5005", name: "Diagnostic consumables", qty: 1, unitCost: 65 }],
        labour: [{ id: "LAB-5003", name: "Diagnostic labor", hours: 2, rate: 145 }],
        attachments: [],
        notes: "Prepared for policy validation before submission.",
        createdAt: "2026-02-22T12:00:00.000Z",
        updatedAt: "2026-02-22T12:00:00.000Z",
      },
      "Draft"
    ),
  ],
  submittedOrders: [
    normalizeOrder(
      {
        id: "POSO-4001",
        vehicleId: "VH-884",
        vehiclePlate: "TX-8841",
        serviceType: "Brake service",
        problemType: "Brake performance drop",
        description: "Front brake pad and rotor service.",
        priority: "High",
        parts: [
          { id: "PART-4101", name: "Brake pad set", qty: 1, unitCost: 820 },
          { id: "PART-4102", name: "Rotor kit", qty: 1, unitCost: 320 },
        ],
        labour: [{ id: "LAB-4101", name: "Brake service labor", hours: 2.4, rate: 130 }],
        attachments: [{ name: "inspection-proof.jpg", size: 164220, type: "image/jpeg" }],
        notes: "Submitted from POS queue.",
        submittedBy: "POS Supervisor",
        createdAt: "2026-01-10T09:20:00.000Z",
        updatedAt: "2026-01-10T10:05:00.000Z",
        submittedAt: "2026-01-10T10:05:00.000Z",
      },
      "Submitted"
    ),
    normalizeOrder(
      {
        id: "POSO-4002",
        vehicleId: "VH-241",
        vehiclePlate: "TX-2417",
        serviceType: "Tyre replacement",
        problemType: "Rear axle tyre failure",
        description: "Replace rear pair and perform balancing.",
        priority: "Emergency",
        parts: [
          { id: "PART-4201", name: "Tyre 11R22.5", qty: 2, unitCost: 455 },
          { id: "PART-4202", name: "Balance weights", qty: 2, unitCost: 20 },
        ],
        labour: [{ id: "LAB-4201", name: "Tyre fitment labor", hours: 2.2, rate: 140 }],
        attachments: [{ name: "axle2-cut.jpg", size: 248100, type: "image/jpeg" }],
        notes: "Roadside emergency replacement case.",
        submittedBy: "POS Supervisor",
        createdAt: "2026-01-24T14:18:00.000Z",
        updatedAt: "2026-01-24T14:56:00.000Z",
        submittedAt: "2026-01-24T14:56:00.000Z",
      },
      "Submitted"
    ),
    normalizeOrder(
      {
        id: "POSO-4003",
        vehicleId: "VH-553",
        vehiclePlate: "TX-5532",
        serviceType: "Engine diagnostics",
        problemType: "Engine warning light",
        description: "Fault code diagnostics and electrical inspection.",
        priority: "Normal",
        parts: [{ id: "PART-4301", name: "Diagnostic kit usage", qty: 1, unitCost: 90 }],
        labour: [{ id: "LAB-4301", name: "Diagnostic labor", hours: 2.5, rate: 150 }],
        attachments: [{ name: "ecu-log.txt", size: 9022, type: "text/plain" }],
        notes: "Pending manager approval due to repeated issue.",
        submittedBy: "POS Advisor",
        createdAt: "2026-02-03T08:15:00.000Z",
        updatedAt: "2026-02-03T08:42:00.000Z",
        submittedAt: "2026-02-03T08:42:00.000Z",
      },
      "Submitted"
    ),
    normalizeOrder(
      {
        id: "POSO-4004",
        vehicleId: "VH-901",
        vehiclePlate: "TX-9014",
        serviceType: "Oil change",
        problemType: "Scheduled maintenance",
        description: "Routine service with filter replacement.",
        priority: "Normal",
        parts: [{ id: "PART-4401", name: "Engine oil + filter", qty: 1, unitCost: 210 }],
        labour: [{ id: "LAB-4401", name: "Routine service labor", hours: 1.3, rate: 110 }],
        attachments: [],
        notes: "Standard periodic maintenance order.",
        submittedBy: "POS Advisor",
        createdAt: "2026-02-14T11:30:00.000Z",
        updatedAt: "2026-02-14T11:46:00.000Z",
        submittedAt: "2026-02-14T11:46:00.000Z",
      },
      "Submitted"
    ),
    normalizeOrder(
      {
        id: "POSO-4005",
        vehicleId: "VH-884",
        vehiclePlate: "TX-8841",
        serviceType: "Battery replacement",
        problemType: "Low cold-start voltage",
        description: "Replace battery bank and charging system verification.",
        priority: "High",
        parts: [{ id: "PART-4501", name: "24V battery set", qty: 1, unitCost: 520 }],
        labour: [{ id: "LAB-4501", name: "Electrical labor", hours: 1.5, rate: 135 }],
        attachments: [{ name: "voltage-readings.csv", size: 5120, type: "text/csv" }],
        notes: "Escalated by dispatch after repeated no-start report.",
        submittedBy: "POS Supervisor",
        createdAt: "2026-02-20T07:10:00.000Z",
        updatedAt: "2026-02-20T07:44:00.000Z",
        submittedAt: "2026-02-20T07:44:00.000Z",
      },
      "Submitted"
    ),
  ],
});

const defaultOrderState = getDefaultOrderState();

const normalizeState = (value = {}) => ({
  draftOrders: Array.isArray(value.draftOrders)
    ? value.draftOrders.map((order) => normalizeOrder(order, "Draft"))
    : defaultOrderState.draftOrders,
  submittedOrders: Array.isArray(value.submittedOrders)
    ? value.submittedOrders.map((order) => normalizeOrder(order, "Submitted"))
    : defaultOrderState.submittedOrders,
});

const initializeState = () => {
  const defaults = normalizeState(defaultOrderState);
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    const next = {
      draftOrders:
        normalized.draftOrders.length > 0
          ? normalized.draftOrders
          : defaults.draftOrders,
      submittedOrders:
        normalized.submittedOrders.length > 0
          ? normalized.submittedOrders
          : defaults.submittedOrders,
    };
    writeStorage(next);
    return next;
  }
  writeStorage(defaults);
  return defaults;
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
