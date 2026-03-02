import { useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, LogOut, ShieldCheck, Truck, Wrench } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Logo from "../icons/Logo";
import {
  clearSession,
  getSession,
  subscribeSession,
} from "../auth/session";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  getDriverState,
  subscribeDrivers,
} from "../data/driverStore";
import {
  getVehicleState,
  subscribeVehicles,
} from "../data/vehicleStore";
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
  setOrderLifecycleStage,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import DriverBookingTrackingPanel from "../components/DriverBookingTrackingPanel";

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseCost = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

const getWarrantyStatus = (expiryDate) => {
  const expiry = toDate(expiryDate);
  if (!expiry) {
    return "Unknown";
  }
  const today = new Date();
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    return "bg-emerald-100 text-emerald-700";
  }
  if (value === "Approval Required") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

const problemTypeOptions = [
  "Engine diagnostics",
  "Tyre damage",
  "Brake issue",
  "Battery / electrical",
  "Accident damage",
  "General service",
];

const severityMultipliers = {
  Low: 1,
  Medium: 1.25,
  High: 1.55,
  Critical: 1.9,
};

const baseCostByProblem = {
  "Engine diagnostics": 680,
  "Tyre damage": 520,
  "Brake issue": 740,
  "Battery / electrical": 460,
  "Accident damage": 980,
  "General service": 390,
};

const driverSpendFallback = [
  { spend: 420, checks: 1 },
  { spend: 520, checks: 2 },
  { spend: 610, checks: 2 },
  { spend: 560, checks: 2 },
  { spend: 700, checks: 3 },
  { spend: 640, checks: 2 },
  { spend: 760, checks: 3 },
  { spend: 810, checks: 3 },
  { spend: 780, checks: 3 },
  { spend: 860, checks: 4 },
  { spend: 840, checks: 3 },
  { spend: 910, checks: 4 },
];

