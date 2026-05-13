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
  { value: "driver_self", label: "Driver (self)" },
  { value: "other_party", label: "Other party" },
  { value: "unknown", label: "Unknown / not sure" },
];

const DAMAGE_DRIVEABILITY_OPTIONS = [
  { value: "driveable", label: "Driveable and road-safe" },
  { value: "limited", label: "Limited driveability" },
  { value: "not_driveable", label: "Not driveable" },
];

const DAMAGE_VISUAL_STATUS_OPTIONS = [
  { value: "", label: "Not checked" },
  { value: "no_damage", label: "No damage" },
  { value: "scratch", label: "Scratch" },
  { value: "dent", label: "Dent" },
  { value: "crack", label: "Crack" },
  { value: "broken", label: "Broken" },
  { value: "other", label: "Other" },
];

const DAMAGE_VISUAL_PARTS = [
  { key: "frontRightHeadlight", label: "Front right headlight" },
  { key: "hood", label: "Hood" },
  { key: "frontLeftHeadlight", label: "Front left headlight" },
  { key: "windshield", label: "Windshield" },
  { key: "roofFront", label: "Roof (front)" },
  { key: "leftMirror", label: "Left side mirror" },
  { key: "frontLeftWindow", label: "Front left side window" },
  { key: "rearLeftWindow", label: "Rear left side window" },
  { key: "rearUpperLeftPanel", label: "Rear upper left panel" },
  { key: "rearLeftFender", label: "Rear left fender" },
  { key: "lowerFrontBumper", label: "Lower front bumper" },
  { key: "frontBumper", label: "Front bumper" },
  { key: "frontLeftFender", label: "Front left fender" },
  { key: "frontLeftTyre", label: "Front left tyre" },
  { key: "frontLeftRim", label: "Front left rim" },
  { key: "leftSill", label: "Left side skirt" },
  { key: "driverDoor", label: "Driver door" },
  { key: "rearLeftDoor", label: "Rear left door" },
  { key: "rearLeftTyre", label: "Rear left tyre" },
  { key: "rearLeftRim", label: "Rear left rim" },
  { key: "upperTrunkLid", label: "Upper trunk lid" },
  { key: "rearRightFender", label: "Rear right fender" },
  { key: "rearRightRim", label: "Rear right rim" },
  { key: "rightTailLight", label: "Right tail light" },
  { key: "rearRightTyre", label: "Rear right tyre" },
  { key: "rearWindow", label: "Rear window" },
  { key: "rearRightDoor", label: "Rear right door" },
  { key: "rearUpperRightPanel", label: "Rear upper right panel" },
  { key: "roofRear", label: "Roof (rear)" },
  { key: "frontRightRim", label: "Front right rim" },
  { key: "leftTailLight", label: "Left tail light" },
  { key: "rearBumper", label: "Rear bumper" },
  { key: "rightSill", label: "Right side skirt" },
  { key: "rightMirror", label: "Right side mirror" },
  { key: "frontRightWindow", label: "Front right side window" },
  { key: "frontRightTyre", label: "Front right tyre" },
  { key: "frontRightFender", label: "Front right fender" },
  { key: "frontRightDoor", label: "Front right door" },
  { key: "lowerTrunkLid", label: "Lower trunk lid" },
  { key: "rearRightWindow", label: "Rear right side window" },
];

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

