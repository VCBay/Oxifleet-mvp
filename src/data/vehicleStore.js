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

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

const defaultTyreSpec = (vehicleId) => {
  const numericId = Number(String(vehicleId || "").replace(/\D/g, "")) || 0;
  return {
    brand: ["Goodyear", "Michelin", "Bridgestone", "Continental"][
      numericId % 4
    ],
    size: ["295/75R22.5", "11R22.5", "275/80R22.5", "255/70R22.5"][
      numericId % 4
    ],
    frontPsi: 100 + (numericId % 8),
    rearPsi: 95 + (numericId % 8),
  };
};

const defaultServiceHistory = (vehicleId) => {
  const numericId = Number(String(vehicleId || "").replace(/\D/g, "")) || 0;
  return [
    {
      date: "2026-02-08",
      event: "Oil and filter change",
      cost: `$${(480 + (numericId % 9) * 35).toLocaleString()}`,
    },
    {
      date: "2026-01-25",
      event: "Tyre pressure calibration",
      cost: `$${(220 + (numericId % 7) * 22).toLocaleString()}`,
    },
  ];
};

const toIsoDate = (value) => {
  const raw = value?.trim?.() || "";
  if (!raw) {
    return "";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const getWarrantyStatus = (expiryDate) => {
  const normalizedDate = toIsoDate(expiryDate);
  if (!normalizedDate) {
    return "Unknown";
  }
  const now = new Date();
  const expiry = new Date(`${normalizedDate}T23:59:59`);
  const msDiff = expiry.getTime() - now.getTime();
  const dayDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (dayDiff < 0) {
    return "Expired";
  }
  if (dayDiff <= 60) {
    return "Expiring soon";
  }
  return "Active";
};

const normalizeServiceEntry = (entry) => ({
  date: toIsoDate(entry?.date) || new Date().toISOString().slice(0, 10),
  event: entry?.event?.trim() || "Service update",
  cost: entry?.cost?.trim() || "N/A",
});

const normalizeVehicle = (vehicle = {}) => {
  const id = vehicle.id?.trim() || createVehicleId();
  const status = vehicle.status?.trim() || "Active";
  const normalizedWarrantyDate = toIsoDate(vehicle.warrantyExpiryDate);
  const tyreSpecs = {
    ...defaultTyreSpec(id),
    ...(vehicle.tyreSpecs || {}),
  };
  const history = Array.isArray(vehicle.serviceHistory)
    ? vehicle.serviceHistory.map(normalizeServiceEntry)
    : defaultServiceHistory(id);

  return {
    id,
    model: vehicle.model?.trim() || "Unknown model",
    plate: vehicle.plate?.trim() || "N/A",
    type: vehicle.type?.trim() || "Truck",
    status,
    notes: vehicle.notes?.trim() || "",
    tyreSpecs: {
      brand: tyreSpecs.brand?.trim() || "N/A",
      size: tyreSpecs.size?.trim() || "N/A",
      frontPsi: clampNumber(tyreSpecs.frontPsi, 60, 140, 100),
      rearPsi: clampNumber(tyreSpecs.rearPsi, 60, 140, 95),
    },
    serviceHistory: history.slice(0, 10),
    warrantyProvider: vehicle.warrantyProvider?.trim() || "OEM",
    warrantyExpiryDate: normalizedWarrantyDate || "",
    warrantyStatus:
      vehicle.warrantyStatus?.trim() ||
      getWarrantyStatus(normalizedWarrantyDate || ""),
    replacementVehicleId: vehicle.replacementVehicleId?.trim() || "",
    replacementNotes: vehicle.replacementNotes?.trim() || "",
    createdAt: vehicle.createdAt || new Date().toISOString(),
  };
};

const getDefaultVehicles = () => [
  {
    id: "VH-884",
    model: "Freightliner Cascadia",
    plate: "TX-9842",
    type: "Truck",
    status: "Active",
    notes: "Primary long-haul lane vehicle.",
    warrantyProvider: "OEM",
    warrantyExpiryDate: "2026-09-30",
  },
  {
    id: "VH-241",
    model: "Volvo VNL 760",
    plate: "TX-7721",
    type: "Truck",
    status: "Active",
    notes: "Regional dispatch rotation.",
    warrantyProvider: "Volvo Care",
    warrantyExpiryDate: "2026-08-14",
  },
  {
    id: "VH-553",
    model: "Kenworth T680",
    plate: "TX-6105",
    type: "Truck",
    status: "In service",
    notes: "Scheduled diagnostics and brake calibration.",
    warrantyProvider: "Kenworth Shield",
    warrantyExpiryDate: "2026-06-30",
  },
  {
    id: "VH-901",
    model: "Mack Anthem",
    plate: "TX-3320",
    type: "Truck",
    status: "Active",
    notes: "Emergency coverage route.",
    warrantyProvider: "Mack Plus",
    warrantyExpiryDate: "2026-12-11",
  },
  {
    id: "VH-617",
    model: "International LT",
    plate: "TX-4408",
    type: "Truck",
    status: "Active",
    notes: "Night-shift route support.",
    warrantyProvider: "International Care",
    warrantyExpiryDate: "2026-11-20",
  },
  {
    id: "VH-730",
    model: "Volvo VNR",
    plate: "TX-5594",
    type: "Truck",
    status: "Inactive",
    notes: "Temporarily paused pending route reassignment.",
    warrantyProvider: "Volvo Care",
    warrantyExpiryDate: "2026-05-18",
  },
  {
    id: "VH-102",
    model: "Peterbilt 579",
    plate: "TX-1201",
    type: "Truck",
    status: "Active",
    notes: "Assigned to central depot operations.",
    warrantyProvider: "PACCAR",
    warrantyExpiryDate: "2027-01-08",
  },
  {
    id: "VH-468",
    model: "Ford Transit 350",
    plate: "TX-4680",
    type: "Van",
    status: "Active",
    notes: "Light-duty spare parts and technician shuttle.",
    warrantyProvider: "Ford Fleet",
    warrantyExpiryDate: "2026-10-05",
    replacementVehicleId: "VH-730",
    replacementNotes: "Can be swapped for short routes when needed.",
  },
];

const ensureSeedVehicles = (existingVehicles) => {
  const normalizedExisting = existingVehicles.map(normalizeVehicle);
  const defaultVehicles = getDefaultVehicles().map(normalizeVehicle);
  const existingIds = new Set(normalizedExisting.map((vehicle) => vehicle.id));
  const missingDefaults = defaultVehicles.filter(
    (vehicle) => !existingIds.has(vehicle.id)
  );

  if (missingDefaults.length === 0) {
    return normalizedExisting;
  }

  const merged = [...missingDefaults, ...normalizedExisting];
  writeStorage(merged);
  return merged;
};

const initializeVehicles = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return ensureSeedVehicles(stored);
  }
  const defaults = getDefaultVehicles().map(normalizeVehicle);
  writeStorage(defaults);
  return defaults;
};

