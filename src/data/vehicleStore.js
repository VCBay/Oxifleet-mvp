import {
  getSeedVehicleSnapshot,
  isLegacySeedVehicleModel,
  seedVehicleCatalog,
} from "./seedVehicleCatalog";

const STORAGE_KEY = "oxifleet:vehicles";
const BASE_VEHICLE_COUNT = 0;

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
    size: ["205/55R16", "215/60R16", "225/45R17", "235/55R18"][
      numericId % 4
    ],
    frontPsi: 34 + (numericId % 4),
    rearPsi: 32 + (numericId % 4),
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

const buildLeaseProfileDefaults = (vehicleId, seedSnapshot) => {
  const numericId = Number(String(vehicleId || "").replace(/\D/g, "")) || 0;
  const firstRegistrationDate = `202${2 + (numericId % 3)}-${String(
    (numericId % 12) + 1,
  ).padStart(2, "0")}-${String(3 + (numericId % 25)).padStart(2, "0")}`;
  const leaseEndDate = `202${7 + (numericId % 2)}-${String(
    ((numericId + 4) % 12) + 1,
  ).padStart(2, "0")}-28`;
  const leasingCompany = [
    "ALD Automotive Deutschland GmbH",
    "Arval Deutschland GmbH",
    "LeasePlan Deutschland GmbH",
    "Athlon Germany GmbH",
  ][numericId % 4];
  const category = seedSnapshot?.type || "Fahrzeug";
  return {
    firstRegistrationDate,
    leasingCompany,
    allowedMileage: deriveAllowedMileage(
      leasingCompany,
      category,
      normalizeSeedVehicleType(category),
    ),
    leaseEndDate,
    category,
  };
};

const normalizeSeedVehicleType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (type.includes("anhänger")) {
    return "Trailer";
  }
  if (type.includes("bus") || type.includes("van")) {
    return "Van";
  }
  if (
    type.includes("suv") ||
    type.includes("kombi") ||
    type.includes("kleinwagen") ||
    type.includes("lim") ||
    type.includes("fahrzeug")
  ) {
    return "Car";
  }
  if (type.includes("transporter") || type.includes("kastenwagen")) {
    return "Van";
  }
  if (type.includes("baumaschine")) {
    return "Utility";
  }
  return "Vehicle";
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

const normalizeOdometerValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
};

const mileageTypeKey = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized.includes("suv") ||
    normalized.includes("kombi") ||
    normalized.includes("kleinwagen") ||
    normalized.includes("limousine") ||
    normalized.includes("car") ||
    normalized.includes("pkw")
  ) {
    return "car";
  }
  if (
    normalized.includes("van") ||
    normalized.includes("transporter") ||
    normalized.includes("kastenwagen")
  ) {
    return "van";
  }
  if (normalized.includes("trailer") || normalized.includes("anhänger")) {
    return "trailer";
  }
  if (normalized.includes("utility") || normalized.includes("baumaschine")) {
    return "utility";
  }
  return "vehicle";
};

export const deriveAllowedMileage = (
  leasingCompany,
  vehicleCategory,
  vehicleType,
) => {
  const company = String(leasingCompany || "")
    .trim()
    .toLowerCase();
  const categoryKey = mileageTypeKey(vehicleCategory);
  const typeKey =
    categoryKey !== "vehicle" ? categoryKey : mileageTypeKey(vehicleType);

  const companyBaseMileage = company.includes("ald")
    ? 30000
    : company.includes("arval")
      ? 35000
      : company.includes("leaseplan")
        ? 40000
        : company.includes("athlon")
          ? 45000
          : 32000;

  const typeAdjustment = typeKey === "car"
    ? 0
    : typeKey === "van"
      ? 10000
      : typeKey === "trailer"
        ? 15000
        : typeKey === "utility"
          ? 12000
          : 5000;

  return companyBaseMileage + typeAdjustment;
};

