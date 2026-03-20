import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { clearSession, getSession, subscribeSession } from "../auth/session";
import {
  getDriverState,
  subscribeDrivers,
  updateDriver,
} from "../data/driverStore";
import { getVehicleState, subscribeVehicles } from "../data/vehicleStore";
import {
  getVehiclePolicyState,
  subscribeVehiclePolicies,
} from "../data/vehiclePolicyStore";
import {
  getDriverOperationsState,
  subscribeDriverOperations,
} from "../data/driverOperationsStore";
import {
  createServiceRequest,
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import {
  createSupportTicket,
  getCommunicationState,
  sendDriverMessage,
  sendWorkshopMessage,
  subscribeCommunication,
} from "../data/communicationStore";
import DriverBookingTrackingPanel from "../components/DriverBookingTrackingPanel";
import DriverSidebar from "../components/driver/DriverSidebar";
import DriverTopbar from "../components/driver/DriverTopbar";
import DriverOverviewSection from "../components/driver/DriverOverviewSection";
import DriverServiceRequestSection from "../components/driver/DriverServiceRequestSection";
import DriverDocumentsHistorySection from "../components/driver/DriverDocumentsHistorySection";
import DriverCommunicationSection from "../components/driver/DriverCommunicationSection";
import DriverProfileSection from "../components/driver/DriverProfileSection";
import { buildDriverBookingNotifications } from "../lib/driverBookingNotifications";
import {
  BOOKING_BASE_COST_BY_CATEGORY as baseCostByProblem,
  DRIVER_SERVICE_CATEGORIES as simpleIssueOptions,
  POINT_S_STATIONS,
  doesCategoryRequireDescription,
  doesCategoryRequirePhotos,
  doesCategoryRequireSubtype,
  getCategoryPolicyKeywords,
  getNearestPointSStationsForCategory,
} from "../data/driverBookingCatalog";

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseOdometerReading = (value) => {
  const normalized = String(value || "").replace(/[^0-9]/g, "");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};

const toKilometers = (value, unit = "km") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return String(unit).toLowerCase() === "miles"
    ? numeric * 1.60934
    : numeric;
};

const buildFallbackOdometer = (vehicleId, unit = "km") => {
  const numericId = Number(String(vehicleId || "").replace(/\D/g, "")) || 0;
  const baseKm = 120000 + (numericId % 17) * 1375;
  return unit === "miles" ? Math.round(baseKm * 0.621371) : baseKm;
};

const toIsoDate = (value) => {
  const parsed = toDate(value) || new Date();
  return parsed.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return "N/A";
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return "N/A";
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseDriverNotes = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return {
      emergencyContact: "",
      contactAddress: "",
      bio: "",
      photoUrl: "",
    };
  }

  const parts = text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  let contactAddress = "";
  let bio = "";
  let photoUrl = "";
  const emergencyParts = [];

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    if (lower.startsWith("address:")) {
      contactAddress = part.slice(8).trim();
      return;
    }
    if (lower.startsWith("bio:")) {
      bio = part.slice(4).trim();
      return;
    }
    if (lower.startsWith("photo:")) {
      photoUrl = part.slice(6).trim();
      return;
    }
    emergencyParts.push(part);
  });

  return {
    emergencyContact: emergencyParts.join(" | "),
    contactAddress,
    bio,
    photoUrl,
  };
};

const getWarrantyStatus = (expiryDate) => {
  const expiry = toDate(expiryDate);
  if (!expiry) {
    return "Unknown";
  }
  const today = new Date();
  const days = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) {
    return "Expired";
  }
  if (days <= 60) {
    return "Expiring soon";
  }
  return "Active";
};

const defaultTyreSpecs = (vehicleId) => {
  const num = Number(String(vehicleId || "").replace(/\D/g, "")) || 0;
  return {
    brand: ["Goodyear", "Michelin", "Bridgestone", "Continental"][num % 4],
    size: ["295/75R22.5", "11R22.5", "275/80R22.5", "255/70R22.5"][num % 4],
    frontPsi: 98 + (num % 6),
    rearPsi: 94 + (num % 6),
  };
};

const buildFallbackVehicle = (vehicleId, model = "Fleet Vehicle") => {
  const id = vehicleId || "VH-000";
  const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  return {
    id,
    model,
    plate: "N/A",
    type: "Truck",
    status: "Active",
    tyreSpecs: defaultTyreSpecs(id),
    serviceHistory: [
      {
        date: toIsoDate(new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)),
        event: "General inspection",
        cost: "$620",
      },
    ],
    warrantyProvider: "OEM",
    warrantyExpiryDate: expiry.toISOString().slice(0, 10),
    warrantyStatus: getWarrantyStatus(expiry),
  };
};

const getLatestPolicies = (policies) => {
  const map = new Map();
  policies.forEach((policy) => {
    const current = map.get(policy.policyCode);
    if (!current || Number(policy.version) > Number(current.version)) {
      map.set(policy.policyCode, policy);
    }
  });
  return Array.from(map.values());
};

const policyMatchesVehicle = (policy, vehicle, tenantName) => {
  const scope = policy.appliesTo || {};
  if (scope.vehicleId && scope.vehicleId !== vehicle.id) {
    return false;
  }
  if (scope.vehicleClass && scope.vehicleClass !== vehicle.type) {
    return false;
  }
  if (scope.fleet && tenantName) {
    const a = String(scope.fleet).toLowerCase();
    const b = String(tenantName).toLowerCase();
    if (a !== b) {
      return false;
    }
  }
  return true;
};

const eligibilityClass = (value) => {
  if (value === "Allowed") {
    return "bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/60";
  }
  if (value === "Approval Required") {
    return "bg-amber-900 text-amber-100 ring-1 ring-amber-700/60";
  }
  return "bg-rose-900 text-rose-100 ring-1 ring-rose-700/60";
};

const requestStatusClass = (value) => {
  const status = normalizeValue(value);
  if (status.includes("rejected")) {
    return "bg-rose-900 text-rose-100 ring-1 ring-rose-700/60";
  }
  if (status.includes("completed") || status.includes("closed")) {
    return "bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/60";
  }
  if (status.includes("progress")) {
    return "bg-sky-900 text-sky-100 ring-1 ring-sky-700/60";
  }
  if (status.includes("approved")) {
    return "bg-indigo-900 text-indigo-100 ring-1 ring-indigo-700/60";
  }
  return "bg-amber-900 text-amber-100 ring-1 ring-amber-700/60";
};

const slotTemplates = [
  { id: "08:30", label: "08:30 - 09:15" },
  { id: "09:30", label: "09:30 - 10:15" },
  { id: "10:30", label: "10:30 - 11:15" },
  { id: "11:30", label: "11:30 - 12:15" },
  { id: "13:30", label: "13:30 - 14:15" },
  { id: "14:30", label: "14:30 - 15:15" },
  { id: "15:30", label: "15:30 - 16:15" },
  { id: "16:30", label: "16:30 - 17:15" },
];

