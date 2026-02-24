const STORAGE_KEY = "oxifleet:driver-operations";

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

const toIsoString = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeTenant = (tenant = {}) => ({
  id: String(tenant.id || createId("TEN")).trim(),
  name: String(tenant.name || "Tenant").trim(),
  region: String(tenant.region || "N/A").trim(),
  supportHotline: String(tenant.supportHotline || "N/A").trim(),
  workshopLead: String(tenant.workshopLead || "N/A").trim(),
});

const normalizeTenantAssignment = (assignment = {}) => ({
  id: String(assignment.id || createId("TAS")).trim(),
  tenantId: String(assignment.tenantId || "").trim(),
  driverName: String(assignment.driverName || "Unknown driver").trim(),
  homeBase: String(assignment.homeBase || "N/A").trim(),
});

const normalizeDriverStatus = (status = {}) => ({
  id: String(status.id || createId("DST")).trim(),
  tenantId: String(status.tenantId || "").trim(),
  driverName: String(status.driverName || "Unknown driver").trim(),
  shiftStatus: String(status.shiftStatus || "On duty").trim() || "On duty",
  availability: String(status.availability || "Available").trim() || "Available",
  currentLocation: String(status.currentLocation || "Not shared").trim(),
  lastSeenAt: toIsoString(status.lastSeenAt),
});

const normalizeChecklist = (checklist = {}) => ({
  id: String(checklist.id || createId("CHK")).trim(),
  tenantId: String(checklist.tenantId || "").trim(),
  driverName: String(checklist.driverName || "Unknown driver").trim(),
  vehicleId: String(checklist.vehicleId || "N/A").trim(),
  shiftStatus: String(checklist.shiftStatus || "On duty").trim() || "On duty",
  odometer: String(checklist.odometer || "").trim(),
  fuelLevel: Number(checklist.fuelLevel) || 0,
  tyresOk: Boolean(checklist.tyresOk),
  brakesOk: Boolean(checklist.brakesOk),
  lightsOk: Boolean(checklist.lightsOk),
  docsOk: Boolean(checklist.docsOk),
  notes: String(checklist.notes || "").trim(),
  createdAt: toIsoString(checklist.createdAt),
});

const getDefaultState = () => ({
  tenants: [
    normalizeTenant({
      id: "TEN-ALPHA",
      name: "NorthStar Logistics",
      region: "Dallas / Fort Worth",
      supportHotline: "+1 (800) 410-1001",
      workshopLead: "Metro Service Hub",
    }),
    normalizeTenant({
      id: "TEN-BRAVO",
      name: "BlueLane Freight",
      region: "Austin / San Antonio",
      supportHotline: "+1 (800) 410-1002",
      workshopLead: "Westline Tire Care",
    }),
    normalizeTenant({
      id: "TEN-CHARLIE",
      name: "Horizon Fleet Partners",
      region: "Houston / Gulf Route",
      supportHotline: "+1 (800) 410-1003",
      workshopLead: "Northern Fleet Works",
    }),
  ],
  tenantAssignments: [
    normalizeTenantAssignment({
      id: "TAS-1001",
      tenantId: "TEN-ALPHA",
      driverName: "Jamie Stewart",
      homeBase: "Dallas Yard",
    }),
    normalizeTenantAssignment({
      id: "TAS-1002",
      tenantId: "TEN-BRAVO",
      driverName: "Avery Chen",
      homeBase: "Austin Hub",
    }),
    normalizeTenantAssignment({
      id: "TAS-1003",
      tenantId: "TEN-CHARLIE",
      driverName: "Morgan Patel",
      homeBase: "Houston Depot",
    }),
  ],
  driverStatuses: [
    normalizeDriverStatus({
      id: "DST-1001",
      tenantId: "TEN-ALPHA",
      driverName: "Jamie Stewart",
      shiftStatus: "On trip",
      availability: "Busy",
      currentLocation: "I-35 Northbound",
      lastSeenAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    }),
    normalizeDriverStatus({
      id: "DST-1002",
      tenantId: "TEN-BRAVO",
      driverName: "Avery Chen",
      shiftStatus: "On duty",
      availability: "Available",
      currentLocation: "Austin Service Belt",
      lastSeenAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    }),
    normalizeDriverStatus({
      id: "DST-1003",
      tenantId: "TEN-CHARLIE",
      driverName: "Morgan Patel",
      shiftStatus: "Break",
      availability: "Limited",
      currentLocation: "Houston Fuel Stop",
      lastSeenAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    }),
  ],
  checklistLogs: [
    normalizeChecklist({
      id: "CHK-1001",
      tenantId: "TEN-ALPHA",
      driverName: "Jamie Stewart",
      vehicleId: "VH-884",
      shiftStatus: "On trip",
      odometer: "184230",
      fuelLevel: 72,
      tyresOk: true,
      brakesOk: true,
      lightsOk: true,
      docsOk: true,
      notes: "Pre-trip checklist submitted before route departure.",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    }),
    normalizeChecklist({
      id: "CHK-1002",
      tenantId: "TEN-BRAVO",
      driverName: "Avery Chen",
      vehicleId: "VH-241",
      shiftStatus: "On duty",
      odometer: "146910",
      fuelLevel: 58,
      tyresOk: true,
      brakesOk: true,
      lightsOk: true,
      docsOk: false,
      notes: "Insurance document image upload pending.",
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    }),
  ],
});

