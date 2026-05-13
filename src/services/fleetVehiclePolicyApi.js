import { authHttp } from "./httpClient";

const parseAxiosErrorMessage = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length) {
    return apiErrors.join(", ");
  }

  const apiMessage = error?.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  return error?.message || "Unable to process vehicle policy request.";
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const defaultEmergencyRule = {
  enabled: false,
  approvalMode: "auto-allow",
  maxDistanceKm: null,
  allowedPOSNetwork: "point-s-only",
  costLimitEur: null,
  afterHoursAllowed: false,
  replacementVehicleAllowed: false,
  dispatchGuidance: "",
};

const defaultNetworkRule = {
  networkMode: "point-s-only",
  preferredOEMs: [],
  preferredPOSLocations: [],
  excludedProviders: [],
  crossBorderAllowed: false,
  mobileServiceAllowed: false,
  nearestStationAutoAssign: true,
  outOfNetworkApprovalRequired: true,
};

const normalizeVehiclePolicy = (policy) => {
  const data = policy?.policyData && typeof policy.policyData === "object" ? policy.policyData : {};
  const scope = data.appliesTo || {};

  return {
    id: String(policy?._id || policy?.id || "").trim(),
    name: String(policy?.name || data?.name || policy?.policyCode || "Untitled Policy").trim(),
    policyCode: String(policy?.policyCode || data?.policyCode || "").trim().toUpperCase(),
    version: Number(policy?.version || policy?.policyVersion || data?.version) || 1,
    status: String(policy?.status || data?.status || "Active").trim() || "Active",
    allowedServiceTypes: toArray(data?.allowedServiceTypes),
    allowedTyreBrands: toArray(data?.allowedTyreBrands || policy?.approvedTiresPerOem),
    allowedTyreCategories: toArray(data?.allowedTyreCategories),
    servicePriceLimit: toNumberOrNull(data?.servicePriceLimit),
    tyrePriceLimit: toNumberOrNull(data?.tyrePriceLimit),
    approvalThreshold: toNumberOrNull(data?.approvalThreshold),
    seasonalTyreRules: String(data?.seasonalTyreRules || policy?.replacementReminderRules || "").trim(),
    specialCaseExceptions: String(data?.specialCaseExceptions || policy?.orderInvoiceRules || "").trim(),
    emergencyBreakdownRule: {
      ...defaultEmergencyRule,
      ...(data?.emergencyBreakdownRule || {}),
    },
    serviceNetworkRule: {
      ...defaultNetworkRule,
      ...(data?.serviceNetworkRule || {}),
      preferredOEMs: toArray(data?.serviceNetworkRule?.preferredOEMs || policy?.priorityServiceNetwork),
      preferredPOSLocations: toArray(data?.serviceNetworkRule?.preferredPOSLocations),
      excludedProviders: toArray(data?.serviceNetworkRule?.excludedProviders),
    },
    appliesTo: {
      fleet: String(scope?.fleet || "").trim(),
      vehicleGroup: String(scope?.vehicleGroup || "").trim(),
      vehicleClass: String(scope?.vehicleClass || "").trim(),
      vehicleId: String(scope?.vehicleId || "").trim(),
    },
    changeNote: String(policy?.changeNote || data?.changeNote || "").trim(),
    effectiveFrom: String(policy?.effectiveFrom || data?.effectiveFrom || "").trim(),
    createdAt: policy?.createdAt || new Date().toISOString(),
    updatedAt: policy?.updatedAt || new Date().toISOString(),
  };
};

const mapVehiclePolicyPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeVehiclePolicy);
  }
  return normalizeVehiclePolicy(payload);
};

const toPolicyScopeLabel = (policy = {}) => {
  const scope = policy.appliesTo || {};
  const parts = [];
  if (scope.fleet) parts.push(`Fleet:${scope.fleet}`);
  if (scope.vehicleGroup) parts.push(`Group:${scope.vehicleGroup}`);
  if (scope.vehicleClass) parts.push(`Class:${scope.vehicleClass}`);
  if (scope.vehicleId) parts.push(`Vehicle:${scope.vehicleId}`);
  return parts.length > 0 ? parts.join(" | ") : "Unscoped";
};