function ServiceCategoryCard({
  option,
  isSelected,
  onSelect,
  cardKey,
  className = "",
}) {
  const pictogram =
    problemPictogramMap[option.iconKey] || problemPictogramMap.default;
  const Icon = pictogram.icon;

  return (
    <button
      className={`min-w-0 rounded-xl border p-1.5 text-left transition sm:rounded-2xl sm:p-4 ${className} ${
        isSelected
          ? "border-slate-900 bg-[linear-gradient(180deg,#1f2f47_0%,#0f1d33_52%,#0a1322_100%)] text-white shadow-lg"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400 hover:bg-white"
      }`}
      key={cardKey || option.value}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-h-[56px] flex-col items-center justify-center gap-1 sm:min-h-[72px] sm:gap-1.5">
        <span
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border shadow-sm sm:size-8 sm:rounded-xl ${
            isSelected
              ? "border-white/35 bg-white/15 text-white"
              : pictogram.accentClass
          }`}
        >
          <Icon size={12} strokeWidth={2.2} className="sm:size-[14px]" />
        </span>
        <p
          className="w-full truncate text-center text-[8px] font-semibold leading-tight sm:text-[10px]"
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
  const inlineServiceLimit = 5;
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
    const byValue = new Map(
      simpleIssueOptions.map((option) => [option.value, option]),
    );
    const ordered = serviceOrder
      .map((value) => byValue.get(value))
      .filter(Boolean);
    const missing = simpleIssueOptions.filter(
      (option) => !serviceOrder.includes(option.value),
    );
    return [...ordered, ...missing];
  }, [serviceOrder, simpleIssueOptions]);
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
  const policyStatusLabel = "Covered";
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
        className={`relative min-w-0 rounded-xl border p-2.5 text-left transition sm:p-3 ${
          isSelected
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
        } ${
          isRecommended && !isSelected
            ? "ring-1 ring-violet-300/70 ring-offset-1 ring-offset-white"
            : ""
        }`}
        key={pos.id}
        onClick={() => handlePosSelection(pos, { closeOnSelect })}
        type="button"
      >
        {isRecommended ? (
          <span
            className={`pointer-events-none absolute -top-1.5 left-1/2 z-20 inline-flex -translate-x-1/2 rounded-full border px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.05em] shadow-lg ${
              isSelected
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
                  className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    isSelected
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
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
                isSelected
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
            ETA {pos.etaMin} mins
          </p>
          {needsTyreSupplySelection && tyreAvailabilityForSelectedSubtype ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  tyreAvailabilityForSelectedSubtype.canFulfill
                    ? isSelected
                      ? "bg-emerald-200/30 text-emerald-100"
                      : "bg-emerald-100 text-emerald-700"
                    : isSelected
                      ? "bg-rose-200/30 text-rose-100"
                      : "bg-rose-100 text-rose-700"
                }`}
              >
                {tyreAvailabilityForSelectedSubtype.canFulfill
                  ? "Tyres available"
                  : "Tyres unavailable"}
              </span>
              <span
                className={`text-[10px] ${
                  isSelected ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {tyreAvailabilityForSelectedSubtype.totalAvailable}/
                {requiredTyreQty} available
              </span>
            </div>
          ) : null}
          {Array.isArray(pos.capabilities) && pos.capabilities.length > 0 ? (
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {pos.capabilities.slice(0, 3).map((tag) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] ${
                    isSelected
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
          reasons.push("nearby location");
        }
        if (etaMin <= 20) {
          reasons.push("fast ETA");
        }
        if (sameIssueVisits > 0) {
          reasons.push(`${sameIssueVisits} similar past service`);
        } else if (totalHistoryVisits > 0) {
          reasons.push(`${totalHistoryVisits} past visit`);
        }
        if (capabilityMatch) {
          reasons.push("service match");
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
          reasons.push("lowest live queue");
        }
        if (avgDelayHours !== null && avgDelayHours <= 12) {
          reasons.push("historically low delay");
        }
        if (history && history.count > 0) {
          reasons.push(`${history.count} similar past bookings`);
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
                  Tyre availability update
                </p>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Your request is submitted. We will notify you once tyres are
                  available, then you can pick date and slot.
                </p>
              </div>
              <Button
                onClick={onCloseTyreWaitlistNotice}
                type="button"
                variant="outline"
              >
                Close
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900 sm:text-sm">
              <p>
                Request ID:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.orderId || "Pending"}
                </span>
              </p>
              <p className="mt-1">
                Station:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.stationName || "Selected Point S"}
                </span>
              </p>
              <p className="mt-1">
                Tyre spec:{" "}
                <span className="font-semibold">
                  {tyreWaitlistNotice.tyreSize || "N/A"}
                </span>
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                onClick={onCloseTyreWaitlistNotice}
                type="button"
              >
                Okay, got it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Service category
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              First-level service options with quick visual selection.
            </p>
            <div className="mt-4 flex justify-end">
              {hasMoreServices ? (
                <Button
                  onClick={() => setShowAllServices(true)}
                  type="button"
                  variant="outline"
                >
                  See all services
                </Button>
              ) : null}
            </div>
            <div className="mt-3">
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {inlineServiceOptions.map((option) => (
                  <ServiceCategoryCard
                    cardKey={option.value}
                    className="w-full"
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
                {categoryDetails?.selectionLabel || "Service details"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {categoryDetails?.selectionHint ||
                  "Choose the correct service detail before booking."}
              </p>
              {categorySubOptions.length > 0 ? (
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {categorySubOptions.map((option) => {
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
                            Explanation required
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
                      Please describe the issue in the field below or upload a
                      picture of the error message.
                    </p>
                  ) : requestForm.problemType === "Schadensmeldung" ? (
                    <p>
                      Please fill out the damage details below and upload clear
                      pictures of the damage.
                    </p>
                  ) : (
                    <p>Select the details below to continue.</p>
                  )}
                </div>
              )}
              {requiresSubtype && !requestForm.problemSubtype ? (
                <p className="mt-3 text-xs text-amber-700">
                  Select one service option to continue.
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
                      Nearest Point of Sale
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
                          <span>See all</span>
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
                        Best Point S recommendation
                      </p>
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white sm:text-[11px]">
                        {bestRecommendedStation.confidence}% match
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {bestRecommendedStation.pos.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                      {bestRecommendedStation.reasons.length > 0
                        ? bestRecommendedStation.reasons.join(" • ")
                        : "Balanced score from distance, ETA, and service fit"}
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
                      No nearby Point S stations found for selected service
                      category.
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
                  Select date and slot
                </h2>

                {isTyreStockBlocked ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:text-sm">
                    Tyres are currently unavailable at selected POS for this
                    service. We will notify you when tyres are available, then
                    you can still submit this request.
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
                        Best slot recommendation
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
                          : "Chosen using current queue and historical delay trends"}
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
                      Slot selection is blocked until requested tyre stock is
                      available at this POS.
                    </p>
                  ) : slotAvailability.length === 0 ? (
                    <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      Select a Point S station to see slot availability.
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
                              Recommended
                            </span>
                          ) : null}
                          <p className="text-xs font-semibold sm:text-sm">
                            {slot.label}
                          </p>
                          <p className="mt-1 text-[10px] sm:text-[11px]">
                            {isBusy
                              ? `Busy (${slot.queue} in queue)`
                              : "Free to book"}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedSlot ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 sm:text-xs">
                    Selected slot:{" "}
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
                  Required details
                </h2>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  {requiresPhotos
                    ? "Damage report requires a clear description and at least one photo."
                    : requiresDescription
                      ? "Add the required issue details before sending the request."
                      : "Add short note or photos if available."}
                </p>
              </div>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 sm:text-xs">
                Quick checklist
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isDamageReportFlow ? (
                <div className="damage-report-form space-y-3">
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
                      Vehicle & case details
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "processNumber",
                            event.target.value,
                          )
                        }
                        placeholder="Transaction number"
                        value={damageReport.processNumber || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "plateNumber",
                            event.target.value,
                          )
                        }
                        placeholder="Official plate number *"
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
                        placeholder="Damaged vehicle details (manufacturer / model) *"
                        value={damageReport.vehicleDetails || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Driver details
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverFullName",
                            event.target.value,
                          )
                        }
                        placeholder="Driver full name *"
                        value={damageReport.driverFullName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverBirthDate",
                            event.target.value,
                          )
                        }
                        placeholder="Date of birth *"
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
                        placeholder="Address *"
                        value={damageReport.driverAddress || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverPhone",
                            event.target.value,
                          )
                        }
                        placeholder="Phone number *"
                        value={damageReport.driverPhone || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "driverEmail",
                            event.target.value,
                          )
                        }
                        placeholder="Email address *"
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
                        placeholder="Driver license details *"
                        value={damageReport.driverLicense || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Accident report
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
                        <option value="">Who caused the damage? *</option>
                        {DAMAGE_CAUSER_OPTIONS.map((option) => (
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
                        <option value="">Was police involved? *</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
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
                          placeholder="Police authority / file number *"
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
                        placeholder="Date and time of incident *"
                        type="datetime-local"
                        value={damageReport.incidentDateTime || ""}
                      /> */}

                      <Input
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
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
                        <option value="">Vehicle driveability *</option>
                        {DAMAGE_DRIVEABILITY_OPTIONS.map((option) => (
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
                        placeholder="Incident location *"
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
                        placeholder="Current vehicle location / pickup address"
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
                      placeholder="Damage description and what happened *"
                      rows={4}
                      value={damageReport.damageNarrative || ""}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Other party details (if available)
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyName",
                            event.target.value,
                          )
                        }
                        placeholder="Name"
                        value={damageReport.otherPartyName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyPhone",
                            event.target.value,
                          )
                        }
                        placeholder="Phone"
                        value={damageReport.otherPartyPhone || ""}
                      />
                      <Input
                        // className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyAddress",
                            event.target.value,
                          )
                        }
                        placeholder="Address"
                        value={damageReport.otherPartyAddress || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyEmail",
                            event.target.value,
                          )
                        }
                        placeholder="Email"
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
                        placeholder="Insurance company"
                        value={damageReport.otherPartyInsurance || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyClaimNumber",
                            event.target.value,
                          )
                        }
                        placeholder="Claim number"
                        value={damageReport.otherPartyClaimNumber || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyVehicleModel",
                            event.target.value,
                          )
                        }
                        placeholder="Vehicle model"
                        value={damageReport.otherPartyVehicleModel || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "otherPartyVehiclePlate",
                            event.target.value,
                          )
                        }
                        placeholder="Vehicle plate number"
                        value={damageReport.otherPartyVehiclePlate || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Injured person details (if any)
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonName",
                            event.target.value,
                          )
                        }
                        placeholder="Name"
                        value={damageReport.injuryPersonName || ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonPhone",
                            event.target.value,
                          )
                        }
                        placeholder="Phone"
                        value={damageReport.injuryPersonPhone || ""}
                      />
                      <Input
                        // className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonAddress",
                            event.target.value,
                          )
                        }
                        placeholder="Address"
                        value={damageReport.injuryPersonAddress || ""}
                      />
                      <Input
                        // className="sm:col-span-2"
                        onChange={(event) =>
                          updateDamageReportField(
                            "injuryPersonEmail",
                            event.target.value,
                          )
                        }
                        placeholder="Email"
                        type="email"
                        value={damageReport.injuryPersonEmail || ""}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      Visual inspection by vehicle part
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                      Mark each visible part condition where possible.
                    </p>
                    <div className="card-list-scrollbar mt-2 grid max-h-[18rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {DAMAGE_VISUAL_PARTS.map((part) => (
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
                            {DAMAGE_VISUAL_STATUS_OPTIONS.map((option) => (
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
                </div>
              ) : null}

              {!isDamageReportFlow ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                    <span className="font-medium text-slate-700">
                      Current odometer reading
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                      Required
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
                      placeholder="Enter current odometer"
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
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="km">km</SelectItem>
                        <SelectItem value="miles">miles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
                    Last recorded:{" "}
                    <span className="font-semibold text-slate-700">
                      {lastRecordedOdometer?.reading !== null &&
                      lastRecordedOdometer?.reading !== undefined
                        ? `${lastRecordedOdometer.reading.toLocaleString()} ${lastRecordedOdometer.unit}`
                        : "No previous reading"}
                    </span>
                    {lastRecordedOdometer?.isFallback ? " (sample)" : ""}
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
                      {categoryDetails?.detailFieldLabel || "Issue details"}
                    </span>
                    {requiresDescription ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                        Required
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        Optional
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
                      categoryDetails?.detailPlaceholder ||
                      "What happened? (optional)"
                    }
                    rows={4}
                    value={requestForm.description}
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="font-medium text-slate-700">
                    Upload photos
                  </span>
                  {requiresPhotos ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                      Required
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                      Optional
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
                    At least one damage photo is required.
                  </p>
                ) : null}

                {photoPreviews.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        Uploaded images
                      </p>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={clearAllPhotos}
                        type="button"
                      >
                        <Trash2 size={12} />
                        Clear all
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
                  {isDamageReportFlow ? "Declarations" : "Additional options "}
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
                      I confirm the above details are accurate. *
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
                      I accept privacy processing for this report. *
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
                        Emergency breakdown
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
                            I am bringing tyres myself
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
              Request summary
            </h3>
            <div className="mt-4 space-y-3 text-xs text-slate-700 sm:text-sm">
              <p>
                Problem:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemType || "Not selected"}
                </span>
              </p>
              <p>
                Service option:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemSubtype ||
                    (requiresSubtype ? "Not selected" : "Not required")}
                </span>
              </p>
              <p>
                Odometer:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.odometerReading
                    ? `${Number(
                        String(requestForm.odometerReading).replace(
                          /[^0-9]/g,
                          "",
                        ),
                      ).toLocaleString()} ${requestForm.odometerUnit || "km"}`
                    : "Not entered"}
                </span>
              </p>
              <p>
                Nearest Point S:{" "}
                <span className="font-semibold text-slate-900">
                  {isDamageReportFlow
                    ? "Not required (direct fleet handling)"
                    : selectedPos?.name || "Not selected"}
                </span>
              </p>
              {needsTyreSupplySelection ? (
                <p>
                  Tyre supply:{" "}
                  <span className="font-semibold text-slate-900">
                    {requestForm.tyreSupplySource === "driver"
                      ? "Driver bringing tyres"
                      : requestForm.tyreSupplySource === "pos"
                        ? requestForm.posTyreAvailability === false
                          ? "Auto from POS (currently unavailable)"
                          : "Auto from POS (available)"
                        : "Auto check pending"}
                  </span>
                </p>
              ) : null}
              <p>
                Date & slot:{" "}
                <span className="font-semibold text-slate-900">
                  {isDamageReportFlow
                    ? "Not required for damage report"
                    : isTyreStockBlocked
                      ? "Will be shared after tyre availability update"
                      : selectedSlot
                        ? `${requestForm.preferredDate}, ${selectedSlot.label}`
                        : "Not selected"}
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
                      Odometer recommendation
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${recommendationTone.badge}`}
                    >
                      {odometerRecommendation.level === "high"
                        ? "Priority"
                        : odometerRecommendation.level === "medium"
                          ? "Plan soon"
                          : "Advisory"}
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
                      Suggested action:{" "}
                      <span className="font-semibold text-slate-900">
                        {odometerRecommendation.suggestion}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Suggested category:{" "}
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
                      Book service appointment with this recommendation
                    </span>
                  </label>
                  {requestForm.recommendationAccepted ? (
                    <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      Recommendation will be included in this request
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Policy validation
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
                    Sending...
                  </span>
                ) : isDamageReportFlow ? (
                  "Raise damage report"
                ) : (
                  "Book service appointment"
                )}
              </Button>
              {!isSubmittingRequest && !isServiceRequestFormReady ? (
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  {isTyreStockBlocked
                    ? "Selected POS is out of stock for requested tyres. You can still submit request without date/slot and we will notify you once tyres are available."
                    : isDamageReportFlow
                      ? "Complete required details and at least one photo to send this report directly to fleet."
                      : "Complete the required service details, then choose station, date, and a free slot to enable the request."}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Recent requests
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                  Your latest submitted service requests.
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
                View full history
              </Button>
            </div>

            {recentDriverRequests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No requests yet.</p>
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
                        {order.serviceType}
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
            Full request history
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {driverServiceRequests.length} requests
          </span>
        </div>

        {driverServiceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No requests yet. Submit one using the quick form above.
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
                      {order.serviceType}
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
                      Service type:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.serviceType}
                      </span>
                    </p>
                    <p>
                      Requested at:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatDateTime(selectedRequest.requestedAt)}
                      </span>
                    </p>
                    <p>
                      Priority:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.priority || "Normal"}
                      </span>
                    </p>
                    <p>
                      Emergency:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.emergency ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Location:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.orderDetails?.location || "N/A"}
                      </span>
                    </p>
                    <p>
                      Odometer:{" "}
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
                          : "N/A"}
                      </span>
                    </p>
                    <p>
                      Appointment:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.appointment?.dateTime
                          ? formatDateTime(selectedRequest.appointment.dateTime)
                          : "Not scheduled"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.description || "N/A"}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.notes || "N/A"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lifecycle
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
                              {formatDateTime(entry.time)} by{" "}
                              {entry.actor || "System"}
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
                  All services
                </p>
                <p className="text-sm text-slate-500">
                  Select one service to continue
                </p>
              </div>
              <Button
                onClick={() => setShowAllServices(false)}
                type="button"
                variant="outline"
              >
                Close
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
                  All nearby Point S stations
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
                Close
              </Button>
            </div>
            <div className="max-w-sm">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setStationSearch(event.target.value)}
                  placeholder="Search station, location or capability..."
                  value={stationSearch}
                />
                {stationSearch ? (
                  <button
                    aria-label="Clear search"
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
                    <span>Searching stations...</span>
                  </>
                ) : (
                  <span>{filteredStations.length} matching stations</span>
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
                  Loading matching stations...
                </div>
              ) : filteredStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No stations found for this search.
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
                    Loading more stations...
                  </span>
                </div>
              ) : hasMoreFilteredStations ? (
                <div className="col-span-full flex justify-center pt-1">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    Scroll to load more stations
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