const normalizeState = (value = {}) => {
  const defaults = getDefaultState();
  return {
    tenants: Array.isArray(value.tenants)
      ? value.tenants.map(normalizeTenant)
      : defaults.tenants,
    tenantAssignments: Array.isArray(value.tenantAssignments)
      ? value.tenantAssignments.map(normalizeTenantAssignment)
      : defaults.tenantAssignments,
    driverStatuses: Array.isArray(value.driverStatuses)
      ? value.driverStatuses.map(normalizeDriverStatus)
      : defaults.driverStatuses,
    checklistLogs: Array.isArray(value.checklistLogs)
      ? value.checklistLogs.map(normalizeChecklist)
      : defaults.checklistLogs,
  };
};

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    writeStorage(normalized);
    return normalized;
  }
  const defaults = normalizeState(getDefaultState());
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

export const getDriverOperationsState = () => state;

export const setTenantDriverStatus = ({
  tenantId,
  driverName,
  shiftStatus,
  availability,
  currentLocation,
}) => {
  const normalizedTenantId = String(tenantId || "").trim();
  const normalizedDriverName = String(driverName || "").trim();
  if (!normalizedTenantId || !normalizedDriverName) {
    return null;
  }

  let updatedStatus = null;
  let matched = false;
  const nextStatuses = state.driverStatuses.map((status) => {
    if (
      status.tenantId !== normalizedTenantId ||
      status.driverName.toLowerCase() !== normalizedDriverName.toLowerCase()
    ) {
      return status;
    }
    matched = true;
    updatedStatus = normalizeDriverStatus({
      ...status,
      shiftStatus: shiftStatus || status.shiftStatus,
      availability: availability || status.availability,
      currentLocation:
        currentLocation !== undefined ? currentLocation : status.currentLocation,
      lastSeenAt: new Date().toISOString(),
    });
    return updatedStatus;
  });

  if (!matched) {
    updatedStatus = normalizeDriverStatus({
      tenantId: normalizedTenantId,
      driverName: normalizedDriverName,
      shiftStatus,
      availability,
      currentLocation,
      lastSeenAt: new Date().toISOString(),
    });
    nextStatuses.unshift(updatedStatus);
  }

  updateState({
    ...state,
    driverStatuses: nextStatuses,
  });

  return updatedStatus;
};

export const submitDriverChecklist = (checklist) => {
  const nextChecklist = normalizeChecklist(checklist);
  updateState({
    ...state,
    checklistLogs: [nextChecklist, ...state.checklistLogs].slice(0, 120),
  });
  return nextChecklist;
};

export const subscribeDriverOperations = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
