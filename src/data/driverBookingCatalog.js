import pointSStationsMaster from "./pointSStationsMaster.json";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const DRIVER_SERVICE_CATEGORIES = [
  {
    value: "Reifen",
    label: "Reifen",
    hint: "Reifenwechsel, Reifenpanne oder Druckverlust",
    iconKey: "tyre",
    capability: "tyre",
  },
  {
    value: "Service",
    label: "Service",
    hint: "Regelservice und allgemeine Wartung",
    iconKey: "service",
    capability: "service",
  },
  {
    value: "Technisches Problem",
    label: "Technisches Problem",
    hint: "Warnmeldung, Elektrik, Motor oder Bremse",
    iconKey: "technical_problem",
    capability: "technical",
  },
  {
    value: "Schadensmeldung",
    label: "Schadensmeldung",
    hint: "Karosserie- oder Unfallschaden melden",
    iconKey: "damage_report",
    capability: "damage",
  },
  // {
  //   value: "Tyre damage",
  //   label: "Tyre problem",
  //   hint: "Puncture, low air, or damaged tyre",
  //   iconKey: "tyre",
  //   capability: "tyre",
  // },
  // {
  //   value: "Brake issue",
  //   label: "Brake problem",
  //   hint: "Brake noise, weak brake, warning light",
  //   iconKey: "technical_problem",
  //   capability: "technical",
  // },
  // {
  //   value: "Engine diagnostics",
  //   label: "Engine problem",
  //   hint: "Power loss, smoke, engine light",
  //   iconKey: "technical_problem",
  //   capability: "technical",
  // },
  // {
  //   value: "Battery / electrical",
  //   label: "Battery or electrical",
  //   hint: "Vehicle not starting, light issue",
  //   iconKey: "technical_problem",
  //   capability: "technical",
  // },
  // {
  //   value: "Accident damage",
  //   label: "Accident damage",
  //   hint: "Body or safety damage after impact",
  //   iconKey: "damage_report",
  //   capability: "damage",
  // },
  // {
  //   value: "General service",
  //   label: "I am not sure",
  //   hint: "General check needed",
  //   iconKey: "service",
  //   capability: "service",
  // },
];

export const BOOKING_BASE_COST_BY_CATEGORY = {
  Reifen: 520,
  Service: 390,
  "Technisches Problem": 680,
  Schadensmeldung: 980,
  "Tyre damage": 520,
  "Brake issue": 740,
  "Engine diagnostics": 680,
  "Battery / electrical": 460,
  "Accident damage": 980,
  "General service": 390,
};

export const DRIVER_SERVICE_CATEGORY_DETAILS = {
  Reifen: {
    selectionLabel: "Tyre service type",
    selectionHint: "Choose the tyre-related service needed for your vehicle.",
    detailFieldLabel: "Explain the tyre issue",
    detailPlaceholder:
      "Add details about the tyre condition, warning, axle position, or urgency.",
    subOptions: [
      {
        value: "Tyre change (seasonal change)",
        label: "Tyre change (seasonal change)",
      },
      {
        value: "New tyre installation",
        label: "New tyre installation",
      },
      {
        value: "Tyre damage",
        label: "Tyre damage",
      },
      {
        value: "Tyre remounting",
        label: "Tyre remounting",
        requiresExplanation: true,
      },
      {
        value: "TPMS problem",
        label: "TPMS problem",
        requiresExplanation: true,
      },
      {
        value: "Air pressure loss",
        label: "Air pressure loss",
        requiresExplanation: true,
      },
    ],
  },
  Service: {
    selectionLabel: "Service type",
    selectionHint: "Choose the service needed before selecting a Point S station.",
    detailFieldLabel: "Additional notes",
    detailPlaceholder:
      "Add any relevant service notes, mileage, or symptoms if needed.",
    subOptions: [
      { value: "Inspection", label: "Inspection" },
      { value: "Oil change", label: "Oil change" },
      {
        value: "Vehicle inspection (HU/AU)",
        label: "Vehicle inspection (HU/AU)",
      },
      { value: "UVV inspection", label: "UVV inspection" },
      { value: "Wheel alignment", label: "Wheel alignment" },
      {
        value: "Windshield wiper service",
        label: "Windshield wiper service",
      },
      { value: "Brakes", label: "Brakes" },
    ],
  },
  "Technisches Problem": {
    selectionLabel: "Technical problem details",
    selectionHint:
      "Describe the issue in the field below or upload a picture of the error message.",
    detailFieldLabel: "What technical problem does your vehicle have?",
    detailPlaceholder:
      "Describe the warning light, error message, symptoms, or when the issue started.",
    requiresDescription: true,
  },
  Schadensmeldung: {
    selectionLabel: "Damage report details",
    selectionHint:
      "Fill out the damage details below and upload clear pictures of the damage.",
    detailFieldLabel: "Damage details",
    detailPlaceholder:
      "Describe what happened, where the damage is located, and whether the vehicle is still drivable.",
    requiresDescription: true,
    requiresPhotos: true,
  },
};

const safeText = (value) => String(value || "").trim();
const containsAny = (text, keywords) =>
  keywords.some((keyword) => text.includes(keyword));
const toSeed = (value, fallbackIndex) => {
  const parsed = Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallbackIndex + 1;
};