const normalizeVehicle = (vehicle = {}) => {
  const id = vehicle.id?.trim() || createVehicleId();
  const status = vehicle.status?.trim() || "Active";
  const normalizedWarrantyDate = toIsoDate(vehicle.warrantyExpiryDate);
  const normalizedFirstRegistrationDate = toIsoDate(
    vehicle.firstRegistrationDate,
  );
  const normalizedLeaseEndDate = toIsoDate(vehicle.leaseEndDate);
  const tyreSpecs = {
    ...defaultTyreSpec(id),
    ...(vehicle.tyreSpecs || {}),
  };
  const history = Array.isArray(vehicle.serviceHistory)
    ? vehicle.serviceHistory.map(normalizeServiceEntry)
    : defaultServiceHistory(id);
  const seedSnapshot = getSeedVehicleSnapshot(id);
  const nextType = vehicle.type?.trim() || seedSnapshot?.type || "Vehicle";
  const normalizedType = normalizeSeedVehicleType(nextType);
  const leaseProfileDefaults = buildLeaseProfileDefaults(id, seedSnapshot);
  const category =
    vehicle.category?.trim() ||
    seedSnapshot?.type?.trim() ||
    leaseProfileDefaults.category;
  const leasingCompany =
    vehicle.leasingCompany?.trim() || leaseProfileDefaults.leasingCompany;
  const normalizedAllowedMileage = normalizeOdometerValue(vehicle.allowedMileage);

  return {
    id,
    model: vehicle.model?.trim() || "Unknown model",
    plate: vehicle.plate?.trim() || "N/A",
    type: normalizedType,
    category,
    status,
    notes: vehicle.notes?.trim() || "",
    variant: vehicle.variant?.trim() || seedSnapshot?.variant?.trim() || "",
    tyreSpecs: {
      brand: tyreSpecs.brand?.trim() || "N/A",
      size: tyreSpecs.size?.trim() || "N/A",
      frontPsi: clampNumber(tyreSpecs.frontPsi, 28, 52, 34),
      rearPsi: clampNumber(tyreSpecs.rearPsi, 28, 52, 32),
    },
    serviceHistory: history.slice(0, 10),
    warrantyProvider: vehicle.warrantyProvider?.trim() || "OEM",
    warrantyExpiryDate: normalizedWarrantyDate || "",
    firstRegistrationDate:
      normalizedFirstRegistrationDate || leaseProfileDefaults.firstRegistrationDate,
    leasingCompany,
    allowedMileage:
      normalizedAllowedMileage && normalizedAllowedMileage > 0
        ? normalizedAllowedMileage
        : deriveAllowedMileage(leasingCompany, category, normalizedType),
    leaseEndDate: normalizedLeaseEndDate || leaseProfileDefaults.leaseEndDate,
    warrantyStatus:
      vehicle.warrantyStatus?.trim() ||
      getWarrantyStatus(normalizedWarrantyDate || ""),
    replacementVehicleId: vehicle.replacementVehicleId?.trim() || "",
    replacementNotes: vehicle.replacementNotes?.trim() || "",
    odometerReading: normalizeOdometerValue(vehicle.odometerReading),
    odometerUnit:
      String(vehicle.odometerUnit || "km").trim().toLowerCase() === "miles"
        ? "miles"
        : "km",
    createdAt: vehicle.createdAt || new Date().toISOString(),
  };
};

const getDefaultVehicles = () =>
  seedVehicleCatalog.map((vehicle, index) => ({
    ...vehicle,
    status:
      index % 11 === 2
        ? "In service"
        : index % 13 === 5
          ? "Inactive"
          : "Active",
    notes:
      vehicle.notes ||
      (vehicle.variant
        ? vehicle.variant
        : "Imported from German fleet source list."),
    warrantyProvider: ["OEM", "Point S Mobility", "Fleet Contract"][
      index % 3
    ],
    warrantyExpiryDate: `202${6 + (index % 2)}-${String((index % 12) + 1).padStart(2, "0")}-${String(
      10 + (index % 18),
    ).padStart(2, "0")}`,
    ...buildLeaseProfileDefaults(vehicle.id, vehicle),
    replacementVehicleId: index === 0 ? "VH-241" : "",
    replacementNotes:
      index === 0 ? "Alternate vehicle available during workshop intake." : "",
    odometerReading: 38200 + index * 4170,
    odometerUnit: "km",
  }));

const refreshLegacySeedVehicle = (vehicle) => {
  const seedVehicle = getSeedVehicleSnapshot(vehicle.id);
  if (!seedVehicle || !isLegacySeedVehicleModel(vehicle.model)) {
    return normalizeVehicle(vehicle);
  }
  return normalizeVehicle({
    ...vehicle,
    ...seedVehicle,
    status: vehicle.status || "Active",
    notes: seedVehicle.notes || vehicle.notes,
    variant: seedVehicle.variant || vehicle.variant,
    createdAt: vehicle.createdAt,
    odometerReading:
      vehicle.odometerReading === null || vehicle.odometerReading === undefined
        ? undefined
        : vehicle.odometerReading,
  });
};

const ensureSeedVehicles = (existingVehicles) => {
  const normalizedExisting = existingVehicles.map(refreshLegacySeedVehicle);
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


export const setVehiclesFromApi = (vehicles = []) => {
  const incoming = Array.isArray(vehicles) ? vehicles : [vehicles];
  const normalized = incoming.map((item) => normalizeVehicle(item));
  state = {
    ...state,
    vehicles: normalized,
  };
  writeStorage(normalized);
  emit();
  return normalized;
};

export const subscribeVehicles = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