const toBackendPayload = (policy = {}) => ({
  policyCode: String(policy.policyCode || "").trim(),
  policyVersion: String(policy.version || 1),
  version: Number(policy.version) || 1,
  name: String(policy.name || "").trim(),
  status: String(policy.status || "Active").trim() || "Active",
  effectiveFrom: String(policy.effectiveFrom || "").trim(),
  changeNote: String(policy.changeNote || "").trim(),
  policyScope: toPolicyScopeLabel(policy),
  approvedTiresPerOem: toArray(policy.allowedTyreBrands).join(", "),
  preferredTires: toArray(policy.allowedTyreCategories).join(", "),
  approvedServiceNetwork: String(policy.serviceNetworkRule?.networkMode || "N/A").trim(),
  priorityServiceNetwork: toArray(policy.serviceNetworkRule?.preferredOEMs).join(", "),
  discountsPerOem: "N/A",
  replacementIntervals: "N/A",
  replacementReminderRules: String(policy.seasonalTyreRules || "").trim() || "N/A",
  approvalRules:
    policy.approvalThreshold === null || policy.approvalThreshold === undefined || policy.approvalThreshold === ""
      ? "N/A"
      : `Threshold ${policy.approvalThreshold}%`,
  orderInvoiceRules: String(policy.specialCaseExceptions || "").trim() || "N/A",
  cashbackPerOem: "N/A",
  policyData: {
    name: String(policy.name || "").trim(),
    status: String(policy.status || "Active").trim() || "Active",
    version: Number(policy.version) || 1,
    allowedServiceTypes: toArray(policy.allowedServiceTypes),
    allowedTyreBrands: toArray(policy.allowedTyreBrands),
    allowedTyreCategories: toArray(policy.allowedTyreCategories),
    servicePriceLimit: toNumberOrNull(policy.servicePriceLimit),
    tyrePriceLimit: toNumberOrNull(policy.tyrePriceLimit),
    approvalThreshold: toNumberOrNull(policy.approvalThreshold),
    seasonalTyreRules: String(policy.seasonalTyreRules || "").trim(),
    specialCaseExceptions: String(policy.specialCaseExceptions || "").trim(),
    emergencyBreakdownRule: {
      ...defaultEmergencyRule,
      ...(policy.emergencyBreakdownRule || {}),
      maxDistanceKm: toNumberOrNull(policy?.emergencyBreakdownRule?.maxDistanceKm),
      costLimitEur: toNumberOrNull(policy?.emergencyBreakdownRule?.costLimitEur),
    },
    serviceNetworkRule: {
      ...defaultNetworkRule,
      ...(policy.serviceNetworkRule || {}),
      preferredOEMs: toArray(policy?.serviceNetworkRule?.preferredOEMs),
      preferredPOSLocations: toArray(policy?.serviceNetworkRule?.preferredPOSLocations),
      excludedProviders: toArray(policy?.serviceNetworkRule?.excludedProviders),
    },
    appliesTo: {
      fleet: String(policy?.appliesTo?.fleet || "").trim(),
      vehicleGroup: String(policy?.appliesTo?.vehicleGroup || "").trim(),
      vehicleClass: String(policy?.appliesTo?.vehicleClass || "").trim(),
      vehicleId: String(policy?.appliesTo?.vehicleId || "").trim(),
    },
    changeNote: String(policy.changeNote || "").trim(),
    effectiveFrom: String(policy.effectiveFrom || "").trim(),
  },
});

export const listFleetVehiclePoliciesApi = async () => {
  try {
    const { data } = await authHttp.get("/admin/car-policies");
    return mapVehiclePolicyPayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createFleetVehiclePolicyApi = async (policy) => {
  try {
    const payload = toBackendPayload(policy);
    const { data } = await authHttp.post("/admin/car-policies", payload);
    return mapVehiclePolicyPayload(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateFleetVehiclePolicyApi = async (policyId, policy) => {
  try {
    const payload = toBackendPayload(policy);
    const { data } = await authHttp.patch(`/admin/car-policies/${policyId}`, payload);
    return mapVehiclePolicyPayload(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