function DriverDashboard() {
  const navigate = useNavigate();
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState
  );
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );

  const driverRecord = useMemo(() => {
    const byId = driverState.drivers.find((driver) => driver.id === session?.driverId);
    if (byId) {
      return byId;
    }
    const byEmail = driverState.drivers.find(
      (driver) =>
        String(driver.email || "").toLowerCase() ===
        String(session?.email || "").toLowerCase()
    );
    if (byEmail) {
      return byEmail;
    }
    const byName = driverState.drivers.find(
      (driver) =>
        String(driver.name || "").toLowerCase() ===
        String(session?.driverName || session?.name || "").toLowerCase()
    );
    return byName || null;
  }, [driverState.drivers, session?.driverId, session?.driverName, session?.email, session?.name]);

  const tenant = useMemo(() => {
    const bySession = opsState.tenants.find((item) => item.id === session?.tenantId);
    if (bySession) {
      return bySession;
    }
    const byAssignment = opsState.tenantAssignments.find(
      (item) =>
        String(item.driverName || "").toLowerCase() ===
        String(driverRecord?.name || session?.driverName || session?.name || "").toLowerCase()
    );
    if (byAssignment) {
      return opsState.tenants.find((item) => item.id === byAssignment.tenantId) || null;
    }
    return opsState.tenants[0] || null;
  }, [driverRecord?.name, opsState.tenantAssignments, opsState.tenants, session?.driverName, session?.name, session?.tenantId]);

  const assignedVehicleId =
    driverRecord?.assignedVehicleId ||
    session?.assignedVehicleId ||
    (String(session?.driverName || session?.name || "").toLowerCase().includes("jamie")
      ? "VH-884"
      : String(session?.driverName || session?.name || "").toLowerCase().includes("avery")
      ? "VH-241"
      : "");

  const vehicle = useMemo(() => {
    const fromStore = vehicleState.vehicles.find((item) => item.id === assignedVehicleId);
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
      .sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0))[0];

    const lastDate = latest?.parsedDate || new Date();
    const dueDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseKm = 120000 + ((Number(String(vehicle.id || "").replace(/\D/g, "")) || 0) % 5000);
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
      (policy) => String(policy.status || "").toLowerCase() === "active"
    );
    return active.filter((policy) =>
      policyMatchesVehicle(policy, vehicle, tenant?.name || "")
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
        serviceType.includes(String(item || "").toLowerCase())
      );

    if (!typeAllowed) {
      return {
        status: "Not Covered",
        note: `Service type is outside policy ${policy.policyCode}.`,
      };
    }

    if (policy.approvalThreshold !== null || policy.servicePriceLimit !== null) {
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
    status: vehicle.warrantyStatus || getWarrantyStatus(vehicle.warrantyExpiryDate),
  };

  const analytics = useMemo(() => {
    const now = new Date();
    const daysToNextService = Math.ceil(
      (new Date(nextService.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const warrantyDaysRemaining = warranty.expiryDate
      ? Math.ceil(
          ((toDate(warranty.expiryDate)?.getTime() || now.getTime()) - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const serviceEligibilityScore =
      serviceEligibility.status === "Allowed"
        ? 92
        : serviceEligibility.status === "Approval Required"
        ? 68
        : 34;

    const months = Array.from({ length: 12 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        spend: 0,
        checks: 0,
      };
    });

    const monthMap = new Map(months.map((item) => [item.key, item]));
    (vehicle.serviceHistory || []).forEach((entry) => {
      const d = toDate(entry.date);
      if (!d) {
        return;
      }
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = monthMap.get(key);
      if (!row) {
        return;
      }
      row.spend += parseCost(entry.cost) || 300;
      row.checks += 1;
    });

    const hasHistory = months.some((month) => month.spend > 0 || month.checks > 0);
    const spendTrend = months.map((month, index) => {
      const baseline = driverSpendFallback[index % driverSpendFallback.length];
      if (!hasHistory) {
        return {
          label: month.label,
          spend: baseline.spend,
          checks: baseline.checks,
        };
      }
      if (month.spend > 0 || month.checks > 0) {
        return {
          label: month.label,
          spend: Math.round(month.spend),
          checks: month.checks,
        };
      }
      return {
        label: month.label,
        spend: Math.round(baseline.spend * 0.45),
        checks: Math.max(1, Math.round(baseline.checks * 0.5)),
      };
    });

    const tyreTarget = 100;
    const frontPsi = Number(vehicle.tyreSpecs?.frontPsi) || tyreTarget;
    const rearPsi = Number(vehicle.tyreSpecs?.rearPsi) || tyreTarget;
    const tyreHealthScore = clamp(
      100 - Math.round((Math.abs(frontPsi - tyreTarget) + Math.abs(rearPsi - tyreTarget)) * 1.8),
      35,
      100
    );

    const warrantyScore =
      warrantyDaysRemaining === null
        ? 50
        : warrantyDaysRemaining < 0
        ? 20
        : warrantyDaysRemaining <= 60
        ? 55
        : 88;

    const serviceReadiness = daysToNextService < 0 ? 35 : daysToNextService <= 10 ? 66 : 90;

    const healthIndex = [
      { name: "Tyre Health", score: tyreHealthScore },
      { name: "Service Eligibility", score: serviceEligibilityScore },
      { name: "Warranty Cover", score: warrantyScore },
      { name: "Service Readiness", score: serviceReadiness },
    ];

    return {
      daysToNextService,
      warrantyDaysRemaining,
      serviceEligibilityScore,
      spendTrend,
      healthIndex,
    };
  }, [
    nextService.date,
    serviceEligibility.status,
    vehicle.serviceHistory,
    vehicle.tyreSpecs?.frontPsi,
    vehicle.tyreSpecs?.rearPsi,
    warranty.expiryDate,
  ]);

  const displayName = driverRecord?.name || session?.driverName || session?.name || "Driver";
  const displayEmail = session?.email || driverRecord?.email || "N/A";
  const profileInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "DR";

  const [activeMenu, setActiveMenu] = useState("overview");
  const [wizardStep, setWizardStep] = useState(1);
  const [requestForm, setRequestForm] = useState({
    problemType: "Engine diagnostics",
    severity: "Medium",
    description: "",
    emergency: false,
    requiresManagerApproval: true,
    fleetManager: "Fleet Manager",
    photos: [],
  });
  const [wizardFeedback, setWizardFeedback] = useState("");

  const estimatedCost = useMemo(() => {
    const baseCost = baseCostByProblem[requestForm.problemType] || 420;
    const severityMultiplier = severityMultipliers[requestForm.severity] || 1;
    const emergencySurcharge = requestForm.emergency ? 250 : 0;
    const labour = Math.round(baseCost * 0.42);
    const parts = Math.round(baseCost * severityMultiplier);
    const total = parts + labour + emergencySurcharge;
    return {
      baseCost,
      parts,
      labour,
      emergencySurcharge,
      total,
    };
  }, [requestForm.emergency, requestForm.problemType, requestForm.severity]);

  const policyValidation = useMemo(() => {
    if (matchingPolicies.length === 0) {
      return {
        status: "Not Covered",
        note: "No matching active policy found for this vehicle.",
      };
    }

    const policy = matchingPolicies[0];
    const allowedTypes = Array.isArray(policy.allowedServiceTypes)
      ? policy.allowedServiceTypes.map((item) => String(item || "").toLowerCase())
      : [];
    const requestedType = String(requestForm.problemType || "").toLowerCase();
    const typeAllowed =
      allowedTypes.length === 0 ||
      allowedTypes.some(
        (allowed) => requestedType.includes(allowed) || allowed.includes(requestedType)
      );

    if (!typeAllowed) {
      return {
        status: "Not Covered",
        note: `Problem type is outside policy ${policy.policyCode}.`,
      };
    }

    const serviceLimit = policy.servicePriceLimit ?? null;
    const requiresApprovalByLimit =
      serviceLimit !== null && Number(estimatedCost.total) > Number(serviceLimit);
    const requiresApprovalByPolicy = policy.approvalThreshold !== null;
    const requiresApproval =
      requestForm.requiresManagerApproval ||
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
    requestForm.requiresManagerApproval,
  ]);

  const posBookingUrl = useMemo(() => {
    const params = new URLSearchParams({
      vehicle: vehicle.id || "N/A",
      problem: requestForm.problemType,
      amount: String(estimatedCost.total),
      driver: displayName,
      tenant: tenant?.name || "N/A",
    });
    return `https://pos.oxifleet.com/book?${params.toString()}`;
  }, [displayName, estimatedCost.total, requestForm.problemType, tenant?.name, vehicle.id]);

  const canProceedToBooking = policyValidation.status !== "Not Covered";

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

  const handleWizardNext = () => {
    setWizardStep((prev) => Math.min(4, prev + 1));
  };

  const handleWizardBack = () => {
    setWizardStep((prev) => Math.max(1, prev - 1));
  };

  const createDriverServiceRequest = ({ emergency = false, approval = true } = {}) => {
    const order = createServiceRequest({
      vehicleId: vehicle.id || "N/A",
      vehicleModel: vehicle.model || "Assigned Fleet Vehicle",
      serviceType: requestForm.problemType,
      requestTitle: `${requestForm.problemType} request`,
      requestedBy: displayName,
      priority: emergency ? "Emergency" : requestForm.severity,
      emergency,
      status: approval ? "Pending approval" : "Pending booking",
      orderDetails: {
        description:
          requestForm.description || `${requestForm.problemType} reported by driver.`,
        vendor: tenant?.workshopLead || "Unassigned",
        estimatedCost: `$${estimatedCost.total}`,
        location: tenant?.region || "N/A",
        notes: [
          `Tenant: ${tenant?.name || "N/A"}`,
          `Photos: ${requestForm.photos.map((file) => file.name).join(", ") || "None"}`,
          approval
            ? `Approval requested from ${requestForm.fleetManager || "Fleet Manager"}`
            : "Direct booking requested",
        ].join(" | "),
      },
    });
    return order;
  };

  const handlePosRedirect = () => {
    if (!canProceedToBooking) {
      setWizardFeedback("Policy validation failed. Booking is blocked.");
      return;
    }
    if (typeof window !== "undefined") {
      window.open(posBookingUrl, "_blank", "noopener,noreferrer");
    }
    setWizardFeedback("Redirecting to POS booking.");
  };

  const handleRequestApproval = () => {
    createDriverServiceRequest({ emergency: requestForm.emergency, approval: true });
    setWizardFeedback("Approval request submitted to fleet manager.");
  };

  const handleEmergencyBreakdown = () => {
    createDriverServiceRequest({ emergency: true, approval: true });
    setWizardFeedback("Emergency breakdown request submitted.");
  };

  const handleConfirmServiceCompletion = (orderId) => {
    const updated = setOrderLifecycleStage(orderId, {
      stage: "Completed",
      actor: displayName,
      note: "Service completion confirmed by driver.",
    });

    if (!updated) {
      return;
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full">
        <aside className="fixed inset-y-0 left-0 w-72">
          <div className="flex h-full flex-col bg-[#0D0F16] p-6 text-white shadow-xl">
            <div className="space-y-8">
              <Logo className="w-48 text-white" />

              <nav className="space-y-2 text-sm">
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                    activeMenu === "overview"
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 transition hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setActiveMenu("overview")}
                  type="button"
                >
                  <Truck size={18} />
                  Dashboard
                </button>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                    activeMenu === "service_request"
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 transition hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setActiveMenu("service_request")}
                  type="button"
                >
                  <Wrench size={18} />
                  Service Request
                </button>
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                    activeMenu === "booking_tracking"
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 transition hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setActiveMenu("booking_tracking")}
                  type="button"
                >
                  <CalendarClock size={18} />
                  Booking & Tracking
                </button>
              </nav>
            </div>

            <div className="mt-auto space-y-2">
              <Button
                className="w-full justify-start"
                onClick={onSignOut}
                type="button"
                variant="secondary"
              >
                <LogOut className="mr-2" size={16} />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <section className="ml-72 flex-1 space-y-6 overflow-y-auto p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Driver dashboard
                </p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Welcome
                  {displayName ? `, ${displayName}` : " John Doe"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Vehicle and policy visibility for your assigned operations.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <div className="grid size-9 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white">
                  {profileInitials}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500">{displayEmail}</p>
                  {/* <p className="text-xs text-slate-500">
                    Tenant: {tenant?.name || session?.tenantId || "N/A"}
                  </p> */}
                </div>
              </div>
            </div>
          </header>

          {activeMenu === "overview" ? (
            <>
              <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">
                      Days to next service
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {analytics.daysToNextService}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">
                      Warranty days remaining
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {analytics.warrantyDaysRemaining ?? "N/A"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Eligibility score</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {analytics.serviceEligibilityScore}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Policies mapped</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {matchingPolicies.length}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Service spend trend (6 months)
                    </h2>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.spendTrend}>
                          <defs>
                            <linearGradient
                              id="driverSpendGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#0f172a"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="#0f172a"
                                stopOpacity={0.03}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis dataKey="label" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip
                            formatter={(value, name) =>
                              name === "spend"
                                ? [`$${value}`, "Spend"]
                                : [value, "Checks"]
                            }
                            labelStyle={{ color: "#0f172a" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="spend"
                            stroke="#0f172a"
                            fillOpacity={1}
                            fill="url(#driverSpendGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Vehicle health index
                    </h2>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.healthIndex}
                          layout="vertical"
                          margin={{ left: 30 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            stroke="#64748b"
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#64748b"
                            width={110}
                          />
                          <Tooltip
                            formatter={(value) => [`${value}%`, "Score"]}
                          />
                          <Bar
                            dataKey="score"
                            fill="#0f172a"
                            radius={[4, 4, 4, 4]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Truck size={18} />
                    Assigned vehicle details
                  </h2>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-semibold text-slate-900">
                      {vehicle.id} - {vehicle.model}
                    </p>
                    <p className="text-slate-600">
                      Plate: {vehicle.plate || "N/A"}
                    </p>
                    <p className="text-slate-600">
                      Class: {vehicle.type || "N/A"}
                    </p>
                    <p className="text-slate-600">
                      Status: {vehicle.status || "Active"}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <ShieldCheck size={18} />
                    Service eligibility status
                  </h2>
                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${eligibilityClass(
                        serviceEligibility.status,
                      )}`}
                    >
                      {serviceEligibility.status}
                    </span>
                    <p className="mt-3 text-sm text-slate-600">
                      {serviceEligibility.note}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Next service due (date / km)
                  </h2>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-slate-700">
                      Service type:{" "}
                      <span className="font-semibold">
                        {nextService.serviceType}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Due date:{" "}
                      <span className="font-semibold">
                        {formatDate(nextService.date)}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Due odometer:{" "}
                      <span className="font-semibold">
                        {nextService.km.toLocaleString()} km
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Seasonal tyre change reminder
                  </h2>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="font-semibold text-slate-900">
                      {seasonalReminder.title}
                    </p>
                    <p className="text-slate-700">
                      Reminder date: {formatDate(seasonalReminder.dueDate)}
                    </p>
                    <p className="text-slate-600">{seasonalReminder.note}</p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Vehicle tyre specifications
                  </h2>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <p>
                      Brand:{" "}
                      <span className="font-semibold">
                        {vehicle.tyreSpecs?.brand || "N/A"}
                      </span>
                    </p>
                    <p>
                      Size:{" "}
                      <span className="font-semibold">
                        {vehicle.tyreSpecs?.size || "N/A"}
                      </span>
                    </p>
                    <p>
                      Front PSI:{" "}
                      <span className="font-semibold">
                        {vehicle.tyreSpecs?.frontPsi ?? "N/A"}
                      </span>
                    </p>
                    <p>
                      Rear PSI:{" "}
                      <span className="font-semibold">
                        {vehicle.tyreSpecs?.rearPsi ?? "N/A"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Warranty information
                  </h2>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <p>
                      Provider:{" "}
                      <span className="font-semibold">{warranty.provider}</span>
                    </p>
                    <p>
                      Expiry date:{" "}
                      <span className="font-semibold">
                        {formatDate(warranty.expiryDate)}
                      </span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className="font-semibold">{warranty.status}</span>
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeMenu === "service_request" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  Guided service request wizard
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Complete each step to validate policy, estimate cost, and book
                  with approval workflow.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  {[
                    "Problem type",
                    "Upload photos",
                    "Estimate & policy",
                    "Booking & approval",
                  ].map((label, index) => {
                    const stepNumber = index + 1;
                    const isActive = wizardStep === stepNumber;
                    const isDone = wizardStep > stepNumber;
                    return (
                      <button
                        key={label}
                        className={`rounded-xl border px-3 py-2 text-left text-xs ${
                          isActive
                            ? "border-slate-400 bg-slate-100 font-semibold text-slate-900"
                            : isDone
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-500"
                        }`}
                        onClick={() => setWizardStep(stepNumber)}
                        type="button"
                      >
                        {stepNumber}. {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {wizardStep === 1 ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Select problem type
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Problem type</Label>
                      <Select
                        onValueChange={(value) =>
                          setRequestForm((prev) => ({
                            ...prev,
                            problemType: value,
                          }))
                        }
                        value={requestForm.problemType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Problem type" />
                        </SelectTrigger>
                        <SelectContent>
                          {problemTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Severity</Label>
                      <Select
                        onValueChange={(value) =>
                          setRequestForm((prev) => ({
                            ...prev,
                            severity: value,
                          }))
                        }
                        value={requestForm.severity}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <Label>Problem description</Label>
                    <Textarea
                      onChange={(event) =>
                        setRequestForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Describe the issue in detail"
                      rows={4}
                      value={requestForm.description}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
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
                    Emergency breakdown request
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Upload vehicle/tyre photos
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Attach clear images of damage, tyres, and dashboard alerts.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Input
                      accept="image/*"
                      multiple
                      onChange={onPhotoChange}
                      type="file"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      {requestForm.photos.length === 0 ? (
                        <p className="text-slate-500">
                          No photos uploaded yet.
                        </p>
                      ) : (
                        <div className="space-y-1 text-slate-700">
                          {requestForm.photos.map((file) => (
                            <p key={file.name}>
                              {file.name} (
                              {Math.max(1, Math.round(file.size / 1024))} KB)
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Service cost estimation
                    </h3>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p>
                        Base cost:{" "}
                        <span className="font-semibold">
                          ${estimatedCost.baseCost}
                        </span>
                      </p>
                      <p>
                        Parts estimate:{" "}
                        <span className="font-semibold">
                          ${estimatedCost.parts}
                        </span>
                      </p>
                      <p>
                        Labour estimate:{" "}
                        <span className="font-semibold">
                          ${estimatedCost.labour}
                        </span>
                      </p>
                      <p>
                        Emergency surcharge:{" "}
                        <span className="font-semibold">
                          ${estimatedCost.emergencySurcharge}
                        </span>
                      </p>
                      <p className="pt-2 text-base font-semibold text-slate-900">
                        Total estimated: ${estimatedCost.total}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Policy validation before booking
                    </h3>
                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${eligibilityClass(
                          policyValidation.status,
                        )}`}
                      >
                        {policyValidation.status}
                      </span>
                      <p className="mt-3 text-sm text-slate-600">
                        {policyValidation.note}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 4 ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Booking and approval actions
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          checked={requestForm.requiresManagerApproval}
                          className="size-4 accent-slate-900"
                          onChange={(event) =>
                            setRequestForm((prev) => ({
                              ...prev,
                              requiresManagerApproval: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        Request approval from fleet manager
                      </div>
                      <Input
                        onChange={(event) =>
                          setRequestForm((prev) => ({
                            ...prev,
                            fleetManager: event.target.value,
                          }))
                        }
                        placeholder="Fleet manager"
                        value={requestForm.fleetManager}
                      />
                    </div>
                    <Button
                      onClick={handlePosRedirect}
                      type="button"
                      variant="outline"
                    >
                      Redirect to POS booking
                    </Button>
                    <Button onClick={handleRequestApproval} type="button">
                      Submit request for fleet manager approval
                    </Button>
                    <Button
                      onClick={handleEmergencyBreakdown}
                      type="button"
                      variant="destructive"
                    >
                      Emergency breakdown request
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={wizardStep === 1}
                  onClick={handleWizardBack}
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={wizardStep === 4}
                  onClick={handleWizardNext}
                  type="button"
                >
                  Next
                </Button>
              </div>

              {wizardFeedback ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  {wizardFeedback}
                </div>
              ) : null}
            </section>
          ) : null}

          {activeMenu === "booking_tracking" ? (
            <DriverBookingTrackingPanel
              displayName={displayName}
              nextServiceDate={nextService.date}
              onConfirmCompletion={handleConfirmServiceCompletion}
              orders={serviceOrderState.orders}
              vehicle={vehicle}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default DriverDashboard;
