import { useEffect, useMemo, useRef, useState } from "react";
import {
  CarFront,
  CircleAlert,
  CircleDashed,
  Loader2,
  MapPin,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  doesCategoryRequireDescription,
  doesCategoryRequirePhotos,
  doesCategoryRequireSubtype,
  getCategoryDetails,
  getCategorySubOptions,
} from "../../data/driverBookingCatalog";
import { evaluateTyreStock } from "../../data/tyreInventoryStore";
import { useTranslation } from "../../i18n/useTranslation";

const problemPictogramMap = {
  tyre: {
    icon: CircleDashed,
    badge: "Reifen",
    accentClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  service: {
    icon: Wrench,
    badge: "Service",
    accentClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  technical_problem: {
    icon: TriangleAlert,
    badge: "Technisches Problem",
    accentClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  damage_report: {
    icon: CarFront,
    badge: "Schadensmeldung",
    accentClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  default: {
    icon: CircleAlert,
    badge: "Service",
    accentClass: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const buildDateChips = (baseValue) => {
  const baseDate = new Date(baseValue);
  const safeBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  safeBase.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, offset) => {
    const next = new Date(safeBase);
    next.setDate(safeBase.getDate() + offset);
    return {
      id: next.toISOString().slice(0, 10),
      label: next.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    };
  });
};

const STATION_SEARCH_DEBOUNCE_MS = 300;
const STATION_MODAL_BATCH_SIZE = 24;
const STATION_MODAL_SCROLL_THROTTLE_MS = 180;
const TYRE_SUPPLY_REQUIRED_SUBTYPES = new Set([
  "Tyre change (seasonal change)",
]);

const requiresTyreSupplySelection = (problemType, problemSubtype) =>
  String(problemType || "").trim() === "Reifen" &&
  TYRE_SUPPLY_REQUIRED_SUBTYPES.has(String(problemSubtype || "").trim());

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

const toTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const getSlotKeyFromDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const DAMAGE_CAUSER_OPTIONS = [
  { value: "driver_self", label: "Fahrer (selbst)" },
  { value: "other_party", label: "Andere Partei" },
  { value: "unknown", label: "Unbekannt / nicht sicher" },
];

const DAMAGE_DRIVEABILITY_OPTIONS = [
  { value: "driveable", label: "Fahrbereit und verkehrssicher" },
  { value: "limited", label: "Eingeschränkt fahrbereit" },
  { value: "not_driveable", label: "Nicht fahrbereit" },
];

const DAMAGE_VISUAL_STATUS_OPTIONS = [
  { value: "", label: "Nicht geprüft" },
  { value: "no_damage", label: "Kein Schaden" },
  { value: "scratch", label: "Kratzer" },
  { value: "dent", label: "Delle" },
  { value: "crack", label: "Riss" },
  { value: "broken", label: "Gebrochen" },
  { value: "other", label: "Sonstiges" },
];

const DAMAGE_VISUAL_PARTS = [
  { key: "frontRightHeadlight", label: "Scheinwerfer vorne rechts" },
  { key: "hood", label: "Motorhaube" },
  { key: "frontLeftHeadlight", label: "Scheinwerfer vorne links" },
  { key: "windshield", label: "Windschutzscheibe" },
  { key: "roofFront", label: "Dach vorne" },
  { key: "leftMirror", label: "Außenspiegel links" },
  { key: "frontLeftWindow", label: "Seitenscheibe vorne links" },
  { key: "rearLeftWindow", label: "Seitenscheibe hinten links" },
  { key: "rearUpperLeftPanel", label: "Seitenwand hinten links oben" },
  { key: "rearLeftFender", label: "Kotflügel hinten links" },
  { key: "lowerFrontBumper", label: "Stoßfänger vorne unten" },
  { key: "frontBumper", label: "Stoßfänger vorne" },
  { key: "frontLeftFender", label: "Kotflügel vorne links" },
  { key: "frontLeftTyre", label: "Reifen vorne links" },
  { key: "frontLeftRim", label: "Felge vorne links" },
  { key: "leftSill", label: "Seitenschweller links" },
  { key: "driverDoor", label: "Fahrertür" },
  { key: "rearLeftDoor", label: "Tür hinten links" },
  { key: "rearLeftTyre", label: "Reifen hinten links" },
  { key: "rearLeftRim", label: "Felge hinten links" },
  { key: "upperTrunkLid", label: "Heckklappe oben" },
  { key: "rearRightFender", label: "Kotflügel hinten rechts" },
  { key: "rearRightRim", label: "Felge hinten rechts" },
  { key: "rightTailLight", label: "Rückleuchte rechts" },
  { key: "rearRightTyre", label: "Reifen hinten rechts" },
  { key: "rearWindow", label: "Heckscheibe" },
  { key: "rearRightDoor", label: "Tür hinten rechts" },
  { key: "rearUpperRightPanel", label: "Seitenwand hinten rechts oben" },
  { key: "roofRear", label: "Dach hinten" },
  { key: "frontRightRim", label: "Felge vorne rechts" },
  { key: "leftTailLight", label: "Rückleuchte links" },
  { key: "rearBumper", label: "Stoßfänger hinten" },
  { key: "rightSill", label: "Seitenschweller rechts" },
  { key: "rightMirror", label: "Außenspiegel rechts" },
  { key: "frontRightWindow", label: "Seitenscheibe vorne rechts" },
  { key: "frontRightTyre", label: "Reifen vorne rechts" },
  { key: "frontRightFender", label: "Kotflügel vorne rechts" },
  { key: "frontRightDoor", label: "Tür vorne rechts" },
  { key: "lowerTrunkLid", label: "Heckklappe unten" },
  { key: "rearRightWindow", label: "Seitenscheibe hinten rechts" },
];

const getLocalizedCopy = (language, english, german) =>
  language === "de" ? german : english;

const PROBLEM_TYPE_LABELS = {
  Reifen: { en: "Tyres", de: "Reifen" },
  Service: { en: "Service", de: "Service" },
  "Technisches Problem": { en: "Technical problem", de: "Technisches Problem" },
  Schadensmeldung: { en: "Damage report", de: "Schadensmeldung" },
  "Emergency breakdown": { en: "Emergency breakdown", de: "Pannenfall" },
  Pannenfall: { en: "Emergency breakdown", de: "Pannenfall" },
};

const PROBLEM_TYPE_HINTS = {
  Reifen: {
    en: "Tyre change, puncture, or pressure loss",
    de: "Reifenwechsel, Reifenpanne oder Druckverlust",
  },
  Service: {
    en: "Routine service and general maintenance",
    de: "Regelservice und allgemeine Wartung",
  },
  "Technisches Problem": {
    en: "Warning light, electrical, engine, or brake issue",
    de: "Warnmeldung, Elektrik, Motor oder Bremse",
  },
  Schadensmeldung: {
    en: "Report body or accident damage",
    de: "Karosserie- oder Unfallschaden melden",
  },
  "Emergency breakdown": {
    en: "Vehicle breakdown or urgent roadside assistance needed",
    de: "Fahrzeugausfall oder dringende Pannenhilfe erforderlich",
  },
  Pannenfall: {
    en: "Vehicle breakdown or urgent roadside assistance needed",
    de: "Fahrzeugausfall oder dringende Pannenhilfe erforderlich",
  },
};

const CATEGORY_DETAIL_COPY = {
  Reifen: {
    selectionLabel: { en: "Tyre service type", de: "Reifenservice-Typ" },
    selectionHint: {
      en: "Choose the tyre-related service needed for your vehicle.",
      de: "Wählen Sie den reifenbezogenen Service für Ihr Fahrzeug.",
    },
    detailFieldLabel: { en: "Explain the tyre issue", de: "Reifenproblem beschreiben" },
    detailPlaceholder: {
      en: "Add details about the tyre condition, warning, axle position, or urgency.",
      de: "Geben Sie Details zum Reifenzustand, zur Warnung, zur Achsposition oder zur Dringlichkeit an.",
    },
  },
  Service: {
    selectionLabel: { en: "Service type", de: "Servicetyp" },
    selectionHint: {
      en: "Choose the service needed before selecting a Point S station.",
      de: "Wählen Sie den benötigten Service, bevor Sie eine Point-S-Station auswählen.",
    },
    detailFieldLabel: { en: "Additional notes", de: "Zusätzliche Hinweise" },
    detailPlaceholder: {
      en: "Add any relevant service notes, mileage, or symptoms if needed.",
      de: "Fügen Sie bei Bedarf relevante Servicehinweise, Kilometerstand oder Symptome hinzu.",
    },
  },
  "Technisches Problem": {
    selectionLabel: { en: "Technical problem details", de: "Details zum technischen Problem" },
    selectionHint: {
      en: "Describe the issue in the field below or upload a picture of the error message.",
      de: "Beschreiben Sie das Problem im Feld unten oder laden Sie ein Bild der Fehlermeldung hoch.",
    },
    detailFieldLabel: {
      en: "What technical problem does your vehicle have?",
      de: "Welches technische Problem hat Ihr Fahrzeug?",
    },
    detailPlaceholder: {
      en: "Describe the warning light, error message, symptoms, or when the issue started.",
      de: "Beschreiben Sie Warnleuchte, Fehlermeldung, Symptome oder wann das Problem begonnen hat.",
    },
  },
  Schadensmeldung: {
    selectionLabel: { en: "Damage report details", de: "Details zur Schadensmeldung" },
    selectionHint: {
      en: "Fill out the damage details below and upload clear pictures of the damage.",
      de: "Füllen Sie die Schadensdetails unten aus und laden Sie klare Bilder des Schadens hoch.",
    },
    detailFieldLabel: { en: "Damage details", de: "Schadensdetails" },
    detailPlaceholder: {
      en: "Describe what happened, where the damage is located, and whether the vehicle is still drivable.",
      de: "Beschreiben Sie, was passiert ist, wo sich der Schaden befindet und ob das Fahrzeug noch fahrbereit ist.",
    },
  },
  "Emergency breakdown": {
    selectionLabel: { en: "Emergency breakdown details", de: "Details zum Pannenfall" },
    selectionHint: {
      en: "Describe the breakdown and share where the vehicle stopped so urgent help can be arranged.",
      de: "Beschreiben Sie die Panne und teilen Sie mit, wo das Fahrzeug stehen geblieben ist, damit dringend Hilfe organisiert werden kann.",
    },
    detailFieldLabel: { en: "What happened?", de: "Was ist passiert?" },
    detailPlaceholder: {
      en: "Describe the breakdown, warning message, whether the vehicle is drivable, and your current location.",
      de: "Beschreiben Sie die Panne, die Warnmeldung, ob das Fahrzeug fahrbereit ist und Ihren aktuellen Standort.",
    },
  },
  Pannenfall: {
    selectionLabel: { en: "Emergency breakdown details", de: "Details zum Pannenfall" },
    selectionHint: {
      en: "Describe the breakdown and share where the vehicle stopped so urgent help can be arranged.",
      de: "Beschreiben Sie die Panne und teilen Sie mit, wo das Fahrzeug stehen geblieben ist, damit dringend Hilfe organisiert werden kann.",
    },
    detailFieldLabel: { en: "What happened?", de: "Was ist passiert?" },
    detailPlaceholder: {
      en: "Describe the breakdown, warning message, whether the vehicle is drivable, and your current location.",
      de: "Beschreiben Sie die Panne, die Warnmeldung, ob das Fahrzeug fahrbereit ist und Ihren aktuellen Standort.",
    },
  },
};

const SERVICE_VALUE_LABELS = {
  "Tyre change (seasonal change)": {
    en: "Tyre change (seasonal change)",
    de: "Reifenwechsel (saisonaler Wechsel)",
  },
  "New tyre installation": { en: "New tyre installation", de: "Neue Reifenmontage" },
  "Tyre damage": { en: "Tyre damage", de: "Reifenschaden" },
  "Tyre remounting": { en: "Tyre remounting", de: "Reifenumbereifung" },
  "TPMS problem": { en: "TPMS problem", de: "TPMS-Problem" },
  "Air pressure loss": { en: "Air pressure loss", de: "Luftdruckverlust" },
  Inspection: { en: "Inspection", de: "Inspektion" },
  "Oil change": { en: "Oil change", de: "Ölwechsel" },
  "Vehicle inspection (HU/AU)": {
    en: "Vehicle inspection (HU/AU)",
    de: "Fahrzeugprüfung (HU/AU)",
  },
  "UVV inspection": { en: "UVV inspection", de: "UVV-Prüfung" },
  "Wheel alignment": { en: "Wheel alignment", de: "Spurvermessung" },
  "Windshield wiper service": {
    en: "Windshield wiper service",
    de: "Scheibenwischer-Service",
  },
  Brakes: { en: "Brakes", de: "Bremsen" },
};

const DAMAGE_CAUSER_LABELS = {
  driver_self: { en: "Driver (self)", de: "Fahrer (selbst)" },
  other_party: { en: "Other party", de: "Andere Partei" },
  unknown: { en: "Unknown / not sure", de: "Unbekannt / nicht sicher" },
};

const DAMAGE_DRIVEABILITY_LABELS = {
  driveable: { en: "Driveable and roadworthy", de: "Fahrbereit und verkehrssicher" },
  limited: { en: "Driveable with limitations", de: "Eingeschränkt fahrbereit" },
  not_driveable: { en: "Not driveable", de: "Nicht fahrbereit" },
};

const DAMAGE_VISUAL_STATUS_LABELS = {
  "": { en: "Not checked", de: "Nicht geprüft" },
  no_damage: { en: "No damage", de: "Kein Schaden" },
  scratch: { en: "Scratch", de: "Kratzer" },
  dent: { en: "Dent", de: "Delle" },
  crack: { en: "Crack", de: "Riss" },
  broken: { en: "Broken", de: "Gebrochen" },
  other: { en: "Other", de: "Sonstiges" },
};

const DAMAGE_VISUAL_PART_LABELS = {
  frontRightHeadlight: { en: "Front right headlight", de: "Scheinwerfer vorne rechts" },
  hood: { en: "Hood", de: "Motorhaube" },
  frontLeftHeadlight: { en: "Front left headlight", de: "Scheinwerfer vorne links" },
  windshield: { en: "Windshield", de: "Windschutzscheibe" },
  roofFront: { en: "Roof (front)", de: "Dach vorne" },
  leftMirror: { en: "Left side mirror", de: "Außenspiegel links" },
  frontLeftWindow: { en: "Front left side window", de: "Seitenscheibe vorne links" },
  rearLeftWindow: { en: "Rear left side window", de: "Seitenscheibe hinten links" },
  rearUpperLeftPanel: { en: "Rear upper left panel", de: "Seitenwand hinten links oben" },
  rearLeftFender: { en: "Rear left fender", de: "Kotflügel hinten links" },
  lowerFrontBumper: { en: "Lower front bumper", de: "Stoßfänger vorne unten" },
  frontBumper: { en: "Front bumper", de: "Stoßfänger vorne" },
  frontLeftFender: { en: "Front left fender", de: "Kotflügel vorne links" },
  frontLeftTyre: { en: "Front left tyre", de: "Reifen vorne links" },
  frontLeftRim: { en: "Front left rim", de: "Felge vorne links" },
  leftSill: { en: "Left side skirt", de: "Seitenschweller links" },
  driverDoor: { en: "Driver door", de: "Fahrertür" },
  rearLeftDoor: { en: "Rear left door", de: "Tür hinten links" },
  rearLeftTyre: { en: "Rear left tyre", de: "Reifen hinten links" },
  rearLeftRim: { en: "Rear left rim", de: "Felge hinten links" },
  upperTrunkLid: { en: "Upper trunk lid", de: "Heckklappe oben" },
  rearRightFender: { en: "Rear right fender", de: "Kotflügel hinten rechts" },
  rearRightRim: { en: "Rear right rim", de: "Felge hinten rechts" },
  rightTailLight: { en: "Right tail light", de: "Rückleuchte rechts" },
  rearRightTyre: { en: "Rear right tyre", de: "Reifen hinten rechts" },
  rearWindow: { en: "Rear window", de: "Heckscheibe" },
  rearRightDoor: { en: "Rear right door", de: "Tür hinten rechts" },
  rearUpperRightPanel: { en: "Rear upper right panel", de: "Seitenwand hinten rechts oben" },
  roofRear: { en: "Roof (rear)", de: "Dach hinten" },
  frontRightRim: { en: "Front right rim", de: "Felge vorne rechts" },
  leftTailLight: { en: "Left tail light", de: "Rückleuchte links" },
  rearBumper: { en: "Rear bumper", de: "Stoßfänger hinten" },
  rightSill: { en: "Right side skirt", de: "Seitenschweller rechts" },
  rightMirror: { en: "Right side mirror", de: "Außenspiegel rechts" },
  frontRightWindow: { en: "Front right side window", de: "Seitenscheibe vorne rechts" },
  frontRightTyre: { en: "Front right tyre", de: "Reifen vorne rechts" },
  frontRightFender: { en: "Front right fender", de: "Kotflügel vorne rechts" },
  frontRightDoor: { en: "Front right door", de: "Tür vorne rechts" },
  lowerTrunkLid: { en: "Lower trunk lid", de: "Heckklappe unten" },
  rearRightWindow: { en: "Rear right side window", de: "Seitenscheibe hinten rechts" },
};

const localizeProblemType = (value, language) =>
  PROBLEM_TYPE_LABELS[value]
    ? getLocalizedCopy(language, PROBLEM_TYPE_LABELS[value].en, PROBLEM_TYPE_LABELS[value].de)
    : value;

const localizeProblemHint = (value, language, fallback = "") =>
  PROBLEM_TYPE_HINTS[value]
    ? getLocalizedCopy(language, PROBLEM_TYPE_HINTS[value].en, PROBLEM_TYPE_HINTS[value].de)
    : fallback;

const localizeServiceValue = (value, language) => {
  const localized = SERVICE_VALUE_LABELS[value] || PROBLEM_TYPE_LABELS[value];
  return localized ? getLocalizedCopy(language, localized.en, localized.de) : value;
};

const buildEmptyDamageReport = () => ({
  processNumber: "",
  plateNumber: "",
  vehicleDetails: "",
  driverFullName: "",
  driverAddress: "",
  driverPhone: "",
  driverEmail: "",
  driverLicense: "",
  driverBirthDate: "",
  damageCauser: "",
  policeRecorded: "",
  policeAuthority: "",
  incidentDateTime: "",
  incidentLocation: "",
  vehicleDriveable: "",
  vehicleLocation: "",
  damageNarrative: "",
  otherPartyName: "",
  otherPartyAddress: "",
  otherPartyPhone: "",
  otherPartyEmail: "",
  otherPartyInsurance: "",
  otherPartyClaimNumber: "",
  otherPartyVehicleModel: "",
  otherPartyVehiclePlate: "",
  injuryPersonName: "",
  injuryPersonAddress: "",
  injuryPersonPhone: "",
  injuryPersonEmail: "",
  confirmAccuracy: false,
  privacyAccepted: false,
  visualInspection: {},
});

function ServiceCategoryCard({ option, isSelected, onSelect, cardKey }) {
  const pictogram =
    problemPictogramMap[option.iconKey] || problemPictogramMap.default;
  const Icon = pictogram.icon;

  return (
    <button
      className={`min-w-0 rounded-xl border p-1.5 text-left transition sm:rounded-2xl sm:p-4 ${isSelected
        ? "border-slate-900 bg-[linear-gradient(180deg,#1f2f47_0%,#0f1d33_52%,#0a1322_100%)] text-white shadow-lg"
        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400 hover:bg-white"
        }`}
      key={cardKey || option.value}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 sm:min-h-[96px] sm:gap-2.5">
        <span
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm sm:size-11 sm:rounded-xl ${isSelected
            ? "border-white/35 bg-white/15 text-white"
            : pictogram.accentClass
            }`}
        >
          <Icon size={14} strokeWidth={2.2} className="sm:size-[18px]" />
        </span>
        <p
          className="w-full truncate text-center text-[9px] font-semibold leading-tight sm:text-sm"
          title={option.label}
        >
          {option.label}
        </p>
      </div>
    </button>
  );
}

function DriverServiceRequestSection({
  assignedVehicle = null,
  simpleIssueOptions,
  requestForm,
  setRequestForm,
  nearestPosOptions,
  selectedPos,
  slotAvailability,
  selectedSlot,
  isServiceRequestFormReady,
  isSubmittingRequest,
  tyreWaitlistNotice,
  onCloseTyreWaitlistNotice,
  onPhotoChange,
  policyValidation,
  lastRecordedOdometer,
  odometerError,
  odometerRecommendation,
  eligibilityClass,
  handleSubmitSimpleRequest,
  wizardFeedback,
  driverServiceRequests,
  selectedRequest,
  setSelectedRequestId,
  requestStatusClass,
  formatDateTime,
  currentDriverProfile = null,
}) {
  const { t, language } = useTranslation();
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceOrder, setServiceOrder] = useState(() =>
    simpleIssueOptions.map((option) => option.value),
  );
  const [showAllStations, setShowAllStations] = useState(false);
  const [stationSearch, setStationSearch] = useState("");
  const [debouncedStationSearch, setDebouncedStationSearch] = useState("");
  const [visibleStationCount, setVisibleStationCount] = useState(
    STATION_MODAL_BATCH_SIZE,
  );
  const [isLoadingMoreStations, setIsLoadingMoreStations] = useState(false);
  const lastStationModalScrollAt = useRef(0);
  const loadMoreTimeoutRef = useRef(null);
  const nextSectionScrollTimeoutRef = useRef(null);
  const nearestPosSectionRef = useRef(null);
  const serviceDetailsSectionRef = useRef(null);
  const dateSlotSectionRef = useRef(null);
  const optionalDetailsSectionRef = useRef(null);
  const photoInputRef = useRef(null);
  const inlineServiceLimit = 6;
  const inlineStationLimit = 6;
  const categoryDetails = useMemo(
    () => getCategoryDetails(requestForm.problemType),
    [requestForm.problemType],
  );
  const categorySubOptions = useMemo(
    () => getCategorySubOptions(requestForm.problemType),
    [requestForm.problemType],
  );
  const requiresSubtype = useMemo(
    () => doesCategoryRequireSubtype(requestForm.problemType),
    [requestForm.problemType],
  );
  const requiresDescription = useMemo(
    () =>
      doesCategoryRequireDescription(
        requestForm.problemType,
        requestForm.problemSubtype,
      ),
    [requestForm.problemSubtype, requestForm.problemType],
  );
  const requiresPhotos = useMemo(
    () => doesCategoryRequirePhotos(requestForm.problemType),
    [requestForm.problemType],
  );
  const orderedServiceOptions = useMemo(() => {
    const localizedOptions = simpleIssueOptions.map((option) => ({
      ...option,
      label: localizeProblemType(option.value, language),
      hint: localizeProblemHint(option.value, language, option.hint),
    }));
    const byValue = new Map(
      localizedOptions.map((option) => [option.value, option]),
    );
    const ordered = serviceOrder
      .map((value) => byValue.get(value))
      .filter(Boolean);
    const missing = localizedOptions.filter(
      (option) => !serviceOrder.includes(option.value),
    );
    return [...ordered, ...missing];
  }, [language, serviceOrder, simpleIssueOptions]);
  const inlineServiceOptions = useMemo(
    () => orderedServiceOptions.slice(0, inlineServiceLimit),
    [orderedServiceOptions],
  );
  const hasMoreServices = orderedServiceOptions.length > inlineServiceLimit;
  const inlineStations = useMemo(() => {
    const base = nearestPosOptions.slice(0, inlineStationLimit);
    if (!selectedPos) {
      return base;
    }
    const isInBase = base.some((station) => station.id === selectedPos.id);
    if (isInBase) {
      return base;
    }
    if (base.length < inlineStationLimit) {
      return [...base, selectedPos];
    }
    return [...base.slice(0, inlineStationLimit - 1), selectedPos];
  }, [nearestPosOptions, selectedPos]);
  const hasMoreStations = nearestPosOptions.length > inlineStationLimit;
  const totalStationsCount = nearestPosOptions.length;
  const selectedServiceOption = useMemo(
    () =>
      simpleIssueOptions.find(
        (item) => String(item.value || "").trim() === requestForm.problemType,
      ) || null,
    [requestForm.problemType, simpleIssueOptions],
  );
  const localizedCategoryDetails = useMemo(() => {
    const detailCopy = CATEGORY_DETAIL_COPY[requestForm.problemType];
    if (!detailCopy) {
      return categoryDetails;
    }
    return {
      ...categoryDetails,
      selectionLabel: getLocalizedCopy(
        language,
        detailCopy.selectionLabel.en,
        detailCopy.selectionLabel.de,
      ),
      selectionHint: getLocalizedCopy(
        language,
        detailCopy.selectionHint.en,
        detailCopy.selectionHint.de,
      ),
      detailFieldLabel: getLocalizedCopy(
        language,
        detailCopy.detailFieldLabel.en,
        detailCopy.detailFieldLabel.de,
      ),
      detailPlaceholder: getLocalizedCopy(
        language,
        detailCopy.detailPlaceholder.en,
        detailCopy.detailPlaceholder.de,
      ),
    };
  }, [categoryDetails, language, requestForm.problemType]);
  const localizedCategorySubOptions = useMemo(
    () =>
      categorySubOptions.map((option) => ({
        ...option,
        label: localizeServiceValue(option.value, language),
      })),
    [categorySubOptions, language],
  );
  const localizedDamageCauserOptions = useMemo(
    () =>
      DAMAGE_CAUSER_OPTIONS.map((option) => ({
        ...option,
        label: getLocalizedCopy(
          language,
          DAMAGE_CAUSER_LABELS[option.value]?.en || option.label,
          DAMAGE_CAUSER_LABELS[option.value]?.de || option.label,
        ),
      })),
    [language],
  );
  const localizedDamageDriveabilityOptions = useMemo(
    () =>
      DAMAGE_DRIVEABILITY_OPTIONS.map((option) => ({
        ...option,
        label: getLocalizedCopy(
          language,
          DAMAGE_DRIVEABILITY_LABELS[option.value]?.en || option.label,
          DAMAGE_DRIVEABILITY_LABELS[option.value]?.de || option.label,
        ),
      })),
    [language],
  );
  const localizedDamageVisualStatusOptions = useMemo(
    () =>
      DAMAGE_VISUAL_STATUS_OPTIONS.map((option) => ({
        ...option,
        label: getLocalizedCopy(
          language,
          DAMAGE_VISUAL_STATUS_LABELS[option.value]?.en || option.label,
          DAMAGE_VISUAL_STATUS_LABELS[option.value]?.de || option.label,
        ),
      })),
    [language],
  );
  const localizedDamageVisualParts = useMemo(
    () =>
      DAMAGE_VISUAL_PARTS.map((part) => ({
        ...part,
        label: getLocalizedCopy(
          language,
          DAMAGE_VISUAL_PART_LABELS[part.key]?.en || part.label,
          DAMAGE_VISUAL_PART_LABELS[part.key]?.de || part.label,
        ),
      })),
    [language],
  );
  const needsTyreSupplySelection = useMemo(
    () =>
      requiresTyreSupplySelection(
        requestForm.problemType,
        requestForm.problemSubtype,
      ),
    [requestForm.problemSubtype, requestForm.problemType],
  );
  const isDamageReportFlow = useMemo(
    () => String(requestForm.problemType || "").trim() === "Schadensmeldung",
    [requestForm.problemType],
  );
  const isTyreStockBlocked =
    needsTyreSupplySelection &&
    requestForm.tyreSupplySource === "pos" &&
    requestForm.posTyreAvailability === false;
  const isDriverBringingTyres =
    needsTyreSupplySelection && requestForm.tyreSupplySource === "driver";
  const requiredTyreQty = useMemo(
    () => (needsTyreSupplySelection ? 4 : 1),
    [needsTyreSupplySelection],
  );
  const tyreAvailabilityForSelectedSubtype = useMemo(() => {
    if (!needsTyreSupplySelection) {
      return null;
    }
    return evaluateTyreStock({
      size: assignedVehicle?.tyreSpecs?.size || "",
      preferredBrand: assignedVehicle?.tyreSpecs?.brand || "",
      requiredQty: requiredTyreQty,
    });
  }, [
    assignedVehicle?.tyreSpecs?.brand,
    assignedVehicle?.tyreSpecs?.size,
    needsTyreSupplySelection,
    requiredTyreQty,
  ]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedStationSearch(stationSearch);
      if (showAllStations) {
        setVisibleStationCount(STATION_MODAL_BATCH_SIZE);
        lastStationModalScrollAt.current = 0;
        setIsLoadingMoreStations(false);
      }
    }, STATION_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timerId);
  }, [showAllStations, stationSearch]);

  useEffect(
    () => () => {
      if (loadMoreTimeoutRef.current) {
        window.clearTimeout(loadMoreTimeoutRef.current);
      }
      if (nextSectionScrollTimeoutRef.current) {
        window.clearTimeout(nextSectionScrollTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (requestForm.photos.length === 0 && photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }, [requestForm.photos.length]);

  const scrollToSection = (targetRef) => {
    if (!targetRef?.current) {
      return;
    }
    if (nextSectionScrollTimeoutRef.current) {
      window.clearTimeout(nextSectionScrollTimeoutRef.current);
    }
    nextSectionScrollTimeoutRef.current = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  const filteredStations = useMemo(() => {
    const query = debouncedStationSearch.trim().toLowerCase();
    if (!query) {
      return nearestPosOptions;
    }
    return nearestPosOptions.filter((pos) => {
      const tags = Array.isArray(pos.capabilities)
        ? pos.capabilities.join(" ")
        : "";
      return `${pos.name} ${pos.address} ${tags}`.toLowerCase().includes(query);
    });
  }, [nearestPosOptions, debouncedStationSearch]);
  const visibleFilteredStations = useMemo(
    () => filteredStations.slice(0, visibleStationCount),
    [filteredStations, visibleStationCount],
  );
  const hasMoreFilteredStations =
    visibleFilteredStations.length < filteredStations.length;
  const isSearchDebouncing = stationSearch !== debouncedStationSearch;
  const dateChips = useMemo(
    () =>
      buildDateChips(
        requestForm.preferredDate || new Date().toISOString().slice(0, 10),
      ),
    [requestForm.preferredDate],
  );
  const photoPreviews = useMemo(
    () =>
      requestForm.photos.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
      })),
    [requestForm.photos],
  );

  useEffect(
    () => () => {
      photoPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    },
    [photoPreviews],
  );
  const damageReport = requestForm.damageReport || {};
  const updateDamageReportField = (field, value) => {
    setRequestForm((prev) => {
      const nextDamageReport = {
        ...(prev.damageReport || {}),
        [field]: value,
      };
      return {
        ...prev,
        damageReport: nextDamageReport,
        ...(field === "damageNarrative" ? { description: value } : {}),
      };
    });
  };
  const updateDamageVisualField = (field, value) => {
    setRequestForm((prev) => ({
      ...prev,
      damageReport: {
        ...(prev.damageReport || {}),
        visualInspection: {
          ...((prev.damageReport && prev.damageReport.visualInspection) || {}),
          [field]: value,
        },
      },
    }));
  };
  useEffect(() => {
    if (!isDamageReportFlow) {
      return;
    }
    setRequestForm((prev) => {
      const current = prev.damageReport || buildEmptyDamageReport();
      const next = { ...current };
      let didChange = false;
      if (!String(current.plateNumber || "").trim() && assignedVehicle?.plate) {
        next.plateNumber = assignedVehicle.plate;
        didChange = true;
      }
      if (!String(current.vehicleDetails || "").trim()) {
        const autoVehicleDetails = [assignedVehicle?.model, assignedVehicle?.id]
          .filter(Boolean)
          .join(" | ");
        if (autoVehicleDetails) {
          next.vehicleDetails = autoVehicleDetails;
          didChange = true;
        }
      }
      if (
        !String(current.driverFullName || "").trim() &&
        String(currentDriverProfile?.name || "").trim()
      ) {
        next.driverFullName = String(currentDriverProfile.name).trim();
        didChange = true;
      }
      if (
        !String(current.driverEmail || "").trim() &&
        String(currentDriverProfile?.email || "").trim()
      ) {
        next.driverEmail = String(currentDriverProfile.email).trim();
        didChange = true;
      }
      if (
        !String(current.driverPhone || "").trim() &&
        String(currentDriverProfile?.phone || "").trim()
      ) {
        next.driverPhone = String(currentDriverProfile.phone).trim();
        didChange = true;
      }
      if (
        !String(current.driverLicense || "").trim() &&
        String(currentDriverProfile?.license || "").trim()
      ) {
        next.driverLicense = String(currentDriverProfile.license).trim();
        didChange = true;
      }
      if (
        !String(current.driverAddress || "").trim() &&
        String(currentDriverProfile?.contactAddress || "").trim()
      ) {
        next.driverAddress = String(currentDriverProfile.contactAddress).trim();
        didChange = true;
      }
      return didChange ? { ...prev, damageReport: next } : prev;
    });
  }, [
    assignedVehicle?.id,
    assignedVehicle?.model,
    assignedVehicle?.plate,
    currentDriverProfile?.contactAddress,
    currentDriverProfile?.email,
    currentDriverProfile?.license,
    currentDriverProfile?.name,
    currentDriverProfile?.phone,
    isDamageReportFlow,
    setRequestForm,
  ]);
  const handleServiceSelect = (
    serviceValue,
    { closeModal = false, moveToIndex = null } = {},
  ) => {
    setRequestForm((prev) => ({
      ...prev,
      problemType: serviceValue,
      problemSubtype: "",
      description: "",
      photos: [],
      preferredPosId: "",
      preferredDate: "",
      preferredSlotId: "",
      tyreSupplySource: "",
      posTyreAvailability: null,
      damageReport: buildEmptyDamageReport(),
    }));
    if (moveToIndex !== null && Number.isInteger(moveToIndex)) {
      setServiceOrder((prev) => {
        const withoutSelected = prev.filter((value) => value !== serviceValue);
        const targetIndex = Math.max(
          0,
          Math.min(moveToIndex, withoutSelected.length),
        );
        return [
          ...withoutSelected.slice(0, targetIndex),
          serviceValue,
          ...withoutSelected.slice(targetIndex),
        ];
      });
    }
    if (closeModal) {
      setShowAllServices(false);
    }
    scrollToSection(serviceDetailsSectionRef);
  };
  const handleSubtypeSelect = (subtypeValue) => {
    setRequestForm((prev) => ({
      ...prev,
      problemSubtype: subtypeValue,
      preferredPosId: "",
      preferredDate: "",
      preferredSlotId: "",
      tyreSupplySource: "",
      posTyreAvailability: null,
      damageReport: buildEmptyDamageReport(),
    }));
    scrollToSection(nearestPosSectionRef);
  };
  const policyStatusLabel = t("driver.request.covered", "Abgedeckt");
  const policyStatusClass = eligibilityClass("Allowed");
  const recommendationTone = useMemo(() => {
    if (!odometerRecommendation) {
      return {
        card: "",
        badge: "",
        icon: "bg-slate-100 text-slate-700",
        check: "accent-slate-700",
      };
    }
    if (odometerRecommendation.level === "high") {
      return {
        card: "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-50 to-orange-50",
        badge: "bg-rose-600 text-white",
        icon: "bg-rose-100 text-rose-700",
        check: "accent-rose-600",
      };
    }
    if (odometerRecommendation.level === "medium") {
      return {
        card: "border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50",
        badge: "bg-amber-600 text-white",
        icon: "bg-amber-100 text-amber-700",
        check: "accent-amber-600",
      };
    }
    return {
      card: "border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50",
      badge: "bg-sky-600 text-white",
      icon: "bg-sky-100 text-sky-700",
      check: "accent-sky-600",
    };
  }, [odometerRecommendation]);
  const clearAllPhotos = () => {
    setRequestForm((prev) => ({ ...prev, photos: [] }));
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };
  const removePhotoById = (photoId) => {
    setRequestForm((prev) => ({
      ...prev,
      photos: prev.photos.filter(
        (file) => `${file.name}-${file.size}-${file.lastModified}` !== photoId,
      ),
    }));
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };
  const applyPosSelection = (
    pos,
    {
      closeOnSelect = false,
      tyreSupplySource = "",
      posTyreAvailability = null,
    } = {},
  ) => {
    if (!pos?.id) {
      return;
    }
    setRequestForm((prev) => ({
      ...prev,
      preferredPosId: pos.id,
      preferredSlotId: "",
      tyreSupplySource,
      posTyreAvailability,
      preferredDate:
        tyreSupplySource === "pos" && posTyreAvailability === false
          ? ""
          : prev.preferredDate,
    }));
    if (closeOnSelect) {
      setShowAllStations(false);
    }
    scrollToSection(dateSlotSectionRef);
  };
  const handlePosSelection = (pos, { closeOnSelect = false } = {}) => {
    if (!needsTyreSupplySelection) {
      applyPosSelection(pos, {
        closeOnSelect,
        tyreSupplySource: "",
        posTyreAvailability: null,
      });
      return;
    }
    if (requestForm.tyreSupplySource === "driver") {
      applyPosSelection(pos, {
        closeOnSelect,
        tyreSupplySource: "driver",
        posTyreAvailability: true,
      });
      return;
    }
    const stockCheck = evaluateTyreStock({
      size: assignedVehicle?.tyreSpecs?.size || "",
      preferredBrand: assignedVehicle?.tyreSpecs?.brand || "",
      requiredQty: requiredTyreQty,
    });
    applyPosSelection(pos, {
      closeOnSelect,
      tyreSupplySource: "pos",
      posTyreAvailability: Boolean(stockCheck.canFulfill),
    });
  };
  const handleDriverTyreToggle = (checked) => {
    if (!needsTyreSupplySelection) {
      return;
    }
    if (checked) {
      setRequestForm((prev) => ({
        ...prev,
        tyreSupplySource: "driver",
        posTyreAvailability: true,
      }));
      return;
    }

    if (!selectedPos?.id) {
      setRequestForm((prev) => ({
        ...prev,
        tyreSupplySource: "pos",
        posTyreAvailability: null,
        preferredDate: "",
        preferredSlotId: "",
      }));
      return;
    }

    const stockCheck = evaluateTyreStock({
      size: assignedVehicle?.tyreSpecs?.size || "",
      preferredBrand: assignedVehicle?.tyreSpecs?.brand || "",
      requiredQty: requiredTyreQty,
    });
    const available = Boolean(stockCheck.canFulfill);
    setRequestForm((prev) => ({
      ...prev,
      tyreSupplySource: "pos",
      posTyreAvailability: available,
      preferredDate: available ? prev.preferredDate : "",
      preferredSlotId: available ? prev.preferredSlotId : "",
    }));
  };
  const renderStationCard = (
    pos,
    { closeOnSelect = false, isRecommended = false } = {},
  ) => {
    const isSelected = requestForm.preferredPosId === pos.id;
    return (
      <button
        className={`relative min-w-0 rounded-xl border p-2.5 text-left transition sm:p-3 ${isSelected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
          } ${isRecommended && !isSelected
            ? "ring-1 ring-violet-300/70 ring-offset-1 ring-offset-white"
            : ""
          }`}
        key={pos.id}
        onClick={() => handlePosSelection(pos, { closeOnSelect })}
        type="button"
      >
        {isRecommended ? (
          <span
            className={`pointer-events-none absolute -top-1.5 left-1/2 z-20 inline-flex -translate-x-1/2 rounded-full border px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.05em] shadow-lg ${isSelected
              ? "border-amber-200 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 text-amber-950"
              : "border-fuchsia-200 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white"
              }`}
          >
            Recommended
          </span>
        ) : null}
        <div className="flex min-h-[110px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {pos.type === "PointS" ? (
                <p
                  className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${isSelected
                    ? "bg-white/20 text-slate-100"
                    : "bg-sky-100 text-sky-700"
                    }`}
                >
                  PoS Partner
                </p>
              ) : null}
              <p
                className="truncate text-[13px] font-semibold leading-5 sm:text-sm"
                title={pos.name}
              >
                {pos.name}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${isSelected
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
                }`}
            >
              {pos.distanceKm} km
            </span>
          </div>
          <p
            className={`mt-1 truncate text-[11px] sm:text-xs ${isSelected ? "text-slate-200" : "text-slate-600"}`}
            title={pos.address}
          >
            {pos.address}
          </p>
          <p
            className={`mt-1 text-[11px] sm:text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}
          >
            {t("driver.request.etaMinutes", {
              defaultValue: "ETA {{count}} Min.",
              count: pos.etaMin,
            })}
          </p>
          {needsTyreSupplySelection && tyreAvailabilityForSelectedSubtype ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tyreAvailabilityForSelectedSubtype.canFulfill
                  ? isSelected
                    ? "bg-emerald-200/30 text-emerald-100"
                    : "bg-emerald-100 text-emerald-700"
                  : isSelected
                    ? "bg-rose-200/30 text-rose-100"
                    : "bg-rose-100 text-rose-700"
                  }`}
              >
                {tyreAvailabilityForSelectedSubtype.canFulfill
                  ? t("driver.request.tyresAvailableShort", "Reifen verfügbar")
                  : t("driver.request.tyresUnavailableShort", "Reifen nicht verfügbar")}
              </span>
              <span
                className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
              >
                {tyreAvailabilityForSelectedSubtype.totalAvailable}/
                {requiredTyreQty} {t("driver.request.availableCountSuffix", "verfügbar")}
              </span>
            </div>
          ) : null}
          {Array.isArray(pos.capabilities) && pos.capabilities.length > 0 ? (
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {pos.capabilities.slice(0, 3).map((tag) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] ${isSelected
                    ? "bg-white/20 text-slate-100"
                    : "bg-slate-200 text-slate-700"
                    }`}
                  key={`${pos.id}-${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
    );
  };
  const handleStationModalScroll = (event) => {
    const now = Date.now();
    if (
      now - lastStationModalScrollAt.current <
      STATION_MODAL_SCROLL_THROTTLE_MS
    ) {
      return;
    }
    lastStationModalScrollAt.current = now;

    const target = event.currentTarget;
    const isNearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 72;
    if (!isNearBottom) {
      return;
    }
    if (
      isLoadingMoreStations ||
      visibleStationCount >= filteredStations.length
    ) {
      return;
    }

    setIsLoadingMoreStations(true);
    if (loadMoreTimeoutRef.current) {
      window.clearTimeout(loadMoreTimeoutRef.current);
    }
    loadMoreTimeoutRef.current = window.setTimeout(() => {
      setVisibleStationCount((prev) =>
        Math.min(prev + STATION_MODAL_BATCH_SIZE, filteredStations.length),
      );
      setIsLoadingMoreStations(false);
    }, 140);
  };
  const recentDriverRequests = useMemo(
    () => driverServiceRequests.slice(0, 4),
    [driverServiceRequests],
  );
  const bestRecommendedStation = useMemo(() => {
    if (nearestPosOptions.length === 0) {
      return null;
    }

    const requestedType = normalizeText(requestForm.problemType);
    const requestedCapability = String(selectedServiceOption?.capability || "")
      .trim()
      .toLowerCase();

    const rankedStations = nearestPosOptions
      .map((pos) => {
        const posName = normalizeText(pos.name);
        const distanceKm = Number(pos.distanceKm || 0);
        const etaMin = Number(pos.etaMin || 0);
        const capabilityMatch = requestedCapability
          ? Array.isArray(pos.capabilities) &&
          pos.capabilities
            .map((item) => String(item).trim().toLowerCase())
            .includes(requestedCapability)
          : false;

        let totalHistoryVisits = 0;
        let sameIssueVisits = 0;
        driverServiceRequests.forEach((order) => {
          const vendor = normalizeText(order?.orderDetails?.vendor || "");
          if (
            !vendor ||
            (!vendor.includes(posName) && !posName.includes(vendor))
          ) {
            return;
          }
          totalHistoryVisits += 1;
          const serviceType = normalizeText(order?.serviceType || "");
          if (requestedType && serviceType.includes(requestedType)) {
            sameIssueVisits += 1;
          }
        });

        const baseScore = 100 - distanceKm * 2.8 - etaMin * 0.45;
        const historyScore = totalHistoryVisits * 6 + sameIssueVisits * 10;
        const capabilityScore = capabilityMatch ? 7 : 0;
        const score = baseScore + historyScore + capabilityScore;

        const confidence = Math.max(
          62,
          Math.min(
            96,
            Math.round(
              70 +
              Math.max(0, 10 - distanceKm) +
              Math.min(12, totalHistoryVisits * 3 + sameIssueVisits * 4),
            ),
          ),
        );

        const reasons = [];
        if (distanceKm <= 8) {
          reasons.push(t("driver.request.reasonNearbyLocation", "Nahe gelegener Standort"));
        }
        if (etaMin <= 20) {
          reasons.push(t("driver.request.reasonFastEta", "Schnelle ETA"));
        }
        if (sameIssueVisits > 0) {
          reasons.push(
            t("driver.request.reasonSimilarPastService", {
              defaultValue: "{{count}} vergleichbare frühere Servicefälle",
              count: sameIssueVisits,
            }),
          );
        } else if (totalHistoryVisits > 0) {
          reasons.push(
            t("driver.request.reasonPastVisit", {
              defaultValue: "{{count}} früherer Besuch",
              count: totalHistoryVisits,
            }),
          );
        }
        if (capabilityMatch) {
          reasons.push(t("driver.request.reasonServiceMatch", "Passende Servicekompetenz"));
        }

        return {
          pos,
          score,
          confidence,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score || a.pos.distanceKm - b.pos.distanceKm);

    return rankedStations[0] || null;
  }, [
    driverServiceRequests,
    nearestPosOptions,
    requestForm.problemType,
    selectedServiceOption?.capability,
  ]);
  const bestSlotRecommendation = useMemo(() => {
    const freeSlots = slotAvailability.filter((slot) => slot.status === "Free");
    if (freeSlots.length === 0 || !selectedPos || !requestForm.preferredDate) {
      return null;
    }

    const selectedPosName = normalizeText(selectedPos.name);
    const requestedType = normalizeText(requestForm.problemType);
    const historyBySlot = new Map();

    driverServiceRequests.forEach((order) => {
      const appointmentAt = order?.appointment?.dateTime;
      if (!appointmentAt) {
        return;
      }
      const vendor = normalizeText(order?.orderDetails?.vendor || "");
      if (
        vendor &&
        selectedPosName &&
        !vendor.includes(selectedPosName) &&
        !selectedPosName.includes(vendor)
      ) {
        return;
      }
      const serviceType = normalizeText(order?.serviceType || "");
      if (
        requestedType &&
        serviceType &&
        !serviceType.includes(requestedType)
      ) {
        return;
      }
      const slotKey = getSlotKeyFromDateTime(appointmentAt);
      if (!slotKey) {
        return;
      }
      const requestedAtTs = toTimestamp(order?.requestedAt);
      const appointmentTs = toTimestamp(appointmentAt);
      const delayHours =
        requestedAtTs > 0 && appointmentTs > requestedAtTs
          ? (appointmentTs - requestedAtTs) / (1000 * 60 * 60)
          : null;

      const existing = historyBySlot.get(slotKey) || {
        count: 0,
        totalDelayHours: 0,
        withDelayCount: 0,
      };
      existing.count += 1;
      if (delayHours !== null) {
        existing.totalDelayHours += delayHours;
        existing.withDelayCount += 1;
      }
      historyBySlot.set(slotKey, existing);
    });

    const ranked = freeSlots
      .map((slot, index) => {
        const history = historyBySlot.get(slot.slotTime) || null;
        const avgDelayHours =
          history && history.withDelayCount > 0
            ? history.totalDelayHours / history.withDelayCount
            : null;
        const queuePenalty = Number(slot.queue || 0) * 2.1;
        const delayPenalty =
          avgDelayHours !== null ? Math.min(16, avgDelayHours * 0.8) : 4.5;
        const congestionPenalty =
          history && history.count > 0
            ? Math.min(5, history.count * 0.35)
            : 1.5;
        const orderingPenalty = index * 0.12;
        const score =
          queuePenalty + delayPenalty + congestionPenalty + orderingPenalty;

        const reasons = [];
        if (Number(slot.queue || 0) <= 1) {
          reasons.push(t("driver.request.reasonLowestLiveQueue", "Kürzeste aktuelle Warteschlange"));
        }
        if (avgDelayHours !== null && avgDelayHours <= 12) {
          reasons.push(t("driver.request.reasonLowDelay", "Historisch geringe Verzögerung"));
        }
        if (history && history.count > 0) {
          reasons.push(
            t("driver.request.reasonSimilarPastBookings", {
              defaultValue: "{{count}} vergleichbare frühere Buchungen",
              count: history.count,
            }),
          );
        }

        return {
          slot,
          score,
          avgDelayHours,
          historyCount: history?.count || 0,
          reasons,
        };
      })
      .sort((a, b) => a.score - b.score);

    const winner = ranked[0];
    if (!winner) {
      return null;
    }
    const runnerUp = ranked[1];
    const scoreGap = runnerUp
      ? Math.max(0, runnerUp.score - winner.score)
      : 2.5;
    const confidence = Math.max(
      61,
      Math.min(
        95,
        Math.round(
          70 +
          Math.min(12, scoreGap * 5) +
          Math.min(8, winner.historyCount * 2),
        ),
      ),
    );

    return {
      ...winner,
      confidence,
    };
  }, [
    driverServiceRequests,
    requestForm.preferredDate,
    requestForm.problemType,
    selectedPos,
    slotAvailability,
  ]);

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      {isSubmittingRequest ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-2xl">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Sending service request...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait while we submit your details.
            </p>
          </div>
        </div>
      ) : null}
      {tyreWaitlistNotice ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900 sm:text-lg">
                  {t("driver.request.tyreAvailabilityUpdate", "Aktualisierung zur Reifenverfügbarkeit")}
                </p>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  {t(
                    "driver.request.tyreAvailabilityUpdateDesc",
                    "Ihre Anfrage wurde gesendet. Wir informieren Sie, sobald Reifen verfügbar sind. Danach können Sie Datum und Zeitfenster wählen.",
                  )}
                </p>
              </div>
              <Button
                onClick={onCloseTyreWaitlistNotice}
                type="button"
                variant="outline"
              >
                {t("driver.request.close", "Schließen")}
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900 sm:text-sm">
              <p>
                {t("driver.request.requestId", "Anfrage-ID")}:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.orderId || t("driver.request.pending", "Ausstehend")}
                </span>
              </p>
              <p className="mt-1">
                {t("driver.request.station", "Station")}:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.stationName || t("driver.request.selectedPointS", "Ausgewählter Point S")}
                </span>
              </p>
              <p className="mt-1">
                {t("driver.request.tyreSpec", "Reifenspezifikation")}:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.tyreSize || t("driver.request.notAvailable", "k. A.")}
                </span>
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                onClick={onCloseTyreWaitlistNotice}
                type="button"
              >
                {t("driver.request.okGotIt", "Verstanden")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {t("driver.request.serviceCategory", "Servicekategorie")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {t("driver.request.serviceCategoryHint", "Serviceoptionen der ersten Ebene mit schneller visueller Auswahl.")}
            </p>
            <div className="mt-4 flex justify-end">
              {hasMoreServices ? (
                <Button
                  onClick={() => setShowAllServices(true)}
                  type="button"
                  variant="outline"
                >
                  {t("driver.request.seeAllServices", "Alle Services anzeigen")}
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                {inlineServiceOptions.map((option) => (
                  <ServiceCategoryCard
                    cardKey={option.value}
                    isSelected={requestForm.problemType === option.value}
                    key={option.value}
                    onSelect={() => handleServiceSelect(option.value)}
                    option={option}
                  />
                ))}
              </div>
            </div>
          </div>

          {requestForm.problemType ? (
            <div
              className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5"
              ref={serviceDetailsSectionRef}
            >
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                {localizedCategoryDetails?.selectionLabel || t("driver.request.serviceDetails", "Servicedetails")}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {localizedCategoryDetails?.selectionHint ||
                  t("driver.request.serviceDetailsHint", "Wählen Sie das passende Servicedetail, bevor Sie buchen.")}
              </p>
              {localizedCategorySubOptions.length > 0 ? (
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {localizedCategorySubOptions.map((option) => {
                    const isSelected =
                      requestForm.problemSubtype === option.value;
                    return (
                      <button
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                        }`}
                        key={option.value}
                        onClick={() => handleSubtypeSelect(option.value)}
                        type="button"
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        {option.requiresExplanation ? (
                          <p
                            className={`mt-1 text-xs ${
                              isSelected ? "text-slate-200" : "text-amber-700"
                            }`}
                          >
                            {t("driver.request.explanationRequired", "Erläuterung erforderlich")}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {requestForm.problemType === "Technisches Problem" ? (
                    <p>
                      {t("driver.request.technicalProblemHelp", "Bitte beschreiben Sie das Problem im Feld unten oder laden Sie ein Bild der Fehlermeldung hoch.")}
                    </p>
                  ) : requestForm.problemType === "Schadensmeldung" ? (
                    <p>
                      {t("driver.request.damageReportHelp", "Bitte füllen Sie die Schadensdetails unten aus und laden Sie klare Bilder des Schadens hoch.")}
                    </p>
                  ) : (
                    <p>{t("driver.request.selectDetails", "Wählen Sie unten die Details aus, um fortzufahren.")}</p>
                  )}
                </div>
              )}
              {requiresSubtype && !requestForm.problemSubtype ? (
                <p className="mt-3 text-xs text-amber-700">
                  {t("driver.request.selectOneService", "Wählen Sie einen Service aus, um fortzufahren")}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isDamageReportFlow ? (
            <>
              <div
                className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
                ref={nearestPosSectionRef}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                      {t("driver.request.nearestPos", "Nächstgelegener Point of Sale")}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasMoreStations ? (
                      <Button
                        className="group border-sky-200 bg-gradient-to-r from-white to-sky-50 text-slate-800 shadow-sm transition hover:border-sky-300 hover:from-sky-50 hover:to-sky-100"
                        onClick={() => {
                          setVisibleStationCount(STATION_MODAL_BATCH_SIZE);
                          lastStationModalScrollAt.current = 0;
                          setIsLoadingMoreStations(false);
                          setShowAllStations(true);
                        }}
                        type="button"
                        variant="outline"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <MapPin size={12} />
                          </span>
                          <span>{t("driver.request.seeAll", "Alle anzeigen")}</span>
                          <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {totalStationsCount}
                          </span>
                        </span>
                      </Button>
                    ) : null}
                  </div>
                </div>
                {bestRecommendedStation ? (
                  <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800 sm:text-sm">
                        <Sparkles size={14} />
                        {t("driver.request.bestPosRecommendation", "Beste Point-S-Empfehlung")}
                      </p>
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white sm:text-[11px]">
                        {t("driver.request.percentMatch", {
                          defaultValue: "{{count}}% Treffer",
                          count: bestRecommendedStation.confidence,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {bestRecommendedStation.pos.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                      {bestRecommendedStation.reasons.length > 0
                        ? bestRecommendedStation.reasons.join(" • ")
                        : t("driver.request.balancedScore", "Ausgewogener Score aus Entfernung, ETA und Service-Eignung")}
                    </p>
                    {/* <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-600 sm:text-xs">
                      <span>
                        {bestRecommendedStation.pos.distanceKm} km • ETA{" "}
                        {bestRecommendedStation.pos.etaMin} min
                      </span>
                      <Button
                        className="h-7 px-2.5 text-[11px] sm:text-xs"
                        onClick={() =>
                          handlePosSelection(bestRecommendedStation.pos, {
                            closeOnSelect: false,
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        {requestForm.preferredPosId === bestRecommendedStation.pos.id
                          ? "Selected"
                          : "Select recommended"}
                      </Button>
                    </div> */}
                  </div>
                ) : null}
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[520px]:grid-cols-2 lg:grid-cols-3">
                  {inlineStations.length === 0 ? (
                    <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      {t("driver.request.noNearbyPos", "Keine nahegelegenen Point-S-Stationen für die gewählte Servicekategorie gefunden.")}
                    </p>
                  ) : (
                    inlineStations.map((pos) =>
                      renderStationCard(pos, {
                        isRecommended:
                          bestRecommendedStation?.pos?.id === pos.id,
                      }),
                    )
                  )}
                </div>
              </div>

              <div
                className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
                ref={dateSlotSectionRef}
              >
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {t("driver.request.selectDateSlot", "Datum und Zeitfenster wählen")}
                </h2>

                {isTyreStockBlocked ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:text-sm">
                    {t("driver.request.tyresUnavailable", "Reifen sind aktuell beim gewählten POS für diesen Service nicht verfügbar. Wir informieren Sie, sobald Reifen verfügbar sind, dann können Sie Datum und Zeitfenster buchen.")}
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {dateChips.map((chip) => {
                    const active = requestForm.preferredDate === chip.id;
                    return (
                      <button
                        className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs transition sm:text-sm ${
                          isTyreStockBlocked
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                        }`}
                        disabled={isTyreStockBlocked}
                        key={chip.id}
                        onClick={() =>
                          setRequestForm((prev) => ({
                            ...prev,
                            preferredDate: chip.id,
                            preferredSlotId: "",
                          }))
                        }
                        type="button"
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
                {bestSlotRecommendation && !isTyreStockBlocked ? (
                  <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-800 sm:text-sm">
                        <Sparkles size={14} />
                        {t("driver.request.bestSlotRecommendation", "Beste Slot-Empfehlung")}
                      </p>
                      {/* <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white sm:text-[11px]">
                        {bestSlotRecommendation.confidence}% match
                      </span> */}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {bestSlotRecommendation.slot.label}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                        {bestSlotRecommendation.reasons.length > 0
                          ? bestSlotRecommendation.reasons.join(" • ")
                          : t("driver.request.slotChosenHint", "Gewählt anhand aktueller Auslastung und historischer Verzögerungstrends")}
                      </p>
                      {/* <Button
                        className="h-7 px-2.5 text-[11px] sm:text-xs"
                        onClick={() => {
                          setRequestForm((prev) => ({
                            ...prev,
                            preferredSlotId: bestSlotRecommendation.slot.id,
                          }));
                          scrollToSection(optionalDetailsSectionRef);
                        }}
                        type="button"
                        variant="outline"
                      >
                        {requestForm.preferredSlotId === bestSlotRecommendation.slot.id
                          ? "Selected"
                          : "Select recommended slot"}
                      </Button> */}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
                  {isTyreStockBlocked ? (
                    <p className="col-span-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {t("driver.request.slotBlocked", "Die Slot-Auswahl ist blockiert, bis der angeforderte Reifenbestand bei diesem POS verfügbar ist.")}
                    </p>
                  ) : slotAvailability.length === 0 ? (
                    <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      {t("driver.request.selectPosToSeeSlots", "Wählen Sie eine Point-S-Station, um die Slot-Verfügbarkeit zu sehen.")}
                    </p>
                  ) : (
                    slotAvailability.map((slot) => {
                      const isSelected =
                        requestForm.preferredSlotId === slot.id;
                      const isBusy = slot.status === "Busy";
                      const isRecommended =
                        bestSlotRecommendation?.slot?.id === slot.id;
                      return (
                        <button
                          className={`relative min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                            isBusy
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : isSelected
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/40"
                                : isRecommended
                                  ? "border-cyan-300 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-300/70"
                                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                          }`}
                          disabled={isBusy}
                          key={slot.id}
                          onClick={() => {
                            setRequestForm((prev) => ({
                              ...prev,
                              preferredSlotId: slot.id,
                            }));
                            scrollToSection(optionalDetailsSectionRef);
                          }}
                          type="button"
                        >
                          {isRecommended && !isBusy ? (
                            <span className="pointer-events-none absolute -top-1.5 left-1/2 z-20 inline-flex -translate-x-1/2 rounded-full border border-fuchsia-200 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-2 py-[2px] text-[8px] font-bold uppercase tracking-[0.05em] text-white shadow-lg">
                              {t("driver.request.recommended", "Empfohlen")}
                            </span>
                          ) : null}
                          <p className="text-xs font-semibold sm:text-sm">
                            {slot.label}
                          </p>
                          <p className="mt-1 text-[10px] sm:text-[11px]">
                            {isBusy
                              ? t("driver.request.busyQueue", { defaultValue: "Belegt ({{count}} in der Warteschlange)", count: slot.queue })
                              : t("driver.request.freeToBook", "Frei buchbar")}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedSlot ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 sm:text-xs">
                    {t("driver.request.selectedSlot", "Gewählter Slot")}:{" "}
                    <span className="font-semibold">{selectedSlot.label}</span>{" "}
                    on{" "}
                    <span className="font-semibold">
                      {requestForm.preferredDate}
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <div
            className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/80 p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
            ref={optionalDetailsSectionRef}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {t("driver.request.requiredDetails", "Erforderliche Details")}
                </h2>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  {requiresPhotos
                    ? t("driver.request.damageRequiresPhoto", "Eine Schadensmeldung erfordert eine klare Beschreibung und mindestens ein Foto.")
                    : requiresDescription
                      ? t("driver.request.addRequiredDetails", "Fügen Sie die erforderlichen Problemdetails hinzu, bevor Sie die Anfrage senden.")
                      : t("driver.request.addShortNote", "Fügen Sie bei Bedarf eine kurze Notiz oder Fotos hinzu.")}
                </p>
              </div>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 sm:text-xs">
                {t("driver.request.quickChecklist", "Schnellcheckliste")}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isDamageReportFlow ? (
                <>
                  {/* <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-800">
                      Damage Report Details
                    </p>
                    <p className="mt-1 text-[11px] text-rose-700 sm:text-xs">
                      Based on the Unfall-und-Schadenmeldung structure (English
                      labels).
                    </p>
                  </div> */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.vehicleCaseDetails", "Fahrzeug- & Falldetails")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "processNumber",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.transactionNumber", "Vorgangsnummer")}
                        value={damageReport.processNumber || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "plateNumber",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.officialPlateNumber", "Amtliches Kennzeichen *")}
                        value={damageReport.plateNumber || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "vehicleDetails",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.damagedVehicleDetails", "Beschädigte Fahrzeugdetails (Hersteller / Modell) *")}
                        value={damageReport.vehicleDetails || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.driverDetails", "Fahrerdetails")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverFullName",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.driverFullName", "Vollständiger Name des Fahrers *")}
                        value={damageReport.driverFullName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverBirthDate",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.dateOfBirth", "Geburtsdatum *")}
                        type={damageReport.driverBirthDate ? "date" : "text"}
                        onFocus={(e) => (e.target.type = "date")}
                        onBlur={(e) => {
                          if (!e.target.value) e.target.type = "text";
                        }}
                        value={damageReport.driverBirthDate || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverAddress",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.address", "Adresse *")}
                        value={damageReport.driverAddress || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverPhone",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.phoneNumber", "Telefonnummer *")}
                        value={damageReport.driverPhone || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverEmail",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.emailAddress", "E-Mail-Adresse *")}
                        type="email"
                        value={damageReport.driverEmail || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverLicense",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.driverLicenseDetails", "Führerscheindaten *")}
                        value={damageReport.driverLicense || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.accidentReport", "Unfallbericht")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                        onChange={(event) =>
                          updateDamageReportField(
                            "damageCauser",
                            event.target.value,
                          )
                        }
                        value={damageReport.damageCauser || ""}
                      >
                        <option value="">{t("driver.request.damageCauser", "Wer hat den Schaden verursacht? *")}</option>
                        {localizedDamageCauserOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                        onChange={(event) =>
                          updateDamageReportField(
                            "policeRecorded",
                            event.target.value,
                          )
                        }
                        value={damageReport.policeRecorded || ""}
                      >
                        <option value="">{t("driver.request.policeInvolved", "War die Polizei beteiligt? *")}</option>
                        <option value="yes">{t("driver.request.yes", "Ja")}</option>
                        <option value="no">{t("driver.request.no", "Nein")}</option>
                      </select>
                      {String(
                        damageReport.policeRecorded || "",
                      ).toLowerCase() === "yes" ? (
                        <Input
                          className="sm:col-span-2"
                          onChange={(event) =>
                            updateDamageReportField(
                              "policeAuthority",
                              event.target.value,
                            )
                          }
                          placeholder={t("driver.request.policeAuthority", "Polizeibehörde / Aktenzeichen *")}
                          value={damageReport.policeAuthority || ""}
                        />
                      ) : null}
                      {/* <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "incidentDateTime",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.incidentDateTime", "Datum und Uhrzeit des Vorfalls *")}
                        type="datetime-local"
                        value={damageReport.incidentDateTime || ""}
                      /> */}

                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "incidentDateTime",
                            event.target.value,
                          )
                        }
                        placeholder="Date and time of incident *"
                        type={damageReport.incidentDateTime ? "date" : "text"}
                        onFocus={(e) => (e.target.type = "date")}
                        onBlur={(e) => {
                          if (!e.target.value) e.target.type = "text";
                        }}
                        value={damageReport.incidentDateTime || ""}
                      />

                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                        onChange={(event) =>
                          updateDamageReportField(
                            "vehicleDriveable",
                            event.target.value,
                          )
                        }
                        value={damageReport.vehicleDriveable || ""}
                      >
                        <option value="">{t("driver.request.vehicleDriveability", "Fahrbereitschaft des Fahrzeugs *")}</option>
                        {localizedDamageDriveabilityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "incidentLocation",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.incidentLocation", "Unfallort *")}
                        value={damageReport.incidentLocation || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "vehicleLocation",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.currentVehicleLocation", "Aktueller Fahrzeugstandort / Abholadresse")}
                        value={damageReport.vehicleLocation || ""}
                      />
                    </div>
                    <Textarea
                      className="mt-2 bg-white"
                      onChange={(event) =>
                        updateDamageReportField(
                          "damageNarrative",
                          event.target.value,
                        )
                      }
                      placeholder={t("driver.request.damageDescription", "Schadensbeschreibung und was passiert ist *")}
                      rows={4}
                      value={damageReport.damageNarrative || ""}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.otherPartyDetails", "Daten der anderen Partei (falls vorhanden)")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyName",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.name", "Name")}
                        value={damageReport.otherPartyName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyPhone",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.phone", "Telefon")}
                        value={damageReport.otherPartyPhone || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyAddress",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.addressShort", "Adresse")}
                        value={damageReport.otherPartyAddress || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyEmail",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.email", "E-Mail")}
                        type="email"
                        value={damageReport.otherPartyEmail || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyInsurance",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.insuranceCompany", "Versicherungsgesellschaft")}
                        value={damageReport.otherPartyInsurance || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyClaimNumber",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.claimNumber", "Schadennummer")}
                        value={damageReport.otherPartyClaimNumber || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyVehicleModel",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.vehicleModel", "Fahrzeugmodell")}
                        value={damageReport.otherPartyVehicleModel || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyVehiclePlate",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.vehiclePlateNumber", "Fahrzeugkennzeichen")}
                        value={damageReport.otherPartyVehiclePlate || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.injuredPersonDetails", "Daten verletzter Personen (falls vorhanden)")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonName",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.name", "Name")}
                        value={damageReport.injuryPersonName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonPhone",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.phone", "Telefon")}
                        value={damageReport.injuryPersonPhone || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonAddress",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.addressShort", "Adresse")}
                        value={damageReport.injuryPersonAddress || ""}
                      />
                      <Input
                        className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonEmail",
                            event.target.value,
                          )
                        }
                        placeholder={t("driver.request.email", "E-Mail")}
                        type="email"
                        value={damageReport.injuryPersonEmail || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {t("driver.request.visualInspectionByPart", "Sichtprüfung nach Fahrzeugteil")}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                      {t("driver.request.visualInspectionHint", "Markieren Sie nach Möglichkeit den Zustand jedes sichtbaren Teils.")}
                    </p>
                    <div className="card-list-scrollbar mt-2 grid max-h-[18rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {localizedDamageVisualParts.map((part) => (
                        <div
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2"
                          key={part.key}
                        >
                          <p className="text-[11px] font-medium text-slate-700 sm:text-xs">
                            {part.label}
                          </p>
                          <select
                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
                            onChange={(event) =>
                              updateDamageVisualField(
                                part.key,
                                event.target.value,
                              )
                            }
                            value={
                              (damageReport.visualInspection &&
                                damageReport.visualInspection[part.key]) ||
                              ""
                            }
                          >
                            {localizedDamageVisualStatusOptions.map((option) => (
                              <option
                                key={option.value || "empty"}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {!isDamageReportFlow ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                    <span className="font-medium text-slate-700">
                      {t("driver.request.currentOdometer", "Aktueller Kilometerstand")}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                      {t("driver.request.required", "Erforderlich")}
                    </span>
                  </div>
                  <div className="mt-2 flex h-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-200/70">
                    <Input
                      className="h-full flex-1 rounded-none border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
                      inputMode="numeric"
                      onChange={(event) =>
                        setRequestForm((prev) => ({
                          ...prev,
                          odometerReading: event.target.value,
                        }))
                      }
                      placeholder={t("driver.request.enterOdometer", "Aktuellen Kilometerstand eingeben")}
                      value={requestForm.odometerReading}
                    />
                    <Select
                      onValueChange={(value) =>
                        setRequestForm((prev) => ({
                          ...prev,
                          odometerUnit: value === "miles" ? "miles" : "km",
                        }))
                      }
                      value={requestForm.odometerUnit || "km"}
                    >
                      <SelectTrigger className="h-full w-[96px] rounded-none border-0 border-l border-slate-200 bg-slate-50 px-3 text-sm shadow-none focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder={t("driver.request.unit", "Einheit")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="km">km</SelectItem>
                        <SelectItem value="miles">miles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
                    {t("driver.request.lastRecorded", "Zuletzt erfasst")}:{" "}
                    <span className="font-semibold text-slate-700">
                      {lastRecordedOdometer?.reading !== null &&
                      lastRecordedOdometer?.reading !== undefined
                        ? `${lastRecordedOdometer.reading.toLocaleString()} ${lastRecordedOdometer.unit}`
                        : t("driver.request.noPreviousReading", "Kein vorheriger Wert")}
                    </span>
                    {lastRecordedOdometer?.isFallback ? ` ${t("driver.request.sample", "(Beispiel)")}` : ""}
                  </p>
                  {odometerError ? (
                    <p className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 sm:text-xs">
                      {odometerError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isDamageReportFlow ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                    <span className="font-medium text-slate-700">
                      {localizedCategoryDetails?.detailFieldLabel || t("driver.request.issueDetails", "Problemdetails")}
                    </span>
                    {requiresDescription ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                        {t("driver.request.required", "Erforderlich")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {t("driver.request.optional", "Optional")}
                      </span>
                    )}
                  </div>
                  <Textarea
                    className="mt-2 bg-white"
                    onChange={(event) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder={
                      localizedCategoryDetails?.detailPlaceholder ||
                      t("driver.request.whatHappenedOptional", "Was ist passiert? (optional)")
                    }
                    rows={4}
                    value={requestForm.description}
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="font-medium text-slate-700">
                    {t("driver.request.uploadPhotos", "Fotos hochladen")}
                  </span>
                  {requiresPhotos ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                      {t("driver.request.required", "Erforderlich")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                      {t("driver.request.optional", "Optional")}
                    </span>
                  )}
                </div>
                <Input
                  accept="image/*"
                  className="mt-2 w-full text-xs sm:text-sm"
                  multiple
                  onChange={onPhotoChange}
                  ref={photoInputRef}
                  type="file"
                />
                {requiresPhotos ? (
                  <p className="mt-1 text-[11px] text-amber-700 sm:text-xs">
                    {t("driver.request.damagePhotoRequired", "Mindestens ein Schadensfoto ist erforderlich.")}
                  </p>
                ) : null}

                {photoPreviews.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {t("driver.request.uploadedImages", "Hochgeladene Bilder")}
                      </p>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={clearAllPhotos}
                        type="button"
                      >
                        <Trash2 size={12} />
                        {t("common.clearAll", "Alle löschen")}
                      </button>
                    </div>
                    <div className="card-list-scrollbar mt-3 grid max-h-[18rem] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
                      {photoPreviews.map((preview) => (
                        <figure
                          className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                          key={preview.id}
                        >
                          <img
                            alt={preview.file.name}
                            className="h-24 w-full object-cover sm:h-28"
                            loading="lazy"
                            src={preview.url}
                          />
                          <button
                            aria-label={`Remove ${preview.file.name}`}
                            className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => removePhotoById(preview.id)}
                            type="button"
                          >
                            <X size={12} />
                          </button>
                          <figcaption className="border-t border-slate-200 px-2 py-1.5">
                            <p
                              className="truncate text-[11px] font-medium text-slate-800"
                              title={preview.file.name}
                            >
                              {preview.file.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {Math.max(
                                1,
                                Math.round(preview.file.size / 1024),
                              )}{" "}
                              KB
                            </p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                  {isDamageReportFlow ? t("driver.request.declarations", "Erklärungen") : t("driver.request.additionalOptions", "Zusätzliche Optionen")}
                </p>
                {isDamageReportFlow ? (
                  <>
                    <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                      <input
                        checked={Boolean(damageReport.confirmAccuracy)}
                        className="size-4 accent-slate-900"
                        onChange={(event) =>
                          updateDamageReportField(
                            "confirmAccuracy",
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      {t("driver.request.confirmAccuracy", "Ich bestätige, dass die obigen Angaben korrekt sind. *")}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                      <input
                        checked={Boolean(damageReport.privacyAccepted)}
                        className="size-4 accent-slate-900"
                        onChange={(event) =>
                          updateDamageReportField(
                            "privacyAccepted",
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      {t("driver.request.acceptPrivacy", "Ich stimme der Datenverarbeitung für diese Meldung zu. *")}
                    </label>
                  </>
                ) : null}

                {!isDamageReportFlow ? (
                  <>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                        <input
                          checked={requestForm.emergency}
                          className="size-4 accent-slate-900"
                          onChange={(event) =>
                            setRequestForm((prev) => ({
                              ...prev,
                              emergency: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        {t("driver.request.emergencyBreakdown", "Pannenfall")}
                      </label>
                      {needsTyreSupplySelection ? (
                        <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                          <input
                            checked={isDriverBringingTyres}
                            className="size-4 rounded border-slate-300 accent-violet-600"
                            onChange={(event) =>
                              handleDriverTyreToggle(event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span className="text-slate-900">
                            {t("driver.request.iAmBringingTyresMyself", "Ich bringe die Reifen selbst mit")}
                          </span>
                        </label>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-6 xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              {t("driver.request.requestSummary", "Anfrageübersicht")}
            </h3>
            <div className="mt-4 space-y-3 text-xs text-slate-700 sm:text-sm">
              <p>
                {t("driver.request.problem", "Problem")}:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemType
                    ? localizeProblemType(requestForm.problemType, language)
                    : t("driver.request.notSelected", "Nicht ausgewählt")}
                </span>
              </p>
              <p>
                {t("driver.request.serviceOption", "Serviceoption")}:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemSubtype
                    ? localizeServiceValue(requestForm.problemSubtype, language)
                    :
                    (requiresSubtype
                      ? t("driver.request.notSelected", "Nicht ausgewählt")
                      : t("driver.request.notRequired", "Nicht erforderlich"))}
                </span>
              </p>
              <p>
                {t("driver.request.odometer", "Kilometerstand")}:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.odometerReading
                    ? `${Number(
                        String(requestForm.odometerReading).replace(
                          /[^0-9]/g,
                          "",
                        ),
                      ).toLocaleString()} ${requestForm.odometerUnit || "km"}`
                    : t("driver.request.notEntered", "Nicht eingegeben")}
                </span>
              </p>
              <p>
                {t("driver.request.nearestPointS", "Nächstgelegener Point S")}:{" "}
                <span className="font-semibold text-slate-900">
                  {isDamageReportFlow
                    ? t("driver.request.notRequiredDirectFleet", "Nicht erforderlich (direkte Flottenbearbeitung)")
                    : selectedPos?.name || t("driver.request.notSelected", "Nicht ausgewählt")}
                </span>
              </p>
              {needsTyreSupplySelection ? (
                <p>
                  {t("driver.request.tyreSupply", "Reifenbereitstellung")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {requestForm.tyreSupplySource === "driver"
                      ? t("driver.request.driverBringingTyres", "Fahrer bringt Reifen mit")
                      : requestForm.tyreSupplySource === "pos"
                        ? requestForm.posTyreAvailability === false
                          ? t("driver.request.fromPosUnavailable", "Vom POS (derzeit nicht verfügbar)")
                          : t("driver.request.fromPosAvailable", "Vom POS (verfügbar)")
                        : t("driver.request.autoCheckPending", "Automatische Prüfung ausstehend")}
                  </span>
                </p>
              ) : null}
              <p>
                {t("driver.request.dateSlot", "Datum & Zeitfenster")}:{" "}
                <span className="font-semibold text-slate-900">
                  {isDamageReportFlow
                    ? t("driver.request.notRequiredDamage", "Für Schadensmeldung nicht erforderlich")
                    : isTyreStockBlocked
                      ? t("driver.request.sharedAfterTyreAvailabilityUpdate", "Wird nach Aktualisierung der Reifenverfügbarkeit mitgeteilt")
                      : selectedSlot
                        ? `${requestForm.preferredDate}, ${selectedSlot.label}`
                        : t("driver.request.notSelected", "Nicht ausgewählt")}
                </span>
              </p>
              {odometerRecommendation &&
              requestForm.problemType !== "Schadensmeldung" ? (
                <div
                  className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-sm ${recommendationTone.card}`}
                >
                  <div className="pointer-events-none absolute -right-7 -top-7 size-20 rounded-full bg-white/45 blur-xl" />
                  <div className="relative flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full ${recommendationTone.icon}`}
                      >
                        <Sparkles size={13} />
                      </span>
                      {t("driver.request.odometerRecommendation", "Kilometerstand-Empfehlung")}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${recommendationTone.badge}`}
                    >
                      {odometerRecommendation.level === "high"
                        ? t("driver.request.priority", "Priorität")
                        : odometerRecommendation.level === "medium"
                          ? t("driver.request.planSoon", "Bald planen")
                          : t("driver.request.advisory", "Hinweis")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {odometerRecommendation.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {odometerRecommendation.summary}
                  </p>
                  <div className="mt-2 rounded-xl border border-white/70 bg-white/60 p-2.5">
                    <p className="text-xs font-medium text-slate-700">
                      {t("driver.request.suggestedAction", "Empfohlene Maßnahme")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {odometerRecommendation.suggestion}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {t("driver.request.suggestedCategory", "Empfohlene Kategorie")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {odometerRecommendation.suggestedCategory}
                      </span>
                    </p>
                  </div>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/70 bg-white/70 p-2.5 transition hover:bg-white/90">
                    <input
                      checked={Boolean(requestForm.recommendationAccepted)}
                      className={`mt-0.5 size-4 rounded border-slate-300 ${recommendationTone.check}`}
                      onChange={(event) =>
                        setRequestForm((prev) => ({
                          ...prev,
                          recommendationAccepted: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      {t("driver.request.bookWithRecommendation", "Service mit dieser Empfehlung buchen")}
                    </span>
                  </label>
                  {requestForm.recommendationAccepted ? (
                    <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      {t("driver.request.recommendationIncluded", "Empfehlung wird in diese Anfrage aufgenommen")}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {t("driver.request.policyValidation", "Richtlinienprüfung")}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${policyStatusClass}`}
                >
                  {policyStatusLabel}
                </span>
                <p className="mt-2 text-xs text-slate-600">
                  {policyValidation.note}
                </p>
              </div>
              {/* <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated baseline</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">${previewCost}</p>
              </div> */}
              <Button
                // className=""
                disabled={isSubmittingRequest || !isServiceRequestFormReady}
                onClick={handleSubmitSimpleRequest}
                type="button"
                className="w-full text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
              >
                {isSubmittingRequest ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {t("driver.request.sending", "Wird gesendet...")}
                  </span>
                ) : isDamageReportFlow ? (
                  t("driver.request.sendDamageReport", "Schadensmeldung an Flotte senden")
                ) : (
                  t("driver.request.bookServiceAppointment", "Servicetermin buchen")
                )}
              </Button>
              {!isSubmittingRequest && !isServiceRequestFormReady ? (
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  {isTyreStockBlocked
                    ? t("driver.request.posOutOfStock", "Der ausgewählte POS hat keinen Lagerbestand für die angeforderten Reifen. Wir benachrichtigen Sie, sobald Reifen verfügbar sind, dann können Sie ein Zeitfenster buchen.")
                    : isDamageReportFlow
                      ? t("driver.request.completeDamageDetails", "Vervollständigen Sie die erforderlichen Details und mindestens ein Foto, um diese Meldung direkt an die Flotte zu senden.")
                      : t("driver.request.completeServiceDetails", "Vervollständigen Sie die erforderlichen Servicedetails und wählen Sie dann Station, Datum und ein freies Zeitfenster, um die Anfrage zu aktivieren.")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {t("driver.request.recentRequests", "Letzte Anfragen")}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                  {t("driver.request.recentRequestsHint", "Ihre zuletzt eingereichten Serviceanfragen.")}
                </p>
              </div>
              <Button
                onClick={() => {
                  const section = window.document.getElementById(
                    "driver-service-request-details",
                  );
                  section?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                type="button"
                variant="outline"
              >
                {t("driver.request.viewFullHistory", "Gesamte Historie anzeigen")}
              </Button>
            </div>

            {recentDriverRequests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("driver.request.noRequestsYet", "Noch keine Anfragen.")}</p>
            ) : (
              <div className="card-list-scrollbar mt-4 max-h-[18rem] space-y-2.5 overflow-y-auto pr-1">
                {recentDriverRequests.map((order) => {
                  const isActive = selectedRequest?.id === order.id;
                  return (
                    <button
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                      }`}
                      key={`recent-${order.id}`}
                      onClick={() => {
                        setSelectedRequestId(order.id);
                        const section = window.document.getElementById(
                          "driver-service-request-details",
                        );
                        section?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold sm:text-sm">
                          {order.id}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : requestStatusClass(order.status)
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-[11px] sm:text-xs ${
                          isActive ? "text-slate-200" : "text-slate-600"
                        }`}
                      >
                        {localizeServiceValue(order.serviceType, language)}
                      </p>
                      <p
                        className={`mt-1 text-[10px] sm:text-xs ${
                          isActive ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {formatDateTime(order.requestedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* 
        Legacy UI (kept commented for future reuse)
        - Quick service request card
        - Nearest Point S station and slot booking card
        - Optional details + Request check two-column section
        To restore: re-enable previous JSX block from component history (current handlers still compatible).
      */}

      {wizardFeedback ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700 sm:text-sm">
          {wizardFeedback}
        </div>
      ) : null}

      <div
        className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6"
        id="driver-service-request-details"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            {t("driver.request.fullHistory", "Vollständige Anfragenhistorie")}
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("driver.request.requestsCount", { defaultValue: "{{count}} Anfragen", count: driverServiceRequests.length })}
          </span>
        </div>

        {driverServiceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {t("driver.request.noRequestsHistory", "Noch keine Anfragen. Senden Sie oben über das Schnellformular eine Anfrage.")}
          </p>
        ) : (
          <div className="mt-4 grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[340px_1fr]">
            <div className="card-list-scrollbar max-h-[300px] space-y-2 overflow-y-auto pr-1 sm:max-h-[420px] sm:pr-2">
              {driverServiceRequests.map((order) => {
                const isActive = selectedRequest?.id === order.id;
                return (
                  <button
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={order.id}
                    onClick={() => setSelectedRequestId(order.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold sm:text-sm">
                        {order.id}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : requestStatusClass(order.status)
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[11px] sm:text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}
                    >
                      {localizeServiceValue(order.serviceType, language)}
                    </p>
                    <p
                      className={`mt-1 text-[10px] sm:text-xs ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {formatDateTime(order.requestedAt)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              {selectedRequest ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                      {selectedRequest.id} - {selectedRequest.requestTitle}
                    </h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${requestStatusClass(
                        selectedRequest.status,
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 sm:text-sm">
                    <p>
                      {t("driver.request.serviceType", "Servicetyp")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {localizeServiceValue(selectedRequest.serviceType, language)}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.requestedAt", "Angefragt am")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatDateTime(selectedRequest.requestedAt)}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.priorityLabel", "Priorität")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.priority || t("driver.request.normal", "Normal")}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.emergency", "Notfall")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.emergency ? t("driver.request.yes", "Ja") : t("driver.request.no", "Nein")}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.location", "Ort")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.orderDetails?.location || t("driver.request.notAvailable", "k. A.")}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.odometer", "Kilometerstand")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.orderDetails?.odometerReading !==
                          null &&
                        selectedRequest.orderDetails?.odometerReading !==
                          undefined
                          ? `${Number(
                              selectedRequest.orderDetails.odometerReading,
                            ).toLocaleString()} ${
                              selectedRequest.orderDetails?.odometerUnit || "km"
                            }`
                          : t("driver.request.notAvailable", "k. A.")}
                      </span>
                    </p>
                    <p>
                      {t("driver.request.appointment", "Termin")}:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.appointment?.dateTime
                          ? formatDateTime(selectedRequest.appointment.dateTime)
                          : t("driver.request.notScheduled", "Nicht geplant")}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("driver.request.description", "Beschreibung")}
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.description || t("driver.request.notAvailable", "k. A.")}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("driver.request.notes", "Notizen")}
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.notes || t("driver.request.notAvailable", "k. A.")}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("driver.request.lifecycle", "Verlauf")}
                    </p>
                    <div className="card-list-scrollbar mt-2 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                      {(selectedRequest.lifecycle || [])
                        .slice()
                        .reverse()
                        .slice(0, 6)
                        .map((entry, index) => (
                          <div
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                            key={`${selectedRequest.id}-timeline-${index}`}
                          >
                            <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {entry.stage}
                            </p>
                            <p className="text-[11px] text-slate-500 sm:text-xs">
                              {formatDateTime(entry.time)} {t("driver.request.by", "durch")}{" "}
                              {entry.actor || t("driver.request.system", "System")}
                            </p>
                            {entry.note ? (
                              <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                                {entry.note}
                              </p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {showAllServices ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {t("driver.request.allServices", "Alle Services")}
                </p>
                <p className="text-sm text-slate-500">
                  {t("driver.request.selectOneService", "Wählen Sie einen Service aus, um fortzufahren")}
                </p>
              </div>
              <Button
                onClick={() => setShowAllServices(false)}
                type="button"
                variant="outline"
              >
                {t("driver.request.close", "Schließen")}
              </Button>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                {orderedServiceOptions.map((option) => (
                  <ServiceCategoryCard
                    cardKey={`modal-${option.value}`}
                    isSelected={requestForm.problemType === option.value}
                    key={`modal-${option.value}`}
                    onSelect={() =>
                      handleServiceSelect(option.value, {
                        closeModal: true,
                        moveToIndex: 5,
                      })
                    }
                    option={option}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAllStations && !isDamageReportFlow ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {t("driver.request.allNearbyStations", "Alle nahegelegenen Point-S-Stationen")}
                </p>
                {/* <p className="text-sm text-slate-500">
                  Select one Point S station to continue ({filteredStations.length} shown of{" "}
                  {totalStationsCount})
                </p> */}
              </div>
              <Button
                onClick={() => setShowAllStations(false)}
                type="button"
                variant="outline"
              >
                {t("driver.request.close", "Schließen")}
              </Button>
            </div>
            <div className="max-w-sm">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setStationSearch(event.target.value)}
                  placeholder={t("driver.request.searchStations", "Station, Ort oder Fähigkeit suchen...")}
                  value={stationSearch}
                />
                {stationSearch ? (
                  <button
                    aria-label={t("driver.request.clearSearch", "Suche löschen")}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    onClick={() => setStationSearch("")}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="mt-1 flex min-h-4 items-center gap-1.5 text-[11px] text-slate-500">
                {isSearchDebouncing ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-sky-600" />
                    <span>{t("driver.request.searchingStations", "Stationen werden gesucht...")}</span>
                  </>
                ) : (
                  <span>{t("driver.request.matchingStations", { defaultValue: "{{count}} passende Stationen", count: filteredStations.length })}</span>
                )}
              </div>
            </div>
            <div
              className="card-list-scrollbar mt-4 grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 min-[520px]:grid-cols-2 lg:grid-cols-3"
              onScroll={handleStationModalScroll}
            >
              {isSearchDebouncing ? (
                <div className="col-span-full flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <Loader2 className="mr-2 size-4 animate-spin text-sky-600" />
                  {t("driver.request.loadingMatchingStations", "Passende Stationen werden geladen...")}
                </div>
              ) : filteredStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  {t("driver.request.noStationsFound", "Für diese Suche wurden keine Stationen gefunden.")}
                </p>
              ) : (
                visibleFilteredStations.map((pos) =>
                  renderStationCard(pos, {
                    closeOnSelect: true,
                    isRecommended: bestRecommendedStation?.pos?.id === pos.id,
                  }),
                )
              )}
              {isLoadingMoreStations ? (
                <div className="col-span-full flex justify-center pt-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    <Loader2 className="size-3.5 animate-spin text-sky-600" />
                    {t("driver.request.loadingMoreStations", "Weitere Stationen werden geladen...")}
                  </span>
                </div>
              ) : hasMoreFilteredStations ? (
                <div className="col-span-full flex justify-center pt-1">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {t("driver.request.scrollMoreStations", "Scrollen, um weitere Stationen zu laden")}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DriverServiceRequestSection;
