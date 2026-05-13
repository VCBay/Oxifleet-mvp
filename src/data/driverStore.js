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
    serverId: driver.serverId?.trim() || "",
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
    driverAuthentication: String(driver.driverAuthentication || "").trim(),
    inviteStatus: String(driver.inviteStatus || "").trim(),
    invitation: driver.invitation || null,
  };
};

const getDefaultDrivers = () => [
  {
    id: "DR-317",
    name: "Jamie Stewart",
    email: "jamie.stewart@oxifleet.com",
    phone: "+1 (555) 284-3392",
    license: "CDL-A",
    status: "Driving",
    activityStatus: "Driving",
    assignedVehicleId: "VH-884",
    complianceScore: 94,
    accessLevel: "Full",
    notes: "Night lane specialist.",
  },
  {
    id: "DR-402",
    name: "Avery Chen",
    email: "avery.chen@oxifleet.com",
    phone: "+1 (555) 010-0000",
    license: "CDL-A",
    status: "Active",
    activityStatus: "Active",
    assignedVehicleId: "VH-241",
    complianceScore: 91,
    accessLevel: "Standard",
    notes: "High-priority route coverage.",
  },
  {
    id: "DR-188",
    name: "Morgan Patel",
    email: "morgan.patel@oxifleet.com",
    phone: "+1 (555) 438-1204",
    license: "CDL-B",
    status: "Idle",
    activityStatus: "Idle",
    assignedVehicleId: "VH-553",
    complianceScore: 84,
    accessLevel: "Standard",
    notes: "Awaiting service window completion.",
  },
  {
    id: "DR-229",
    name: "Taylor Reed",
    email: "taylor.reed@oxifleet.com",
    phone: "+1 (555) 774-9088",
    license: "CDL-A",
    status: "Driving",
    activityStatus: "Driving",
    assignedVehicleId: "VH-901",
    complianceScore: 88,
    accessLevel: "Full",
    notes: "Emergency escalation trained.",
  },
  {
    id: "DR-511",
    name: "Chris Morales",
    email: "chris.morales@oxifleet.com",
    phone: "+1 (555) 226-7734",
    license: "CDL-B",
    status: "Active",
    activityStatus: "Active",
    assignedVehicleId: "VH-617",
    complianceScore: 86,
    accessLevel: "Standard",
    notes: "Regional delivery specialist.",
  },
  {
    id: "DR-644",
    name: "Jordan Blake",
    email: "jordan.blake@oxifleet.com",
    phone: "+1 (555) 619-3321",
    license: "CDL-A",
    status: "On leave",
    activityStatus: "On leave",
    assignedVehicleId: "VH-730",
    complianceScore: 79,
    accessLevel: "Read only",
    notes: "Returning next cycle.",
  },
  {
    id: "DR-731",
    name: "Sofia Turner",
    email: "sofia.turner@oxifleet.com",
    phone: "+1 (555) 992-3105",
    license: "CDL-A",
    status: "Active",
    activityStatus: "Active",
    assignedVehicleId: "VH-102",
    complianceScore: 92,
    accessLevel: "Standard",
    notes: "Assigned to central fleet expansion.",
  },
  {
    id: "DR-859",
    name: "Liam Brooks",
    email: "liam.brooks@oxifleet.com",
    phone: "+1 (555) 203-7781",
    license: "CDL-B",
    status: "Inactive",
    activityStatus: "Inactive",
    assignedVehicleId: "",
    complianceScore: 72,
    accessLevel: "Suspended",
    notes: "Account under review.",
  },
];

const ensureSeedDrivers = (existingDrivers) => {
  const normalizedExisting = existingDrivers.map(normalizeDriver);
  const defaultDrivers = getDefaultDrivers().map(normalizeDriver);
  const existingIds = new Set(normalizedExisting.map((driver) => driver.id));
  const missingDefaults = defaultDrivers.filter(
    (driver) => !existingIds.has(driver.id)
  );

  if (missingDefaults.length === 0) {
    return normalizedExisting;
  }

  const merged = [...missingDefaults, ...normalizedExisting];
  writeStorage(merged);
  return merged;
};

const initializeDrivers = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return ensureSeedDrivers(stored);
  }
  const defaults = getDefaultDrivers().map(normalizeDriver);
  writeStorage(defaults);
  return defaults;
};

let state = {
  baseDriverCount: BASE_DRIVER_COUNT,
  drivers: initializeDrivers(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const getDriverState = () => state;


export const setDriversFromApi = (drivers = []) => {
  const nextDrivers = (Array.isArray(drivers) ? drivers : [])
    .map(normalizeDriver)
    .filter((driver) => Boolean(driver.id));

  state = {
    ...state,
    drivers: nextDrivers,
  };
  writeStorage(nextDrivers);
  emit();
  return nextDrivers;
};
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