const technicalCapabilityKeywords = [
  "service",
  "technik",
  "technisch",
  "werkstatt",
  "kfz",
  "autohaus",
  "diagnose",
  "diagnostic",
];
const damageCapabilityKeywords = [
  "schaden",
  "karosserie",
  "unfall",
  "lack",
  "repair",
  "body",
];

const buildCapabilities = (stationRow, seed) => {
  const searchableText = normalizeValue(
    `${stationRow.name1 || ""} ${stationRow.name2 || ""} ${stationRow.name3 || ""} ${
      stationRow.street || ""
    }`,
  );
  const capabilities = new Set(["tyre", "service", "general"]);

  if (
    containsAny(searchableText, technicalCapabilityKeywords) ||
    seed % 3 === 0
  ) {
    capabilities.add("technical");
  }
  if (containsAny(searchableText, damageCapabilityKeywords) || seed % 5 === 0) {
    capabilities.add("damage");
  }

  return Array.from(capabilities);
};

const formatAddress = (stationRow) => {
  const street = safeText(stationRow.street) || "Address pending";
  const location = [safeText(stationRow.postalCode), safeText(stationRow.city)]
    .filter(Boolean)
    .join(" ");
  return [street, location || "Unknown city", "Germany"]
    .filter(Boolean)
    .join(", ");
};

const buildPointSStation = (stationRow, index, usedIds) => {
  const seed = toSeed(stationRow.customerNumber, index);
  const customerRef = safeText(stationRow.customerNumber).replace(
    /[^\w-]/g,
    "",
  );
  const baseId = `POINTS-${customerRef || `IDX-${index + 1}`}`;
  let id = baseId;
  if (usedIds.has(id)) {
    id = `${baseId}-${index + 1}`;
  }
  usedIds.add(id);

  const nameParts = [
    safeText(stationRow.name1),
    safeText(stationRow.name2),
    safeText(stationRow.name3),
  ].filter(Boolean);

  const distanceKm = Number((3 + (seed % 220) / 10).toFixed(1));

  return {
    id,
    name: nameParts.join(" - ") || `Point S Partner ${seed}`,
    address: formatAddress(stationRow),
    distanceKm,
    etaMin: Math.max(8, Math.round(distanceKm * 2.1 + 4)),
    capabilities: buildCapabilities(stationRow, seed),
    type: stationRow.type,
  };
};

// Built from src/data/Teilnahme Flotte_Stand 03.02.2026.xlsx
// Extra source columns are ignored; missing fields are filled with safe defaults.
export const POINT_S_STATIONS = (() => {
  const usedIds = new Set();
  return (pointSStationsMaster || [])
    .filter((row) => {
      const participation = normalizeValue(row?.fleetParticipation);
      return (
        !participation || participation === "ja" || participation === "yes"
      );
    })
    .map((row, index) => buildPointSStation(row || {}, index, usedIds))
    .sort((a, b) => a.distanceKm - b.distanceKm);
})();

const serviceCategoryByValue = new Map(
  DRIVER_SERVICE_CATEGORIES.map((item) => [normalizeValue(item.value), item]),
);

const policyKeywordByCapability = {
  tyre: ["tyre", "tire", "wheel", "reifen"],
  service: ["service", "maintenance", "inspection", "oil", "wartung"],
  technical: [
    "technical",
    "engine",
    "brake",
    "battery",
    "electrical",
    "diagnostics",
    "technisch",
  ],
  damage: ["damage", "accident", "body", "repair", "schaden"],
};

export const getCategoryCapability = (problemType) => {
  const match = serviceCategoryByValue.get(normalizeValue(problemType));
  return match?.capability || "service";
};

export const getCategoryDetails = (problemType) =>
  DRIVER_SERVICE_CATEGORY_DETAILS[String(problemType || "").trim()] || null;

export const getCategorySubOptions = (problemType) =>
  getCategoryDetails(problemType)?.subOptions || [];

export const doesCategoryRequireSubtype = (problemType) =>
  getCategorySubOptions(problemType).length > 0;

export const doesCategoryRequireDescription = (problemType, problemSubtype) => {
  const category = getCategoryDetails(problemType);
  if (!category) {
    return false;
  }
  if (category.requiresDescription) {
    return true;
  }
  const subtype = category.subOptions?.find(
    (item) => item.value === problemSubtype,
  );
  return Boolean(subtype?.requiresExplanation);
};

export const doesCategoryRequirePhotos = (problemType) =>
  Boolean(getCategoryDetails(problemType)?.requiresPhotos);

export const getCategoryPolicyKeywords = (problemType, problemSubtype = "") => {
  const normalizedProblemType = normalizeValue(problemType);
  const normalizedSubtype = normalizeValue(problemSubtype);
  const capability = getCategoryCapability(problemType);
  const keywords = policyKeywordByCapability[capability] || [];
  return Array.from(
    new Set([normalizedProblemType, normalizedSubtype, ...keywords]),
  ).filter(Boolean);
};

export const getNearestPointSStationsForCategory = (problemType) => {
  const targetCapability = getCategoryCapability(problemType);
  return POINT_S_STATIONS.filter(
    (station) =>
      station.capabilities.includes(targetCapability) ||
      station.capabilities.includes("general"),
  ).sort((a, b) => a.distanceKm - b.distanceKm);
};