const DAMAGE_REPORT_CATEGORY = "Schadensmeldung";

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      reject(new Error("FileReader is not available."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Unable to read file ${file?.name || ""}`));
    reader.readAsDataURL(file);
  });

const buildPhotoAttachments = async (files = []) => {
  const safeFiles = Array.isArray(files) ? files : [];
  if (safeFiles.length === 0) {
    return [];
  }
  const attachments = await Promise.all(
    safeFiles.map(async (file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || "image/*",
      uploadedAt: new Date().toISOString(),
      dataUrl: await readFileAsDataUrl(file),
    })),
  );
  return attachments.filter((item) => Boolean(item.dataUrl));
};

const getNearestPosForProblem = (problemType) => {
  if (!String(problemType || "").trim()) {
    return [...POINT_S_STATIONS].sort((a, b) => a.distanceKm - b.distanceKm);
  }
  return getNearestPointSStationsForCategory(problemType);
};

const tyreSupplySelectionRequired = (problemType, problemSubtype) =>
  String(problemType || "").trim() === "Reifen" &&
  [
    "Tyre change (seasonal change)"
  ].includes(String(problemSubtype || "").trim());

const hashText = (text) => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }
  return Math.abs(hash);
};

const buildSlotAvailability = ({ posId, date, problemType }) => {
  if (!posId || !date) {
    return [];
  }
  const keyBase = `${posId}|${date}|${problemType}`;
  return slotTemplates.map((slot, index) => {
    const slotHash = hashText(`${keyBase}|${slot.id}|${index}`);
    const busy = slotHash % 5 === 0 || slotHash % 7 === 0;
    const queue = busy ? 2 + (slotHash % 4) : 0;
    const iso = new Date(`${date}T${slot.id}:00`).toISOString();
    return {
      id: `${date}-${slot.id}`,
      slotTime: slot.id,
      label: slot.label,
      status: busy ? "Busy" : "Free",
      queue,
      dateTime: iso,
    };
  });
};

const driverMenuRouteMap = {
  overview: "overview",
  service_request: "service-request",
  booking_tracking: "booking-tracking",
  documents_history: "documents-history",
  communication: "communication",
  profile: "profile",
};

const parseDriverMenuFromPath = (pathname) => {
  const cleaned = String(pathname || "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  const section = parts[1] || "";
  if (section === driverMenuRouteMap.overview) {
    return "overview";
  }
  if (section === driverMenuRouteMap.service_request) {
    return "service_request";
  }
  if (section === driverMenuRouteMap.booking_tracking) {
    return "booking_tracking";
  }
  if (section === driverMenuRouteMap.documents_history) {
    return "documents_history";
  }
  if (section === driverMenuRouteMap.communication) {
    return "communication";
  }
  if (section === driverMenuRouteMap.profile) {
    return "profile";
  }
  return "overview";
};

function DriverDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getSession,
  );
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState,
  );
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState,
  );
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState,
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState,
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState,
  );
  const communicationState = useSyncExternalStore(
    subscribeCommunication,
    getCommunicationState,
    getCommunicationState,
  );

  const driverRecord = useMemo(() => {
    const byId = driverState.drivers.find(
      (driver) => driver.id === session?.driverId,
    );
    if (byId) {
      return byId;
    }
    const byEmail = driverState.drivers.find(
      (driver) =>
        String(driver.email || "").toLowerCase() ===
        String(session?.email || "").toLowerCase(),
    );
    if (byEmail) {
      return byEmail;
    }
    const byName = driverState.drivers.find(
      (driver) =>
        String(driver.name || "").toLowerCase() ===
        String(session?.driverName || session?.name || "").toLowerCase(),
    );
    return byName || null;
  }, [
    driverState.drivers,
    session?.driverId,
    session?.driverName,
    session?.email,
    session?.name,
  ]);

  const tenant = useMemo(() => {
    const bySession = opsState.tenants.find(
      (item) => item.id === session?.tenantId,
    );
    if (bySession) {
      return bySession;
    }
    const byAssignment = opsState.tenantAssignments.find(
      (item) =>
        String(item.driverName || "").toLowerCase() ===
        String(
          driverRecord?.name || session?.driverName || session?.name || "",
        ).toLowerCase(),
    );
    if (byAssignment) {
      return (
        opsState.tenants.find((item) => item.id === byAssignment.tenantId) ||
        null
      );
    }
    return opsState.tenants[0] || null;
  }, [
    driverRecord?.name,
    opsState.tenantAssignments,
    opsState.tenants,
    session?.driverName,
    session?.name,
    session?.tenantId,
  ]);

  const assignedVehicleId =
    driverRecord?.assignedVehicleId ||
    session?.assignedVehicleId ||
    (String(session?.driverName || session?.name || "")
      .toLowerCase()
      .includes("jamie")
      ? "VH-884"
      : String(session?.driverName || session?.name || "")
            .toLowerCase()
            .includes("avery")
        ? "VH-241"
        : "");

  const vehicle = useMemo(() => {
    const fromStore = vehicleState.vehicles.find(
      (item) => item.id === assignedVehicleId,
    );
    if (fromStore) {
      return fromStore;
    }
    return buildFallbackVehicle(assignedVehicleId, "Assigned Fleet Vehicle");
  }, [assignedVehicleId, vehicleState.vehicles]);

  const nextService = useMemo(() => {
    const latest = [...(vehicle.serviceHistory || [])]
      .map((entry) => ({
        ...entry,
        parsedDate: toDate(entry.date),
      }))
      .sort(
        (a, b) =>
          (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0),
      )[0];

    const lastDate = latest?.parsedDate || new Date();
    const dueDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseKm =
      120000 +
      ((Number(String(vehicle.id || "").replace(/\D/g, "")) || 0) % 5000);
    const dueKm = baseKm + 6000;
    const serviceType = latest?.event?.toLowerCase().includes("tyre")
      ? "Tyre service"
      : "General service";

    return {
      date: dueDate,
      km: dueKm,
      serviceType,
    };
  }, [vehicle.id, vehicle.serviceHistory]);

  const matchingPolicies = useMemo(() => {
    const active = getLatestPolicies(policyState.policies).filter(
      (policy) => String(policy.status || "").toLowerCase() === "active",
    );
    return active.filter((policy) =>
      policyMatchesVehicle(policy, vehicle, tenant?.name || ""),
    );
  }, [policyState.policies, tenant?.name, vehicle]);

  const serviceEligibility = useMemo(() => {
    if (matchingPolicies.length === 0) {
      return {
        status: "Not Covered",
        note: "No active policy applies to this vehicle.",
      };
    }
    const policy = matchingPolicies[0];
    const allowedTypes = Array.isArray(policy.allowedServiceTypes)
      ? policy.allowedServiceTypes
      : [];
    const serviceType = String(nextService.serviceType || "").toLowerCase();
    const typeAllowed =
      allowedTypes.length === 0 ||
      allowedTypes.some((item) =>
        serviceType.includes(String(item || "").toLowerCase()),
      );

    if (!typeAllowed) {
      return {
        status: "Not Covered",
        note: `Service type is outside policy ${policy.policyCode}.`,
      };
    }

    if (
      policy.approvalThreshold !== null ||
      policy.servicePriceLimit !== null
    ) {
      return {
        status: "Approval Required",
        note: `Policy ${policy.policyCode} requires approval threshold checks.`,
      };
    }

    return {
      status: "Allowed",
      note: `Policy ${policy.policyCode} allows this service type.`,
    };
  }, [matchingPolicies, nextService.serviceType]);

  const seasonalReminder = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const winterWindow = month >= 11 || month <= 2;
    const reminderDate = winterWindow
      ? new Date(now.getFullYear(), 2, 1)
      : new Date(now.getFullYear(), 10, 1);
    const policyText = matchingPolicies
      .map((policy) => policy.seasonalTyreRules)
      .find((value) => String(value || "").trim().length > 0);

    return {
      title: winterWindow
        ? "Winter tyre window active"
        : "Next seasonal tyre window",
      dueDate: reminderDate,
      note:
        policyText ||
        "Run seasonal tyre inspection and confirm approved tyre category.",
    };
  }, [matchingPolicies]);

  const warranty = {
    provider: vehicle.warrantyProvider || "OEM",
    expiryDate: vehicle.warrantyExpiryDate || "",
    status:
      vehicle.warrantyStatus || getWarrantyStatus(vehicle.warrantyExpiryDate),
  };

  const analytics = useMemo(() => {
    const now = new Date();
    const daysToNextService = Math.ceil(
      (new Date(nextService.date).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const warrantyDaysRemaining = warranty.expiryDate
      ? Math.ceil(
          ((toDate(warranty.expiryDate)?.getTime() || now.getTime()) -
            now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    const serviceEligibilityScore =
      serviceEligibility.status === "Allowed"
        ? 92
        : serviceEligibility.status === "Approval Required"
          ? 68
          : 34;

    return {
      daysToNextService,
      warrantyDaysRemaining,
      serviceEligibilityScore,
    };
  }, [
    nextService.date,
    serviceEligibility.status,
    warranty.expiryDate,
  ]);

  const displayName =
    driverRecord?.name || session?.driverName || session?.name || "Driver";
  const displayEmail = session?.email || driverRecord?.email || "N/A";
  const parsedDriverNotes = useMemo(
    () => parseDriverNotes(driverRecord?.notes),
    [driverRecord?.notes],
  );
  const initialProfileForm = useMemo(
    () => ({
      name: displayName,
      email: displayEmail,
      phone: driverRecord?.phone || "+1 (555) 010-0000",
      license: driverRecord?.license || "CDL-A 847563",
      licenseClass: "CDL-A",
      licenseExpiry: "2027-09-30",
      contactAddress:
        parsedDriverNotes.contactAddress || tenant?.region || "N/A",
      emergencyContact:
        parsedDriverNotes.emergencyContact ||
        "Dispatch Desk - +1 (555) 010-2200",
      bio:
        parsedDriverNotes.bio ||
        "Experienced fleet driver focused on safe, on-time and compliant operations.",
      photoUrl: parsedDriverNotes.photoUrl || "",
    }),
    [
      displayEmail,
      displayName,
      driverRecord?.license,
      driverRecord?.phone,
      parsedDriverNotes.bio,
      parsedDriverNotes.contactAddress,
      parsedDriverNotes.emergencyContact,
      parsedDriverNotes.photoUrl,
      tenant?.region,
    ],
  );
  const profileInitials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "DR";

  const [requestForm, setRequestForm] = useState({
    problemType: "",
    problemSubtype: "",
    description: "",
    odometerReading: "",
    odometerUnit: "km",
    emergency: false,
    photos: [],
    preferredPosId: "",
    preferredDate: "",
    preferredSlotId: "",
    tyreSupplySource: "",
    posTyreAvailability: null,
    recommendationAccepted: false,
  });
  const [tyreWaitlistNotice, setTyreWaitlistNotice] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [wizardFeedback, setWizardFeedback] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const submitRequestTimeoutRef = useRef(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
  const activeMenu = useMemo(
    () => parseDriverMenuFromPath(location.pathname),
    [location.pathname],
  );
  const nearestPosOptions = useMemo(
    () => getNearestPosForProblem(requestForm.problemType),
    [requestForm.problemType],
  );
  const selectedPos = useMemo(() => {
    if (nearestPosOptions.length === 0 || !requestForm.preferredPosId) {
      return null;
    }
    const byId = nearestPosOptions.find(
      (pos) => pos.id === requestForm.preferredPosId,
    );
    return byId || null;
  }, [nearestPosOptions, requestForm.preferredPosId]);
  const requiresTyreSupplySelection = useMemo(
    () =>
      tyreSupplySelectionRequired(
        requestForm.problemType,
        requestForm.problemSubtype,
      ),
    [requestForm.problemSubtype, requestForm.problemType],
  );
  const isPosTyreUnavailableForBooking = useMemo(
    () =>
      requiresTyreSupplySelection &&
      requestForm.posTyreAvailability === false,
    [requestForm.posTyreAvailability, requiresTyreSupplySelection],
  );
  const isTyreAwaitingStock = useMemo(
    () =>
      requiresTyreSupplySelection &&
      requestForm.tyreSupplySource !== "driver" &&
      requestForm.posTyreAvailability === false,
    [
      requestForm.posTyreAvailability,
      requestForm.tyreSupplySource,
      requiresTyreSupplySelection,
    ],
  );
  const slotAvailability = useMemo(
    () => {
      if (isPosTyreUnavailableForBooking) {
        return [];
      }
      return buildSlotAvailability({
        posId: requestForm.preferredPosId,
        date: requestForm.preferredDate,
        problemType: requestForm.problemType,
      });
    },
    [
      isPosTyreUnavailableForBooking,
      requestForm.preferredDate,
      requestForm.preferredPosId,
      requestForm.problemType,
    ],
  );
  const selectedSlot = useMemo(
    () =>
      slotAvailability.find(
        (slot) =>
          slot.id === requestForm.preferredSlotId && slot.status === "Free",
      ) || null,
    [requestForm.preferredSlotId, slotAvailability],
  );
  const isDamageReportFlow = useMemo(
    () => String(requestForm.problemType || "").trim() === DAMAGE_REPORT_CATEGORY,
    [requestForm.problemType],
  );

  useEffect(() => {
    const expectedPath = `/driver-dashboard/${driverMenuRouteMap[activeMenu]}`;
    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }
  }, [activeMenu, location.pathname, navigate]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (nearestPosOptions.length === 0) {
      setRequestForm((prev) => {
        if (!prev.preferredPosId && !prev.preferredSlotId) {
          return prev;
        }
        return {
          ...prev,
          preferredPosId: "",
          preferredSlotId: "",
          tyreSupplySource: "",
          posTyreAvailability: null,
        };
      });
      return;
    }
    setRequestForm((prev) => {
      if (!prev.preferredPosId) {
        return prev;
      }
      const stillValid = nearestPosOptions.some(
        (pos) => pos.id === prev.preferredPosId,
      );
      if (stillValid) {
        return prev;
      }
      return {
        ...prev,
        preferredPosId: "",
        preferredSlotId: "",
        tyreSupplySource: "",
        posTyreAvailability: null,
      };
    });
  }, [nearestPosOptions]);

  useEffect(
    () => () => {
      if (submitRequestTimeoutRef.current) {
        window.clearTimeout(submitRequestTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setRequestForm((prev) => {
      if (!prev.preferredSlotId) {
        return prev;
      }
      const stillFree = slotAvailability.some(
        (slot) => slot.id === prev.preferredSlotId && slot.status === "Free",
      );
      if (stillFree) {
        return prev;
      }
      return {
        ...prev,
        preferredSlotId: "",
      };
    });
  }, [slotAvailability]);

  const driverScopedOrders = useMemo(() => {
    const vehicleId = normalizeValue(vehicle.id);
    const driver = normalizeValue(displayName);
    return [...(serviceOrderState.orders || [])]
      .filter((order) => {
        const orderVehicle = normalizeValue(order?.vehicleId);
        const orderDriver = normalizeValue(order?.requestedBy);
        return orderVehicle === vehicleId || orderDriver === driver;
      })
      .sort(
        (a, b) =>
          (toDate(b?.requestedAt || b?.updatedAt)?.getTime() || 0) -
          (toDate(a?.requestedAt || a?.updatedAt)?.getTime() || 0),
      );
  }, [displayName, serviceOrderState.orders, vehicle.id]);

  const driverServiceRequests = useMemo(
    () => driverScopedOrders.slice(0, 12),
    [driverScopedOrders],
  );

  const lastRecordedOdometer = useMemo(() => {
    const latestWithReading = driverScopedOrders.find(
      (order) =>
        parseOdometerReading(order?.orderDetails?.odometerReading) !== null,
    );
    if (latestWithReading) {
      return {
        reading: parseOdometerReading(latestWithReading.orderDetails?.odometerReading),
        unit:
          String(latestWithReading.orderDetails?.odometerUnit || "km").toLowerCase() ===
          "miles"
            ? "miles"
            : "km",
        isFallback: false,
      };
    }
    return {
      reading: buildFallbackOdometer(vehicle.id, requestForm.odometerUnit),
      unit: requestForm.odometerUnit,
      isFallback: true,
    };
  }, [driverScopedOrders, requestForm.odometerUnit, vehicle.id]);

  const currentOdometerReading = useMemo(
    () => parseOdometerReading(requestForm.odometerReading),
    [requestForm.odometerReading],
  );

  const odometerError = useMemo(() => {
    if (!String(requestForm.odometerReading || "").trim()) {
      return "Current odometer reading is required.";
    }
    if (currentOdometerReading === null) {
      return "Enter a valid odometer reading.";
    }
    if (
      lastRecordedOdometer?.reading !== null &&
      currentOdometerReading < lastRecordedOdometer.reading
    ) {
      return `Current odometer cannot be less than the last recorded reading of ${lastRecordedOdometer.reading.toLocaleString()} ${lastRecordedOdometer.unit}.`;
    }
    return "";
  }, [currentOdometerReading, lastRecordedOdometer, requestForm.odometerReading]);
  const odometerRecommendation = useMemo(() => {
    if (!String(requestForm.odometerReading || "").trim()) {
      return null;
    }
    if (currentOdometerReading === null || odometerError) {
      return null;
    }

    const currentKm = toKilometers(
      currentOdometerReading,
      requestForm.odometerUnit,
    );
    const lastKm = toKilometers(
      lastRecordedOdometer?.reading,
      lastRecordedOdometer?.unit || "km",
    );
    if (currentKm === null || lastKm === null || currentKm <= lastKm) {
      return null;
    }

    const distanceKm = Math.round(currentKm - lastKm);
    if (distanceKm < 300) {
      return null;
    }

    if (distanceKm >= 12000) {
      return {
        level: "high",
        title: "Comprehensive service recommended",
        summary: `${distanceKm.toLocaleString()} km driven since last recorded reading.`,
        suggestion: "Book Service with tyre inspection and brake safety check.",
        suggestedCategory: "Service",
      };
    }
    if (distanceKm >= 8000) {
      return {
        level: "medium",
        title: "Scheduled service is due soon",
        summary: `${distanceKm.toLocaleString()} km driven since last recorded reading.`,
        suggestion: "Book Service to avoid overdue maintenance.",
        suggestedCategory: "Service",
      };
    }
    if (distanceKm >= 5000) {
      return {
        level: "medium",
        title: "Tyre check recommended",
        summary: `${distanceKm.toLocaleString()} km driven since last recorded reading.`,
        suggestion: "Consider Reifen for pressure, wear, and alignment check.",
        suggestedCategory: "Reifen",
      };
    }
    return {
      level: "low",
      title: "Preventive inspection suggested",
      summary: `${distanceKm.toLocaleString()} km driven since last recorded reading.`,
      suggestion: "A quick Service check can prevent small issues from growing.",
      suggestedCategory: "Service",
    };
  }, [
    currentOdometerReading,
    lastRecordedOdometer?.reading,
    lastRecordedOdometer?.unit,
    odometerError,
    requestForm.odometerReading,
    requestForm.odometerUnit,
  ]);
  useEffect(() => {
    if (odometerRecommendation || !requestForm.recommendationAccepted) {
      return;
    }
    setRequestForm((prev) =>
      prev.recommendationAccepted
        ? { ...prev, recommendationAccepted: false }
        : prev,
    );
  }, [odometerRecommendation, requestForm.recommendationAccepted]);

  const isServiceRequestFormReady = useMemo(() => {
    const hasProblemType = Boolean(
      String(requestForm.problemType || "").trim(),
    );
    const hasSubtype =
      !doesCategoryRequireSubtype(requestForm.problemType) ||
      Boolean(String(requestForm.problemSubtype || "").trim());
    const hasDescription =
      !doesCategoryRequireDescription(
        requestForm.problemType,
        requestForm.problemSubtype,
      ) || Boolean(String(requestForm.description || "").trim());
    const hasPhotos =
      !doesCategoryRequirePhotos(requestForm.problemType) ||
      requestForm.photos.length > 0;
    const hasTyreSupplySelection =
      !requiresTyreSupplySelection || requestForm.posTyreAvailability !== null;
    const hasBookingSelection = isDamageReportFlow
      ? true
      : isTyreAwaitingStock
        ? true
      : Boolean(requestForm.preferredPosId) &&
        Boolean(requestForm.preferredDate) &&
        Boolean(selectedSlot);

    return (
      hasProblemType &&
      hasSubtype &&
      hasDescription &&
      hasPhotos &&
      hasTyreSupplySelection &&
      !odometerError &&
      hasBookingSelection
    );
  }, [
    isDamageReportFlow,
    odometerError,
    requestForm.description,
    requestForm.preferredDate,
    requestForm.preferredPosId,
    requestForm.problemType,
    requestForm.problemSubtype,
    requestForm.posTyreAvailability,
    requestForm.photos.length,
    requestForm.tyreSupplySource,
    requiresTyreSupplySelection,
    isTyreAwaitingStock,
    selectedSlot,
  ]);

  const selectedRequest = useMemo(() => {
    if (driverServiceRequests.length === 0) {
      return null;
    }
    const bySelection = driverServiceRequests.find(
      (order) => order.id === selectedRequestId,
    );
    return bySelection || driverServiceRequests[0];
  }, [driverServiceRequests, selectedRequestId]);

  const bookingNotifications = useMemo(
    () =>
      buildDriverBookingNotifications({
        nextServiceDate: nextService.date,
        scopedOrders: driverScopedOrders,
        vehicleId: vehicle.id,
      }),
    [driverScopedOrders, nextService.date, vehicle.id],
  );

  useEffect(() => {
    setClearedNotificationIds((prev) =>
      prev.filter((id) => bookingNotifications.some((item) => item.id === id)),
    );
  }, [bookingNotifications]);

  const visibleBookingNotifications = useMemo(
    () =>
      bookingNotifications.filter(
        (item) => !clearedNotificationIds.includes(item.id),
      ),
    [bookingNotifications, clearedNotificationIds],
  );

  const driverNotificationCount = visibleBookingNotifications.length;

  const documentsHistoryRows = useMemo(() => {
    return (vehicle.serviceHistory || [])
      .map((entry, index) => {
        const event = String(entry?.event || "Service update");
        return {
          id: `VH-SVC-${index + 1}`,
          source: "Vehicle service log",
          date: entry?.date || new Date().toISOString(),
          title: event,
          isTyre: normalizeValue(event).includes("tyre"),
          cost: entry?.cost || "N/A",
          location: tenant?.region || "N/A",
          details: `${event} recorded in assigned vehicle service history.`,
          documentNo: `SVC-${String(vehicle.id || "VH")
            .replace(/[^A-Z0-9]/gi, "")
            .toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
        };
      })
      .sort(
        (a, b) =>
          (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0),
      )
      .slice(0, 30);
  }, [tenant?.region, vehicle.id, vehicle.serviceHistory]);

  const tyreReplacementHistory = useMemo(
    () => documentsHistoryRows.filter((row) => row.isTyre),
    [documentsHistoryRows],
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [profileNotice, setProfileNotice] = useState("");
  const licenseReminder = useMemo(() => {
    const expiry = toDate(profileForm.licenseExpiry);
    if (!expiry) {
      return {
        daysRemaining: null,
        status: "Unknown",
        tone: "bg-slate-100 text-slate-700",
        note: "Add a license expiry date to enable reminders.",
      };
    }
    const now = new Date();
    const daysRemaining = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysRemaining < 0) {
      return {
        daysRemaining,
        status: "Expired",
        tone: "bg-rose-100 text-rose-700",
        note: `License expired on ${formatDate(profileForm.licenseExpiry)}. Update it immediately.`,
      };
    }
    if (daysRemaining <= 30) {
      return {
        daysRemaining,
        status: "Due soon",
        tone: "bg-amber-100 text-amber-700",
        note: `License check required within ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
      };
    }
    return {
      daysRemaining,
      status: "Valid",
      tone: "bg-emerald-100 text-emerald-700",
      note: `License valid until ${formatDate(profileForm.licenseExpiry)}.`,
    };
  }, [formatDate, profileForm.licenseExpiry]);
  const selectedDocument = useMemo(() => {
    if (documentsHistoryRows.length === 0) {
      return null;
    }
    const bySelection = documentsHistoryRows.find(
      (row) => row.id === selectedDocumentId,
    );
    return bySelection || documentsHistoryRows[0];
  }, [documentsHistoryRows, selectedDocumentId]);

  useEffect(() => {
    setProfileForm(initialProfileForm);
  }, [initialProfileForm]);

  const communicationContacts = useMemo(
    () => [
      {
        id: "fleet_manager",
        title: "Chat with fleet manager",
        name: tenant?.fleetManager || "Fleet Manager",
        subtitle: "Approval and policy support",
        phone: "+1 (555) 010-2411",
      },
      {
        id: "workshop_pos",
        title: "Contact workshop/POS",
        name: tenant?.workshopLead || "Workshop Desk",
        subtitle: "Booking and workshop coordination",
        phone: "+1 (555) 010-9820",
      },
      {
        id: "support",
        title: "Support/help request",
        name: "Support Team",
        subtitle: "Technical and booking help",
        phone: "",
      },
    ],
    [tenant?.fleetManager, tenant?.workshopLead],
  );

  const supportTopicOptions = [
    "General help",
    "App not working",
    "Booking issue",
    "Emergency support",
  ];

  const activeDriverId = driverRecord?.id || session?.driverId || "";
  const [activeCommunicationContact, setActiveCommunicationContact] =
    useState("fleet_manager");
  const [communicationDraft, setCommunicationDraft] = useState("");
  const [supportRequest, setSupportRequest] = useState({
    topic: "General help",
    message: "",
  });
  const [communicationNotice, setCommunicationNotice] = useState("");

  const activeCommunicationDetails =
    communicationContacts.find(
      (item) => item.id === activeCommunicationContact,
    ) || communicationContacts[0];
  const fleetConversation = useMemo(() => {
    const rows = communicationState.driverMessages
      .filter(
        (message) =>
          normalizeValue(message.driverId) === normalizeValue(activeDriverId) ||
          normalizeValue(message.driverName) === normalizeValue(displayName),
      )
      .sort(
        (a, b) =>
          (toDate(a.sentAt)?.getTime() || 0) -
          (toDate(b.sentAt)?.getTime() || 0),
      )
      .map((message) => ({
        id: message.id,
        sender: message.sentBy || "Fleet Desk",
        text: message.message,
        createdAt: message.sentAt,
        mine: normalizeValue(message.fromRole) === "driver",
      }));
    if (rows.length > 0) {
      return rows;
    }
    return [
      {
        id: "FM-1001",
        sender: "Fleet Manager",
        text: "Send short message here. We will guide you quickly.",
        createdAt: "2026-03-03T07:45:00.000Z",
        mine: false,
      },
    ];
  }, [activeDriverId, communicationState.driverMessages, displayName]);

  const activeWorkshopName =
    activeCommunicationDetails?.name || tenant?.workshopLead || "Workshop Desk";
  const workshopConversation = useMemo(() => {
    const rows = communicationState.workshopMessages
      .filter(
        (message) =>
          normalizeValue(message.workshop) ===
          normalizeValue(activeWorkshopName),
      )
      .sort(
        (a, b) =>
          (toDate(a.sentAt)?.getTime() || 0) -
          (toDate(b.sentAt)?.getTime() || 0),
      )
      .map((message) => ({
        id: message.id,
        sender: message.sentBy || activeWorkshopName,
        text: message.message,
        createdAt: message.sentAt,
        mine: normalizeValue(message.fromRole) === "driver",
      }));
    if (rows.length > 0) {
      return rows;
    }
    return [
      {
        id: "WS-1001",
        sender: activeWorkshopName,
        text: "Share vehicle issue and current location.",
        createdAt: "2026-03-03T08:00:00.000Z",
        mine: false,
      },
    ];
  }, [activeWorkshopName, communicationState.workshopMessages]);

  const supportMessages = useMemo(() => {
    const rows = communicationState.tickets
      .filter((ticket) => {
        const createdBy = normalizeValue(ticket.createdBy);
        const relatedRef = normalizeValue(ticket.relatedRef);
        return (
          createdBy === normalizeValue(displayName) ||
          relatedRef === normalizeValue(activeDriverId) ||
          relatedRef === normalizeValue(displayName)
        );
      })
      .sort(
        (a, b) =>
          (toDate(b.updatedAt)?.getTime() || 0) -
          (toDate(a.updatedAt)?.getTime() || 0),
      )
      .slice(0, 12)
      .map((ticket) => ({
        id: ticket.id,
        sender: `Support (${ticket.status})`,
        text: `${ticket.id} - ${ticket.subject}`,
        createdAt: ticket.updatedAt,
        mine: false,
      }));
    if (rows.length > 0) {
      return rows;
    }
    return [
      {
        id: "SUP-1001",
        sender: "Support Team",
        text: "Need help? Send issue and we will raise a support ticket.",
        createdAt: "2026-03-03T08:10:00.000Z",
        mine: false,
      },
    ];
  }, [activeDriverId, communicationState.tickets, displayName]);

  const activeCommunicationMessages =
    activeCommunicationContact === "fleet_manager"
      ? fleetConversation
      : activeCommunicationContact === "workshop_pos"
        ? workshopConversation
        : supportMessages;

  const estimatedCost = useMemo(() => {
    const baseCost = baseCostByProblem[requestForm.problemType] || 420;
    const emergencySurcharge = requestForm.emergency ? 250 : 0;
    const labour = Math.round(baseCost * 0.35);
    const parts = Math.round(baseCost * 0.55);
    const total = parts + labour + emergencySurcharge;
    return {
      baseCost,
      parts,
      labour,
      emergencySurcharge,
      total,
    };
  }, [requestForm.emergency, requestForm.problemType]);

  const policyValidation = useMemo(() => {
    if (matchingPolicies.length === 0) {
      return {
        status: "Not Covered",
        note: "No matching active policy found for this vehicle.",
      };
    }

    const policy = matchingPolicies[0];
    const allowedTypes = Array.isArray(policy.allowedServiceTypes)
      ? policy.allowedServiceTypes.map((item) =>
          String(item || "").toLowerCase(),
        )
      : [];
    const requestedTypeKeywords = getCategoryPolicyKeywords(
      requestForm.problemType,
      requestForm.problemSubtype,
    );
    const typeAllowed =
      allowedTypes.length === 0 ||
      allowedTypes.some((allowed) =>
        requestedTypeKeywords.some(
          (keyword) => keyword.includes(allowed) || allowed.includes(keyword),
        ),
      );

    if (!typeAllowed) {
      return {
        status: "Not Covered",
        note: `Problem type is outside policy ${policy.policyCode}.`,
      };
    }

    const serviceLimit = policy.servicePriceLimit ?? null;
    const requiresApprovalByLimit =
      serviceLimit !== null &&
      Number(estimatedCost.total) > Number(serviceLimit);
    const requiresApprovalByPolicy = policy.approvalThreshold !== null;
    const requiresApproval =
      requestForm.emergency ||
      requiresApprovalByLimit ||
      requiresApprovalByPolicy;

    if (requiresApproval) {
      return {
        status: "Approval Required",
        note: `Policy ${policy.policyCode} requires fleet manager approval before booking.`,
      };
    }

    return {
      status: "Allowed",
      note: `Policy ${policy.policyCode} allows direct booking.`,
    };
  }, [
    estimatedCost.total,
    matchingPolicies,
    requestForm.emergency,
    requestForm.problemType,
    requestForm.problemSubtype,
  ]);

  const onSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  const onPhotoChange = (event) => {
    const files = Array.from(event.target.files || []);
    setRequestForm((prev) => ({
      ...prev,
      photos: files.slice(0, 6),
    }));
  };

  const createDriverServiceRequest = ({
    emergency = false,
    approval = true,
    attachments = [],
    routeToFleetOnly = false,
    awaitingTyreStock = false,
  } = {}) => {
    const selectedPosName = routeToFleetOnly
      ? "Fleet Damage Desk"
      : selectedPos?.name || tenant?.workshopLead || "Point S station (unassigned)";
    const slotLabel = selectedSlot?.label || "Not selected";
    const preferredDateLabel = formatDate(requestForm.preferredDate);
    const serviceLabel = requestForm.problemSubtype
      ? `${requestForm.problemType} - ${requestForm.problemSubtype}`
      : requestForm.problemType;
    const tyreSupplyText =
      requestForm.tyreSupplySource === "driver"
        ? "Driver bringing tyres"
        : requestForm.tyreSupplySource === "pos"
          ? requestForm.posTyreAvailability
            ? "Tyres requested from POS (stock available)"
            : "Tyres requested from POS (stock unavailable)"
          : "Not applicable";
    const includeOdometerRecommendation = Boolean(
      requestForm.recommendationAccepted && odometerRecommendation,
    );
    const odometerReading = parseOdometerReading(requestForm.odometerReading);
    const odometerUnit = requestForm.odometerUnit === "miles" ? "miles" : "km";
    const order = createServiceRequest({
      vehicleId: vehicle.id || "N/A",
      vehicleModel: vehicle.model || "Assigned Fleet Vehicle",
      serviceType: serviceLabel,
      requestTitle: `${serviceLabel} request`,
      requestedBy: displayName,
      priority: emergency ? "Emergency" : "Normal",
      emergency,
      status: routeToFleetOnly || approval ? "Pending approval" : "Pending booking",
      orderDetails: {
        description:
          requestForm.description ||
          (routeToFleetOnly
            ? `${serviceLabel} reported by driver and routed to fleet for direct triage.`
            : awaitingTyreStock
              ? `${serviceLabel} reported by driver. Tyres unavailable at ${selectedPosName}; notify driver when stock is available for slot booking.`
            : `${serviceLabel} reported by driver. Preferred slot: ${slotLabel} on ${preferredDateLabel}.`),
        vendor: selectedPosName,
        estimatedCost: `$${estimatedCost.total}`,
        location: routeToFleetOnly
          ? tenant?.region || "N/A"
          : selectedPos?.address || tenant?.region || "N/A",
        odometerReading,
        odometerUnit,
        routeTo: routeToFleetOnly ? "fleet-only" : "pos",
        attachments,
        recommendationAccepted: includeOdometerRecommendation,
        recommendation: includeOdometerRecommendation
          ? {
              level: odometerRecommendation.level,
              title: odometerRecommendation.title,
              summary: odometerRecommendation.summary,
              suggestion: odometerRecommendation.suggestion,
              suggestedCategory: odometerRecommendation.suggestedCategory,
            }
          : null,
        notes: [
          `Tenant: ${tenant?.name || "N/A"}`,
          `Category: ${requestForm.problemType || "N/A"}`,
          `Subcategory: ${requestForm.problemSubtype || "N/A"}`,
          `Odometer reading: ${odometerReading?.toLocaleString() || "N/A"} ${odometerUnit}`,
          routeToFleetOnly
            ? "Routing: Direct to fleet manager (damage workflow)."
            : `Preferred Point S station: ${selectedPosName} (${selectedPos?.distanceKm ?? "N/A"} km, ETA ${
                selectedPos?.etaMin ?? "N/A"
              } min)`,
          `Tyre supply: ${tyreSupplyText}`,
          `Preferred date: ${requestForm.preferredDate || "N/A"}`,
          `Preferred slot: ${routeToFleetOnly || awaitingTyreStock ? "N/A" : slotLabel}`,
          `Booking mode: ${
            awaitingTyreStock
              ? "Awaiting tyre stock notification (no date/slot selected)"
              : "Standard slot booking"
          }`,
          `Photos: ${requestForm.photos.map((file) => file.name).join(", ") || "None"}`,
          `Policy check: ${policyValidation.status}`,
          includeOdometerRecommendation
            ? `Driver accepted odometer recommendation: ${odometerRecommendation.title} | ${odometerRecommendation.suggestion} | Suggested category: ${odometerRecommendation.suggestedCategory}`
            : "Driver accepted odometer recommendation: No",
        ].join(" | "),
      },
      appointment: !routeToFleetOnly && !awaitingTyreStock && selectedSlot
        ? {
            dateTime: selectedSlot.dateTime,
            note: `Preferred slot selected by driver at ${selectedPosName}.`,
          }
        : undefined,
    });
    return order;
  };

  const handleSubmitSimpleRequest = async () => {
    if (isSubmittingRequest) {
      return;
    }
    if (!String(requestForm.problemType || "").trim()) {
      const message = "Select a service category first.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    if (
      doesCategoryRequireDescription(
        requestForm.problemType,
        requestForm.problemSubtype,
      ) &&
      !String(requestForm.description || "").trim()
    ) {
      const message = "Add the required issue details before continuing.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    if (
      doesCategoryRequirePhotos(requestForm.problemType) &&
      requestForm.photos.length === 0
    ) {
      const message = "Upload at least one photo for the damage report.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    if (odometerError) {
      setWizardFeedback(odometerError);
      toast.error("Request not sent", {
        description: odometerError,
        duration: 3200,
      });
      return;
    }
    if (!isDamageReportFlow && !requestForm.preferredPosId) {
      const message = "Select a nearby Point S station first.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    if (requiresTyreSupplySelection && requestForm.posTyreAvailability === null) {
      const message =
        "Select Point S station to auto-check tyre availability.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3600 });
      return;
    }
    if (!isDamageReportFlow && !isTyreAwaitingStock && !requestForm.preferredDate) {
      const message = "Select a booking date first.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    if (!isDamageReportFlow && !isTyreAwaitingStock && !selectedSlot) {
      const message = "Select a free slot to continue.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3200 });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const approvalRequired =
        isDamageReportFlow ||
        requestForm.emergency ||
        policyValidation.status !== "Allowed";
      let attachments = [];
      try {
        attachments = await buildPhotoAttachments(requestForm.photos);
      } catch (error) {
        const message =
          "Could not process uploaded photos. Please re-upload and try again.";
        setWizardFeedback(message);
        toast.error("Request not sent", { description: message, duration: 3600 });
        return;
      }
      await new Promise((resolve) => {
        submitRequestTimeoutRef.current = window.setTimeout(resolve, 900);
      });
      const createdOrder = createDriverServiceRequest({
        emergency: requestForm.emergency || isDamageReportFlow,
        approval: approvalRequired,
        attachments,
        routeToFleetOnly: isDamageReportFlow,
        awaitingTyreStock: isTyreAwaitingStock,
      });
      const successMessage = isDamageReportFlow
        ? "Damage report sent directly to fleet manager with your photos."
        : isTyreAwaitingStock
          ? "Request saved. We will notify you once tyres are available for booking."
          : approvalRequired
            ? "Request sent. Fleet manager approval is required."
            : "Request sent. Booking flow has started.";

      setWizardFeedback(successMessage);
      if (createdOrder?.id) {
        setSelectedRequestId(createdOrder.id);
      }
      if (isTyreAwaitingStock && selectedPos) {
        setTyreWaitlistNotice({
          orderId: createdOrder?.id || "",
          stationName: selectedPos.name,
          tyreSize: vehicle?.tyreSpecs?.size || "N/A",
        });
      }

      toast.success("Request sent successfully", {
        description: successMessage,
        duration: 3600,
      });

      window.setTimeout(() => {
        const detailsSection = window.document.getElementById(
          "driver-service-request-details",
        );
        detailsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 160);

      setRequestForm({
        problemType: "",
        problemSubtype: "",
        description: "",
        odometerReading: "",
        odometerUnit: requestForm.odometerUnit,
        emergency: false,
        photos: [],
        preferredPosId: "",
        preferredDate: "",
        preferredSlotId: "",
        tyreSupplySource: "",
        posTyreAvailability: null,
        recommendationAccepted: false,
      });
    } catch (error) {
      const message = "Unable to send service request. Please try again.";
      setWizardFeedback(message);
      toast.error("Request not sent", { description: message, duration: 3600 });
      console.error("Failed to create driver service request", error);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDownloadServiceDetails = (row) => {
    if (!row || typeof window === "undefined") {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=900,height=700",
    );
    if (!printWindow) {
      toast.error("Unable to open print dialog", {
        description: "Please allow pop-ups to save service details as PDF.",
        duration: 3600,
      });
      return;
    }

    const content = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${row.documentNo} - Service Details</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 24px 0 8px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin-top: 20px; }
      .meta p { margin: 0; font-size: 14px; }
      .label { color: #475569; font-weight: 600; }
      .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; background: #f8fafc; margin-top: 16px; }
      .badge { display: inline-block; margin-top: 16px; padding: 6px 12px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Service Details</h1>
    <p>${row.title}</p>
    <div class="meta">
      <p><span class="label">Document:</span> ${row.documentNo}</p>
      <p><span class="label">Source:</span> ${row.source}</p>
      <p><span class="label">Date:</span> ${formatDateTime(row.date)}</p>
      <p><span class="label">Location:</span> ${row.location}</p>
    </div>
    <div class="card">
      <h2>Details</h2>
      <p>${String(row.details || "N/A").replace(/\n/g, "<br />")}</p>
    </div>
    ${row.isTyre ? '<div class="badge">Tyre replacement history</div>' : ""}
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleSendCommunicationMessage = () => {
    const message = communicationDraft.trim();
    if (!message) {
      setCommunicationNotice("Type a message first.");
      return;
    }

    if (activeCommunicationContact === "fleet_manager") {
      sendDriverMessage({
        driverId: activeDriverId || "N/A",
        driverName: displayName,
        channel: "In-app",
        message,
        sentBy: displayName,
        fromRole: "driver",
        toRole: "fleet",
      });
    } else if (activeCommunicationContact === "workshop_pos") {
      sendWorkshopMessage({
        workshop: activeWorkshopName,
        channel: "Portal",
        urgency: "Normal",
        message,
        sentBy: displayName,
        fromRole: "driver",
        toRole: "workshop",
      });
    } else {
      const created = createSupportTicket({
        subject: supportRequest.topic || "Driver support request",
        category: "Driver support",
        priority:
          supportRequest.topic === "Emergency support" ? "High" : "Medium",
        relatedRef: activeDriverId || vehicle.id || displayName,
        description: message,
        assignee: "Support Team",
        createdBy: displayName,
        status: "Open",
        escalationLevel: 0,
      });
      setCommunicationNotice(`Support request ${created.id} submitted.`);
      setCommunicationDraft("");
      return;
    }
    setCommunicationDraft("");
    setCommunicationNotice(
      `Message sent to ${activeCommunicationDetails?.name || "contact"}.`,
    );
  };

  const handleQuickMessage = (value) => {
    setCommunicationDraft(value);
  };

  const handleSupportRequestSubmit = () => {
    const message = supportRequest.message.trim();
    if (!message) {
      setCommunicationNotice("Write short issue for support.");
      return;
    }
    const created = createSupportTicket({
      subject: supportRequest.topic || "Driver support request",
      category: "Driver support",
      priority:
        supportRequest.topic === "Emergency support" ? "High" : "Medium",
      relatedRef: activeDriverId || vehicle.id || displayName,
      description: message,
      assignee: "Support Team",
      createdBy: displayName,
      status: "Open",
      escalationLevel: 0,
    });
    setSupportRequest((prev) => ({ ...prev, message: "" }));
    setCommunicationNotice(`Support request ${created.id} submitted.`);
  };

  const handleCallContact = (contactPhone) => {
    setCommunicationNotice(`Contact request sent to ${contactPhone}.`);
  };

  const handleProfileSave = () => {
    const notesParts = [];
    const emergencyText = profileForm.emergencyContact.trim();
    const addressText = profileForm.contactAddress.trim();
    const bioText = profileForm.bio.trim();
    const photoText = profileForm.photoUrl.trim();
    if (emergencyText) {
      notesParts.push(emergencyText);
    }
    if (addressText) {
      notesParts.push(`Address: ${addressText}`);
    }
    if (bioText) {
      notesParts.push(`Bio: ${bioText}`);
    }
    if (photoText) {
      notesParts.push(`Photo: ${photoText}`);
    }

    const payload = {
      name: profileForm.name.trim() || displayName,
      email: profileForm.email.trim() || displayEmail,
      phone: profileForm.phone.trim() || "N/A",
      license: profileForm.license.trim() || "N/A",
      notes: notesParts.join(" | "),
    };

    if (driverRecord?.id) {
      updateDriver(driverRecord.id, payload);
      setProfileNotice("Profile updated successfully.");
      return;
    }

    setProfileNotice("Profile saved for current session.");
  };

  const handleProfileReset = () => {
    setProfileForm(initialProfileForm);
    setProfileNotice("Profile changes reset.");
  };

  const clearDriverNotification = (notificationId) => {
    if (!notificationId) {
      return;
    }
    setClearedNotificationIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId],
    );
  };

  const clearAllDriverNotifications = () => {
    setClearedNotificationIds(bookingNotifications.map((item) => item.id));
  };

  const handleDriverNotificationAction = (notification) => {
    const requestedMenu = notification?.actionMenu;
    const menuKey =
      requestedMenu && driverMenuRouteMap[requestedMenu]
        ? requestedMenu
        : "booking_tracking";

    if (menuKey === "service_request" && notification?.orderId) {
      setSelectedRequestId(notification.orderId);
    }
    if (menuKey === "communication") {
      setActiveCommunicationContact(
        notification?.iconKey === "emergency" ? "support" : "fleet_manager",
      );
    }

    setIsMobileSidebarOpen(false);
    navigate(`/driver-dashboard/${driverMenuRouteMap[menuKey]}`);
  };

  const handleSidebarMenuClick = (menuKey) => {
    setIsMobileSidebarOpen(false);
    navigate(
      `/driver-dashboard/${driverMenuRouteMap[menuKey] || driverMenuRouteMap.overview}`,
    );
  };

  return (
    <main className="driver-dashboard-theme h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full min-w-0">
        <div className="hidden lg:block">
          <DriverSidebar
            activeMenu={activeMenu}
            isCollapsed={isDesktopSidebarCollapsed}
            onMenuClick={handleSidebarMenuClick}
            onSignOut={onSignOut}
            onToggleCollapse={() =>
              setIsDesktopSidebarCollapsed((prev) => !prev)
            }
            showCollapseToggle
          />
        </div>

        <div
          className={`fixed inset-0 z-50 lg:hidden ${
            isMobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            aria-label="Close menu backdrop"
            className={`absolute inset-0 bg-slate-900/45 transition-opacity duration-300 ease-in-out ${
              isMobileSidebarOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
          <div
            className={`absolute inset-y-0 left-0 w-72 transform transition-transform duration-300 ease-in-out ${
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <button
              aria-label="Close menu"
              className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full bg-white/10 text-white"
              onClick={() => setIsMobileSidebarOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <DriverSidebar
              activeMenu={activeMenu}
              isCollapsed={false}
              isMobile
              onMenuClick={handleSidebarMenuClick}
              onSignOut={onSignOut}
              showCollapseToggle={false}
            />
          </div>
        </div>

        <section
          className={`min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-0 ${
            isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
          } lg:px-8 lg:pb-8 lg:pt-0`}
        >
          <div className="-mx-4 top-0 z-40 pb-3 pt-0 sm:-mx-6 sm:pb-4 sm:pt-0 lg:-mx-8 lg:pb-4 lg:pt-0">
            <DriverTopbar
              activeMenu={activeMenu}
              displayEmail={displayEmail}
              displayName={displayName}
              driverNotificationCount={driverNotificationCount}
              notifications={visibleBookingNotifications}
              onClearAllNotifications={clearAllDriverNotifications}
              onClearNotification={clearDriverNotification}
              onNotificationAction={handleDriverNotificationAction}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              profileInitials={profileInitials}
            />
          </div>

          {activeMenu === "overview" ? (
            <DriverOverviewSection
              analytics={analytics}
              driverServiceRequests={driverServiceRequests}
              eligibilityClass={eligibilityClass}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              licenseReminder={licenseReminder}
              matchingPolicies={matchingPolicies}
              nextService={nextService}
              seasonalReminder={seasonalReminder}
              serviceEligibility={serviceEligibility}
              vehicle={vehicle}
              warranty={warranty}
            />
          ) : null}
          {activeMenu === "service_request" ? (
            <DriverServiceRequestSection
              assignedVehicle={vehicle}
              driverServiceRequests={driverServiceRequests}
              eligibilityClass={eligibilityClass}
              formatDateTime={formatDateTime}
              handleSubmitSimpleRequest={handleSubmitSimpleRequest}
              nearestPosOptions={nearestPosOptions}
              onPhotoChange={onPhotoChange}
              lastRecordedOdometer={lastRecordedOdometer}
              odometerError={odometerError}
              policyValidation={policyValidation}
              requestForm={requestForm}
              requestStatusClass={requestStatusClass}
              selectedPos={selectedPos}
              selectedRequest={selectedRequest}
              selectedSlot={selectedSlot}
              isServiceRequestFormReady={isServiceRequestFormReady}
              isSubmittingRequest={isSubmittingRequest}
              setRequestForm={setRequestForm}
              setSelectedRequestId={setSelectedRequestId}
              slotAvailability={slotAvailability}
              simpleIssueOptions={simpleIssueOptions}
              odometerRecommendation={odometerRecommendation}
              tyreWaitlistNotice={tyreWaitlistNotice}
              onCloseTyreWaitlistNotice={() => setTyreWaitlistNotice(null)}
              wizardFeedback={wizardFeedback}
            />
          ) : null}
          {activeMenu === "documents_history" ? (
            <DriverDocumentsHistorySection
              documentsHistoryRows={documentsHistoryRows}
              formatDateTime={formatDateTime}
              handleDownloadServiceDetails={handleDownloadServiceDetails}
              selectedDocument={selectedDocument}
              setSelectedDocumentId={setSelectedDocumentId}
              tyreReplacementHistory={tyreReplacementHistory}
            />
          ) : null}
          {activeMenu === "communication" ? (
            <DriverCommunicationSection
              activeCommunicationContact={activeCommunicationContact}
              activeCommunicationDetails={activeCommunicationDetails}
              activeCommunicationMessages={activeCommunicationMessages}
              communicationDraft={communicationDraft}
              communicationNotice={communicationNotice}
              formatDateTime={formatDateTime}
              handleCallContact={handleCallContact}
              handleQuickMessage={handleQuickMessage}
              handleSendCommunicationMessage={handleSendCommunicationMessage}
              handleSupportRequestSubmit={handleSupportRequestSubmit}
              communicationContacts={communicationContacts}
              setActiveCommunicationContact={setActiveCommunicationContact}
              setCommunicationDraft={setCommunicationDraft}
              setSupportRequest={setSupportRequest}
              supportMessages={supportMessages}
              supportRequest={supportRequest}
              supportTopicOptions={supportTopicOptions}
            />
          ) : null}
          {activeMenu === "booking_tracking" ? (
            <DriverBookingTrackingPanel
              displayName={displayName}
              nextServiceDate={nextService.date}
              orders={serviceOrderState.orders}
              vehicle={vehicle}
            />
          ) : null}
          {activeMenu === "profile" ? (
            <DriverProfileSection
              attachedVehicle={vehicle}
              handleProfileReset={handleProfileReset}
              handleProfileSave={handleProfileSave}
              licenseReminder={licenseReminder}
              profileForm={profileForm}
              profileInitials={profileInitials}
              profileNotice={profileNotice}
              setProfileForm={setProfileForm}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default DriverDashboard;
