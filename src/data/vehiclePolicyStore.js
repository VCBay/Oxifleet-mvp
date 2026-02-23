const STORAGE_KEY = "oxifleet:vehicle-policies";

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

const createPolicyId = () =>
  `POL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const parseList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const normalizeCode = (value, nameFallback) => {
  const raw = String(value || "").trim();
  if (raw) {
    return raw.toUpperCase();
  }
  const fromName = String(nameFallback || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return fromName || `POLICY-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};

const toIsoDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePolicy = (policy = {}) => {
  const name = String(policy.name || "").trim() || "Untitled Policy";
  const policyCode = normalizeCode(policy.policyCode, name);
  const appliesTo = policy.appliesTo || {};

  return {
    id: policy.id || createPolicyId(),
    name,
    policyCode,
    version: Number(policy.version) || 1,
    status: String(policy.status || "Active").trim() || "Active",
    allowedServiceTypes: parseList(policy.allowedServiceTypes),
    allowedTyreBrands: parseList(policy.allowedTyreBrands),
    allowedTyreCategories: parseList(policy.allowedTyreCategories),
    servicePriceLimit: toNullableNumber(policy.servicePriceLimit),
    tyrePriceLimit: toNullableNumber(policy.tyrePriceLimit),
    approvalThreshold: toNullableNumber(policy.approvalThreshold),
    seasonalTyreRules: String(policy.seasonalTyreRules || "").trim(),
    specialCaseExceptions: String(policy.specialCaseExceptions || "").trim(),
    appliesTo: {
      fleet: String(appliesTo.fleet || policy.fleet || "").trim(),
      vehicleGroup: String(appliesTo.vehicleGroup || policy.vehicleGroup || "").trim(),
      vehicleClass: String(appliesTo.vehicleClass || policy.vehicleClass || "").trim(),
      vehicleId: String(appliesTo.vehicleId || policy.vehicleId || "").trim(),
    },
    changeNote: String(policy.changeNote || "").trim(),
    effectiveFrom: toIsoDate(policy.effectiveFrom) || new Date().toISOString().slice(0, 10),
    createdAt: policy.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const getDefaultPolicies = () => {
  const today = new Date().toISOString().slice(0, 10);
  return [
    normalizePolicy({
      id: "POL-DEMO-001",
      name: "Demo Fleet Safety Policy",
      policyCode: "DEMO-SAFETY",
      version: 1,
      status: "Active",
      allowedServiceTypes: [
        "Oil change",
        "Brake service",
        "Tyre rotation",
        "Engine diagnostics",
      ],
      allowedTyreBrands: ["Michelin", "Bridgestone", "Goodyear"],
      allowedTyreCategories: ["All-season", "Highway", "Winter"],
      servicePriceLimit: 1800,
      tyrePriceLimit: 2600,
      approvalThreshold: 85,
      seasonalTyreRules:
        "December to February: winter tyres required for northern routes.",
      specialCaseExceptions:
        "Emergency dispatch units may exceed tyre limit by 10% with supervisor approval.",
      appliesTo: {
        fleet: "North Fleet",
        vehicleGroup: "Long-haul",
        vehicleClass: "Truck",
        vehicleId: "",
      },
      changeNote: "Initial demo policy for UI preview.",
      effectiveFrom: today,
      createdAt: new Date().toISOString(),
    }),
  ];
};

const initializePolicies = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return stored.map(normalizePolicy);
  }

  const defaults = getDefaultPolicies();
  writeStorage(defaults);
  return defaults;
};

let state = {
  policies: initializePolicies(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const getNextVersion = (policyCode) => {
  const versions = state.policies
    .filter((policy) => policy.policyCode === policyCode)
    .map((policy) => Number(policy.version) || 0);
  return (Math.max(0, ...versions) || 0) + 1;
};

export const getVehiclePolicyState = () => state;

export const saveVehiclePolicyVersion = (payload) => {
  const normalized = normalizePolicy(payload);
  const nextPolicy = {
    ...normalized,
    id: payload.id || createPolicyId(),
    version: payload.version ? Number(payload.version) : getNextVersion(normalized.policyCode),
  };

  const nextPolicies = [...state.policies, nextPolicy];
  state = {
    ...state,
    policies: nextPolicies,
  };
  writeStorage(nextPolicies);
  emit();
  return nextPolicy;
};

export const setVehiclePolicyStatus = (policyId, status) => {
  const targetId = String(policyId || "").trim();
  if (!targetId) {
    return null;
  }
  const nextStatus = String(status || "").trim() || "Active";
  let updatedPolicy = null;

  const nextPolicies = state.policies.map((policy) => {
    if (policy.id !== targetId) {
      return policy;
    }
    updatedPolicy = {
      ...policy,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    return updatedPolicy;
  });

  if (!updatedPolicy) {
    return null;
  }

  state = {
    ...state,
    policies: nextPolicies,
  };
  writeStorage(nextPolicies);
  emit();
  return updatedPolicy;
};

export const subscribeVehiclePolicies = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