let state = {
  baseVehicleCount: BASE_VEHICLE_COUNT,
  vehicles: initializeVehicles(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getVehicleState = () => state;

export const addVehicle = (vehicle) => {
  const nextVehicle = normalizeVehicle(vehicle);

  const nextVehicles = [...state.vehicles, nextVehicle];
  state = {
    ...state,
    vehicles: nextVehicles,
  };
  writeStorage(nextVehicles);
  emit();
  return nextVehicle;
};

export const updateVehicle = (vehicleId, updates = {}) => {
  const targetId = vehicleId?.trim();
  if (!targetId) {
    return null;
  }

  let updatedVehicle = null;
  const nextVehicles = state.vehicles.map((vehicle) => {
    if (vehicle.id !== targetId) {
      return vehicle;
    }
    updatedVehicle = normalizeVehicle({
      ...vehicle,
      ...updates,
      id: vehicle.id,
      createdAt: vehicle.createdAt,
    });
    return updatedVehicle;
  });

  if (!updatedVehicle) {
    return null;
  }

  state = {
    ...state,
    vehicles: nextVehicles,
  };
  writeStorage(nextVehicles);
  emit();
  return updatedVehicle;
};

export const upsertVehicles = (vehicles = []) => {
  const incoming = Array.isArray(vehicles) ? vehicles : [vehicles];
  if (incoming.length === 0) {
    return { inserted: 0, updated: 0, total: state.vehicles.length };
  }

  const map = new Map(state.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  let inserted = 0;
  let updated = 0;

  incoming.forEach((item) => {
    const incomingId = item?.id?.trim();
    const existing = incomingId ? map.get(incomingId) : null;
    const normalized = normalizeVehicle({
      ...(existing || {}),
      ...item,
      id: incomingId || existing?.id,
      createdAt: existing?.createdAt || item?.createdAt,
    });

    if (existing) {
      updated += 1;
    } else {
      inserted += 1;
    }
    map.set(normalized.id, normalized);
  });

  const nextVehicles = Array.from(map.values());
  state = {
    ...state,
    vehicles: nextVehicles,
  };
  writeStorage(nextVehicles);
  emit();

  return {
    inserted,
    updated,
    total: nextVehicles.length,
  };
};

export const subscribeVehicles = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
