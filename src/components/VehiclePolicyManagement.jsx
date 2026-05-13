import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  getVehiclePolicyState,
  replaceVehiclePolicies,
  subscribeVehiclePolicies,
} from "../data/vehiclePolicyStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  createFleetVehiclePolicyApi,
  listFleetVehiclePoliciesApi,
  updateFleetVehiclePolicyApi,
} from "../services/fleetVehiclePolicyApi";

const todayIso = () => new Date().toISOString().slice(0, 10);

const SERVICE_TYPE_OPTIONS = [
  "Oil change",
  "Brake service",
  "Tyre rotation",
  "Engine diagnostics",
  "Battery / electrical",
  "Alignment",
  "General service",
  "Emergency breakdown",
];

const TYRE_BRAND_OPTIONS = [
  "Hankook",
  "Nokian",
  "Falken",
  "Dunlop",
  "Bridgestone",
];

const TYRE_CATEGORY_OPTIONS = [
  "Summer",
  "Winter",
  "All-season",
  "Highway",
  "Performance",
];

const OEM_OPTIONS = [
  "Hankook",
  "Nokian",
  "Falken",
  "Dunlop",
  "Bridgestone",
];

const toCurrencyEuro = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(parsed);
};

const normalizePolicyStatusLabel = (t, status) => {
  if (status === "Active") {
    return t("fleet.vehicleManagement.status.active", "Active");
  }
  if (status === "Draft") {
    return t("fleet.policyManagement.statusDraft", "Draft");
  }
  if (status === "Retired") {
    return t("fleet.policyManagement.statusRetired", "Retired");
  }
  return status;
};

const toScopeLabel = (t, policy) => {
  const scope = policy.appliesTo || {};
  const parts = [];
  if (scope.fleet) {
    parts.push(`${t("fleet.policyManagement.scopeFleet", "Fleet")}: ${scope.fleet}`);
  }
  if (scope.vehicleGroup) {
    parts.push(`${t("fleet.policyManagement.scopeGroup", "Group")}: ${scope.vehicleGroup}`);
  }
  if (scope.vehicleClass) {
    parts.push(`${t("fleet.policyManagement.scopeClass", "Class")}: ${scope.vehicleClass}`);
  }
  if (scope.vehicleId) {
    parts.push(`${t("fleet.policyManagement.scopeVehicle", "Vehicle")}: ${scope.vehicleId}`);
  }
  return parts.length > 0
    ? parts.join(" | ")
    : t("fleet.policyManagement.unscoped", "Unscoped");
};

const listDifference = (current, previous) =>
  current.filter((entry) => !previous.includes(entry));

const getPolicyChanges = (current, previous) => {
  if (!previous) {
    return [];
  }
  const changes = [];
  if (current.status !== previous.status) {
    changes.push("status");
  }
  if (current.servicePriceLimit !== previous.servicePriceLimit) {
    changes.push("service limit");
  }
  if (current.tyrePriceLimit !== previous.tyrePriceLimit) {
    changes.push("tyre limit");
  }
  if (current.approvalThreshold !== previous.approvalThreshold) {
    changes.push("approval threshold");
  }
  if (JSON.stringify(current.appliesTo || {}) !== JSON.stringify(previous.appliesTo || {})) {
    changes.push("scope");
  }
  if (listDifference(current.allowedServiceTypes, previous.allowedServiceTypes).length > 0) {
    changes.push("service types");
  }
  if (listDifference(current.allowedTyreBrands, previous.allowedTyreBrands).length > 0) {
    changes.push("tyre brands");
  }
  if (
    listDifference(current.allowedTyreCategories, previous.allowedTyreCategories).length > 0
  ) {
    changes.push("tyre categories");
  }
  return changes;
};

const statusClassName = (status) => {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Draft") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Retired") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-slate-100 text-slate-700";
};

const translatePolicyServiceType = (t, value) => {
  const labels = {
    "Oil change": t("fleet.policyManagement.serviceTypeOilChange", "Oil change"),
    "Brake service": t("fleet.policyManagement.serviceTypeBrakeService", "Brake service"),
    "Tyre rotation": t("fleet.policyManagement.serviceTypeTyreRotation", "Tyre rotation"),
    "Engine diagnostics": t(
      "fleet.policyManagement.serviceTypeEngineDiagnostics",
      "Engine diagnostics",
    ),
    "Battery / electrical": t(
      "fleet.policyManagement.serviceTypeBatteryElectrical",
      "Battery / electrical",
    ),
    Alignment: t("fleet.policyManagement.serviceTypeAlignment", "Alignment"),
    "General service": t(
      "fleet.policyManagement.serviceTypeGeneralService",
      "General service",
    ),
    "Emergency breakdown": t(
      "fleet.policyManagement.serviceTypeEmergencyBreakdown",
      "Emergency breakdown",
    ),
  };
  return labels[value] || value;
};

const translateTyreBrand = (t, value) => {
  const labels = {
    Hankook: t("fleet.policyManagement.brandHankook", "Hankook"),
    Nokian: t("fleet.policyManagement.brandNokian", "Nokian"),
    Falken: t("fleet.policyManagement.brandFalken", "Falken"),
    Dunlop: t("fleet.policyManagement.brandDunlop", "Dunlop"),
    Bridgestone: t("fleet.policyManagement.brandBridgestone", "Bridgestone"),
  };
  return labels[value] || value;
};

const translateTyreCategory = (t, value) => {
  const labels = {
    Summer: t("fleet.policyManagement.categorySummer", "Summer"),
    Winter: t("fleet.policyManagement.categoryWinter", "Winter"),
    "All-season": t("fleet.policyManagement.categoryAllSeason", "All-season"),
    Highway: t("fleet.policyManagement.categoryHighway", "Highway"),
    Performance: t("fleet.policyManagement.categoryPerformance", "Performance"),
  };
  return labels[value] || value;
};

const translateNetworkMode = (t, value) => {
  const labels = {
    "point-s-only": t("fleet.policyManagement.networkPointSOnly", "Point S only"),
    "preferred-network": t(
      "fleet.policyManagement.networkPreferredNetwork",
      "Preferred network",
    ),
    "any-approved-provider": t(
      "fleet.policyManagement.networkAnyApprovedProvider",
      "Any approved provider",
    ),
    "preferred-oem-and-point-s": t(
      "fleet.policyManagement.networkPreferredOemAndPointS",
      "Preferred OEM and Point S",
    ),
    "approved-network-only": t(
      "fleet.policyManagement.networkApprovedOnly",
      "Approved network only",
    ),
    "open-network": t("fleet.policyManagement.networkOpen", "Open network"),
  };
  return labels[value] || value;
};

const translatePolicyChange = (t, value) => {
  const labels = {
    status: t("fleet.policyManagement.changeStatus", "Status"),
    "service limit": t("fleet.policyManagement.changeServiceLimit", "Service limit"),
    "tyre limit": t("fleet.policyManagement.changeTyreLimit", "Tyre limit"),
    "approval threshold": t(
      "fleet.policyManagement.changeApprovalThreshold",
      "Approval threshold",
    ),
    scope: t("fleet.policyManagement.changeScope", "Scope"),
    "service types": t("fleet.policyManagement.changeServiceTypes", "Service types"),
    "tyre brands": t("fleet.policyManagement.changeTyreBrands", "Tyre brands"),
    "tyre categories": t(
      "fleet.policyManagement.changeTyreCategories",
      "Tyre categories",
    ),
  };
  return labels[value] || value;
};

function VehiclePolicyManagement({ vehicles }) {
  const { t } = useTranslation();
  const formRef = useRef(null);
  const policyInitRef = useRef(false);
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState
  );

  const [policySearch, setPolicySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyCode, setHistoryCode] = useState("all");
  const [form, setForm] = useState({
    name: "",
    policyCode: "",
    status: "Active",
    fleet: "",
    vehicleGroup: "",
    vehicleClass: "",
    vehicleId: "all",
    allowedServiceTypes: [],
    allowedTyreBrands: [],
    allowedTyreCategories: [],
    servicePriceLimit: "",
    tyrePriceLimit: "",
    approvalThreshold: "",
    seasonalTyreRules: "",
    specialCaseExceptions: "",
    emergencyBreakdownRule: {
      enabled: true,
      approvalMode: "auto-allow",
      maxDistanceKm: "",
      allowedPOSNetwork: "point-s-only",
      costLimitEur: "",
      afterHoursAllowed: false,
      replacementVehicleAllowed: false,
      dispatchGuidance: "",
    },
    serviceNetworkRule: {
      networkMode: "point-s-only",
      preferredOEMs: [],
      preferredPOSLocations: "",
      excludedProviders: "",
      crossBorderAllowed: false,
      mobileServiceAllowed: false,
      nearestStationAutoAssign: true,
      outOfNetworkApprovalRequired: true,
    },
    changeNote: "",
    effectiveFrom: todayIso(),
  });

  const [policyApiLoading, setPolicyApiLoading] = useState(false);
  const [policyApiSaving, setPolicyApiSaving] = useState(false);
  const [policyApiError, setPolicyApiError] = useState("");

  const syncPoliciesFromBackend = async () => {
    const rows = await listFleetVehiclePoliciesApi();
    replaceVehiclePolicies(rows);
    return rows;
  };

  useEffect(() => {
    if (policyInitRef.current) return;
    policyInitRef.current = true;

    let ignore = false;

    const run = async () => {
      setPolicyApiLoading(true);
      setPolicyApiError("");
      try {
        const rows = await listFleetVehiclePoliciesApi();
        if (ignore) return;
        replaceVehiclePolicies(rows);
      } catch (error) {
        if (ignore) return;
        setPolicyApiError(error?.message || "Unable to load vehicle policies from backend.");
      } finally {
        setPolicyApiLoading(false);
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, []);
  const allPolicies = useMemo(() => {
    return [...policyState.policies].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [policyState.policies]);

  const vehicleClasses = useMemo(() => {
    const classes = new Set(
      vehicles.map((vehicle) => String(vehicle.type || "").trim()).filter(Boolean)
    );
    return Array.from(classes).sort();
  }, [vehicles]);

  const policyCodes = useMemo(() => {
    const codes = new Set(allPolicies.map((policy) => policy.policyCode));
    return Array.from(codes).sort();
  }, [allPolicies]);

  const latestPoliciesByCode = useMemo(() => {
    const map = new Map();
    allPolicies.forEach((policy) => {
      const current = map.get(policy.policyCode);
      if (!current || Number(policy.version) > Number(current.version)) {
        map.set(policy.policyCode, policy);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.policyCode.localeCompare(b.policyCode)
    );
  }, [allPolicies]);

  const previousPoliciesById = useMemo(() => {
    const map = new Map();
    allPolicies.forEach((policy) => {
      const previous = allPolicies
        .filter(
          (entry) =>
            entry.policyCode === policy.policyCode &&
            Number(entry.version) < Number(policy.version),
        )
        .sort((left, right) => Number(right.version) - Number(left.version))[0];
      map.set(policy.id, previous || null);
    });
    return map;
  }, [allPolicies]);

  const activePolicies = useMemo(
    () => latestPoliciesByCode.filter((policy) => policy.status === "Active"),
    [latestPoliciesByCode],
  );

  const filteredLatestPolicies = useMemo(() => {
    return latestPoliciesByCode.filter((policy) => {
      if (statusFilter !== "all" && policy.status !== statusFilter) {
        return false;
      }
      if (!policySearch.trim()) {
        return true;
      }
      const scopeLabel = toScopeLabel(t, policy);
      const blob = [
        policy.name,
        policy.policyCode,
        policy.status,
        scopeLabel,
        policy.allowedServiceTypes.join(" "),
        policy.allowedTyreBrands.join(" "),
        policy.allowedTyreCategories.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(policySearch.trim().toLowerCase());
    });
  }, [latestPoliciesByCode, policySearch, statusFilter, t]);

  const classWisePolicies = useMemo(() => {
    const map = new Map();
    latestPoliciesByCode.forEach((policy) => {
      const className = policy.appliesTo?.vehicleClass;
      if (!className) {
        return;
      }
      const entry = map.get(className) || [];
      entry.push(policy);
      map.set(className, entry);
    });

    return Array.from(map.entries())
      .map(([className, policies]) => ({
        className,
        policies,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [latestPoliciesByCode]);

  const selectedHistory = useMemo(() => {
    if (historyCode === "all") {
      return allPolicies;
    }
    return allPolicies.filter((policy) => policy.policyCode === historyCode);
  }, [allPolicies, historyCode]);

  const toggleMultiSelectValue = (field, option) => {
    setForm((prev) => {
      const currentValues = Array.isArray(prev[field]) ? prev[field] : [];
      const nextValues = currentValues.includes(option)
        ? currentValues.filter((entry) => entry !== option)
        : [...currentValues, option];
      return {
        ...prev,
        [field]: nextValues,
      };
    });
  };

  const setNestedRuleField = (group, field, value) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const affectedVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      if (form.vehicleId !== "all" && vehicle.id !== form.vehicleId) {
        return false;
      }
      if (form.vehicleClass && vehicle.type !== form.vehicleClass) {
        return false;
      }
      if (
        form.vehicleGroup &&
        ![
          vehicle.model,
          vehicle.variant,
          vehicle.notes,
          vehicle.type,
          vehicle.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(form.vehicleGroup.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [form.vehicleClass, form.vehicleGroup, form.vehicleId, vehicles]);

  const affectedClassSummary = useMemo(() => {
    const counts = affectedVehicles.reduce((acc, vehicle) => {
      const key = vehicle.type || vehicle.category || "Vehicle";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count);
  }, [affectedVehicles]);

  const approvalTriggers = useMemo(() => {
    const items = [];
    if (form.approvalThreshold) {
      items.push(`${t("fleet.policyManagement.approvalThreshold", "Approval threshold")}: ${form.approvalThreshold}%`);
    }
    if (form.emergencyBreakdownRule.enabled) {
      items.push(t("fleet.policyManagement.emergencyBreakdownRule", "Emergency breakdown rule"));
    }
    if (form.serviceNetworkRule.outOfNetworkApprovalRequired) {
      items.push(t("fleet.policyManagement.outOfNetworkApprovalRequired", "Out-of-network approval required"));
    }
    if (form.allowedTyreBrands.length > 0) {
      items.push(t("fleet.policyManagement.nonApprovedTyreBrands", "Non-approved tyre brands"));
    }
    if (form.allowedTyreCategories.includes("Winter")) {
      items.push(t("fleet.policyManagement.seasonalPolicyControl", "Seasonal tyre policy control"));
    }
    if (String(form.specialCaseExceptions || "").trim()) {
      items.push(t("fleet.policyManagement.specialCaseExceptions", "Special case exceptions"));
    }
    return items;
  }, [
    form.allowedTyreBrands,
    form.allowedTyreCategories,
    form.approvalThreshold,
    form.specialCaseExceptions,
    t,
  ]);

  const handleFormField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFormSelect = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreatePolicyVersion = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    setPolicyApiSaving(true);
    setPolicyApiError("");

    try {
      const payload = {
        name: form.name,
        policyCode: form.policyCode,
        version: form.policyCode
          ? (allPolicies
              .filter((entry) => entry.policyCode === form.policyCode)
              .reduce((max, entry) => Math.max(max, Number(entry.version) || 0), 0) + 1)
          : 1,
        status: form.status,
        allowedServiceTypes: form.allowedServiceTypes,
        allowedTyreBrands: form.allowedTyreBrands,
        allowedTyreCategories: form.allowedTyreCategories,
        servicePriceLimit: form.servicePriceLimit,
        tyrePriceLimit: form.tyrePriceLimit,
        approvalThreshold: form.approvalThreshold,
        seasonalTyreRules: form.seasonalTyreRules,
        specialCaseExceptions: form.specialCaseExceptions,
        emergencyBreakdownRule: {
          ...form.emergencyBreakdownRule,
          maxDistanceKm: form.emergencyBreakdownRule.maxDistanceKm,
          costLimitEur: form.emergencyBreakdownRule.costLimitEur,
        },
        serviceNetworkRule: {
          ...form.serviceNetworkRule,
          preferredPOSLocations: form.serviceNetworkRule.preferredPOSLocations,
          excludedProviders: form.serviceNetworkRule.excludedProviders,
        },
        changeNote: form.changeNote,
        effectiveFrom: form.effectiveFrom,
        appliesTo: {
          fleet: form.fleet,
          vehicleGroup: form.vehicleGroup,
          vehicleClass: form.vehicleClass,
          vehicleId: form.vehicleId === "all" ? "" : form.vehicleId,
        },
      };

      const created = await createFleetVehiclePolicyApi(payload);
      await syncPoliciesFromBackend();

      setHistoryCode(created.policyCode);
      setForm((prev) => ({
        ...prev,
        policyCode: created.policyCode,
        changeNote: "",
        effectiveFrom: todayIso(),
      }));
    } catch (error) {
      setPolicyApiError(error?.message || "Unable to save policy version right now.");
    } finally {
      setPolicyApiSaving(false);
    }
  };

    const handlePolicyStatusChange = (policy) => async (value) => {
    if (!policy?.id) return;
    setPolicyApiSaving(true);
    setPolicyApiError("");
    try {
      await updateFleetVehiclePolicyApi(policy.id, {
        ...policy,
        status: value,
      });
      await syncPoliciesFromBackend();
    } catch (error) {
      setPolicyApiError(error?.message || "Unable to update policy status.");
    } finally {
      setPolicyApiSaving(false);
    }
  };
const handleLoadFromPolicy = (policy) => () => {
    setForm({
      name: policy.name,
      policyCode: policy.policyCode,
      status: policy.status,
      fleet: policy.appliesTo?.fleet || "",
      vehicleGroup: policy.appliesTo?.vehicleGroup || "",
      vehicleClass: policy.appliesTo?.vehicleClass || "",
      vehicleId: policy.appliesTo?.vehicleId || "all",
      allowedServiceTypes: policy.allowedServiceTypes,
      allowedTyreBrands: policy.allowedTyreBrands,
      allowedTyreCategories: policy.allowedTyreCategories,
      servicePriceLimit:
        policy.servicePriceLimit === null ? "" : String(policy.servicePriceLimit),
      tyrePriceLimit:
        policy.tyrePriceLimit === null ? "" : String(policy.tyrePriceLimit),
      approvalThreshold:
        policy.approvalThreshold === null ? "" : String(policy.approvalThreshold),
      seasonalTyreRules: policy.seasonalTyreRules || "",
      specialCaseExceptions: policy.specialCaseExceptions || "",
      emergencyBreakdownRule: {
        enabled: Boolean(policy.emergencyBreakdownRule?.enabled),
        approvalMode: policy.emergencyBreakdownRule?.approvalMode || "auto-allow",
        maxDistanceKm:
          policy.emergencyBreakdownRule?.maxDistanceKm === null ||
          policy.emergencyBreakdownRule?.maxDistanceKm === undefined
            ? ""
            : String(policy.emergencyBreakdownRule.maxDistanceKm),
        allowedPOSNetwork:
          policy.emergencyBreakdownRule?.allowedPOSNetwork || "point-s-only",
        costLimitEur:
          policy.emergencyBreakdownRule?.costLimitEur === null ||
          policy.emergencyBreakdownRule?.costLimitEur === undefined
            ? ""
            : String(policy.emergencyBreakdownRule.costLimitEur),
        afterHoursAllowed: Boolean(policy.emergencyBreakdownRule?.afterHoursAllowed),
        replacementVehicleAllowed: Boolean(
          policy.emergencyBreakdownRule?.replacementVehicleAllowed,
        ),
        dispatchGuidance: policy.emergencyBreakdownRule?.dispatchGuidance || "",
      },
      serviceNetworkRule: {
        networkMode: policy.serviceNetworkRule?.networkMode || "point-s-only",
        preferredOEMs: policy.serviceNetworkRule?.preferredOEMs || [],
        preferredPOSLocations: (policy.serviceNetworkRule?.preferredPOSLocations || []).join(", "),
        excludedProviders: (policy.serviceNetworkRule?.excludedProviders || []).join(", "),
        crossBorderAllowed: Boolean(policy.serviceNetworkRule?.crossBorderAllowed),
        mobileServiceAllowed: Boolean(policy.serviceNetworkRule?.mobileServiceAllowed),
        nearestStationAutoAssign: Boolean(
          policy.serviceNetworkRule?.nearestStationAutoAssign,
        ),
        outOfNetworkApprovalRequired: Boolean(
          policy.serviceNetworkRule?.outOfNetworkApprovalRequired,
        ),
      },
      changeNote: "",
      effectiveFrom: todayIso(),
    });
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="space-y-6">
      {policyApiError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {policyApiError}
        </div>
      ) : null}
      {policyApiLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600">Loading vehicle policy data...</div>
      ) : null}
       <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#1d3148_0%,#0f1b33_45%,#070b14_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
               {t("fleet.policyManagement.headerTitle")}
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/50 sm:text-sm">
              {t("fleet.policyManagement.headerDesc")}
            </p>
          </div>
        </div>
      </header>
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{t("fleet.policyManagement.title")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t("fleet.policyManagement.titleDesc")}
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {t("fleet.policyManagement.impactPreview", "Policy impact preview")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {t(
                  "fleet.policyManagement.impactPreviewDesc",
                  "Preview how this policy applies before saving a new version.",
                )}
              </p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("fleet.policyManagement.affectedVehicles", "Affected vehicles")}
              </p>
              <p className="text-xl font-semibold text-slate-900">{affectedVehicles.length}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("fleet.policyManagement.scopePrecedence", "Scope precedence")}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {t(
                  "fleet.policyManagement.scopePrecedenceDesc",
                  "Vehicle-specific overrides class, class overrides group, and group overrides fleet.",
                )}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("fleet.policyManagement.approvalTriggers", "Approval triggers")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(approvalTriggers.length > 0 ? approvalTriggers : [
                  t("fleet.policyManagement.noApprovalEscalation", "No approval escalations configured"),
                ]).map((entry) => (
                  <span
                    key={entry}
                    className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                  >
                    {entry}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("fleet.policyManagement.affectedClasses", "Affected vehicle classes")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(affectedClassSummary.length > 0 ? affectedClassSummary : [
                  { label: t("fleet.policyManagement.none", "None"), count: 0 },
                ]).slice(0, 4).map((entry) => (
                  <span
                    key={entry.label}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {entry.label} · {entry.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <form
          className="mt-5 grid gap-4"
          onSubmit={handleCreatePolicyVersion}
          ref={formRef}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="policy-name">{t("fleet.policyManagement.policyName")}</Label>
              <Input
                id="policy-name"
                onChange={handleFormField("name")}
                placeholder={t("fleet.policyManagement.policyNamePlaceholder")}
                required
                value={form.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policy-code">{t("fleet.policyManagement.policyCode")}</Label>
              <Input
                id="policy-code"
                onChange={handleFormField("policyCode")}
                placeholder={t("fleet.policyManagement.policyCodePlaceholder")}
                value={form.policyCode}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.status")}</Label>
              <Select onValueChange={handleFormSelect("status")} value={form.status}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fleet.policyManagement.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{normalizePolicyStatusLabel(t, "Active")}</SelectItem>
                  <SelectItem value="Draft">{normalizePolicyStatusLabel(t, "Draft")}</SelectItem>
                  <SelectItem value="Retired">{normalizePolicyStatusLabel(t, "Retired")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="policy-fleet">{t("fleet.policyManagement.applyPerFleet")}</Label>
              <Input
                id="policy-fleet"
                onChange={handleFormField("fleet")}
                placeholder={t("fleet.policyManagement.fleetPlaceholder")}
                value={form.fleet}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policy-group">{t("fleet.policyManagement.applyPerVehicleGroup")}</Label>
              <Input
                id="policy-group"
                onChange={handleFormField("vehicleGroup")}
                placeholder={t("fleet.policyManagement.vehicleGroupPlaceholder")}
                value={form.vehicleGroup}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.classWisePolicy")}</Label>
              <Select
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleClass: value === "none" ? "" : value,
                  }))
                }
                value={form.vehicleClass || "none"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fleet.policyManagement.selectClass")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("fleet.policyManagement.noClassScope")}</SelectItem>
                  {vehicleClasses.map((vehicleClass) => (
                    <SelectItem key={vehicleClass} value={vehicleClass}>
                      {vehicleClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.vehicleSpecificPolicy")}</Label>
              <Select onValueChange={handleFormSelect("vehicleId")} value={form.vehicleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fleet.policyManagement.selectVehicle")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("fleet.policyManagement.noVehicleScope")}</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.id} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.allowedServiceTypes")}</Label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {SERVICE_TYPE_OPTIONS.map((option) => {
                  const selected = form.allowedServiceTypes.includes(option);
                  return (
                    <button
                      key={option}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => toggleMultiSelectValue("allowedServiceTypes", option)}
                      type="button"
                    >
                      {translatePolicyServiceType(t, option)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.allowedTyreBrands")}</Label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {TYRE_BRAND_OPTIONS.map((option) => {
                  const selected = form.allowedTyreBrands.includes(option);
                  return (
                    <button
                      key={option}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => toggleMultiSelectValue("allowedTyreBrands", option)}
                      type="button"
                    >
                      {translateTyreBrand(t, option)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("fleet.policyManagement.allowedTyreCategories")}</Label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {TYRE_CATEGORY_OPTIONS.map((option) => {
                  const selected = form.allowedTyreCategories.includes(option);
                  return (
                    <button
                      key={option}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => toggleMultiSelectValue("allowedTyreCategories", option)}
                      type="button"
                    >
                      {translateTyreCategory(t, option)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="service-limit">{t("fleet.policyManagement.servicePriceLimit")}</Label>
              <Input
                id="service-limit"
                onChange={handleFormField("servicePriceLimit")}
                placeholder="1500 EUR"
                type="number"
                value={form.servicePriceLimit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tyre-limit">{t("fleet.policyManagement.tyrePriceLimit")}</Label>
              <Input
                id="tyre-limit"
                onChange={handleFormField("tyrePriceLimit")}
                placeholder="2400 EUR"
                type="number"
                value={form.tyrePriceLimit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-threshold">{t("fleet.policyManagement.approvalThreshold")}</Label>
              <Input
                id="approval-threshold"
                max={100}
                min={0}
                onChange={handleFormField("approvalThreshold")}
                placeholder="85"
                type="number"
                value={form.approvalThreshold}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effective-from">{t("fleet.policyManagement.effectiveFrom")}</Label>
              <Input
                id="effective-from"
                onChange={handleFormField("effectiveFrom")}
                type="date"
                value={form.effectiveFrom}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seasonal-rules">{t("fleet.policyManagement.seasonalTyreRules")}</Label>
              <Textarea
                id="seasonal-rules"
                onChange={handleFormField("seasonalTyreRules")}
                placeholder={t("fleet.policyManagement.seasonalTyreRulesPlaceholder")}
                rows={3}
                value={form.seasonalTyreRules}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="special-exceptions">{t("fleet.policyManagement.specialCaseExceptions")}</Label>
              <Textarea
                id="special-exceptions"
                onChange={handleFormField("specialCaseExceptions")}
                placeholder={t("fleet.policyManagement.specialCaseExceptionsPlaceholder")}
                rows={3}
                value={form.specialCaseExceptions}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("fleet.policyManagement.emergencyBreakdownRule", "Emergency breakdown rule")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("fleet.policyManagement.emergencyBreakdownRuleDesc", "Control approval, dispatch, radius, and replacement handling for emergency breakdown requests.")}
                  </p>
                </div>
                <Select
                  onValueChange={(value) =>
                    setNestedRuleField(
                      "emergencyBreakdownRule",
                      "enabled",
                      value === "true",
                    )
                  }
                  value={String(form.emergencyBreakdownRule.enabled)}
                >
                  <SelectTrigger className="w-[120px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("fleet.policyManagement.enabled", "Enabled")}</SelectItem>
                    <SelectItem value="false">{t("fleet.policyManagement.disabled", "Disabled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.approvalMode", "Approval mode")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setNestedRuleField("emergencyBreakdownRule", "approvalMode", value)
                    }
                    value={form.emergencyBreakdownRule.approvalMode}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto-allow">{t("fleet.policyManagement.autoAllow", "Auto-allow")}</SelectItem>
                      <SelectItem value="fleet-approval-required">{t("fleet.policyManagement.fleetApprovalRequired", "Fleet approval required")}</SelectItem>
                      <SelectItem value="restricted">{t("fleet.policyManagement.restricted", "Restricted")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.allowedPosNetwork", "Allowed POS network")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setNestedRuleField(
                        "emergencyBreakdownRule",
                        "allowedPOSNetwork",
                        value,
                      )
                    }
                    value={form.emergencyBreakdownRule.allowedPOSNetwork}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="point-s-only">{translateNetworkMode(t, "point-s-only")}</SelectItem>
                      <SelectItem value="preferred-network">{translateNetworkMode(t, "preferred-network")}</SelectItem>
                      <SelectItem value="any-approved-provider">{translateNetworkMode(t, "any-approved-provider")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.maxDistanceKm", "Max distance (km)")}</Label>
                  <Input
                    type="number"
                    value={form.emergencyBreakdownRule.maxDistanceKm}
                    onChange={(event) =>
                      setNestedRuleField(
                        "emergencyBreakdownRule",
                        "maxDistanceKm",
                        event.target.value,
                      )
                    }
                    placeholder="75"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.costLimitEur", "Cost limit (EUR)")}</Label>
                  <Input
                    type="number"
                    value={form.emergencyBreakdownRule.costLimitEur}
                    onChange={(event) =>
                      setNestedRuleField(
                        "emergencyBreakdownRule",
                        "costLimitEur",
                        event.target.value,
                      )
                    }
                    placeholder="1200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.afterHoursAllowed", "After-hours allowed")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setNestedRuleField(
                        "emergencyBreakdownRule",
                        "afterHoursAllowed",
                        value === "true",
                      )
                    }
                    value={String(form.emergencyBreakdownRule.afterHoursAllowed)}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("driver.request.yes", "Yes")}</SelectItem>
                      <SelectItem value="false">{t("driver.request.no", "No")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.replacementVehicleAllowed", "Replacement vehicle allowed")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setNestedRuleField(
                        "emergencyBreakdownRule",
                        "replacementVehicleAllowed",
                        value === "true",
                      )
                    }
                    value={String(form.emergencyBreakdownRule.replacementVehicleAllowed)}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("driver.request.yes", "Yes")}</SelectItem>
                      <SelectItem value="false">{t("driver.request.no", "No")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Label>{t("fleet.policyManagement.dispatchGuidance", "Dispatch guidance")}</Label>
                <Textarea
                  rows={3}
                  value={form.emergencyBreakdownRule.dispatchGuidance}
                  onChange={(event) =>
                    setNestedRuleField(
                      "emergencyBreakdownRule",
                      "dispatchGuidance",
                      event.target.value,
                    )
                  }
                  placeholder={t("fleet.policyManagement.dispatchGuidancePlaceholder", "Routing or escalation guidance for breakdown dispatch.")}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {t("fleet.policyManagement.serviceNetworkRule", "Service network rule")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t("fleet.policyManagement.serviceNetworkRuleDesc", "Define where vehicles may be serviced, which OEMs are preferred, and when out-of-network approval is required.")}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.networkMode", "Network mode")}</Label>
                  <Select
                    onValueChange={(value) =>
                      setNestedRuleField("serviceNetworkRule", "networkMode", value)
                    }
                    value={form.serviceNetworkRule.networkMode}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="point-s-only">{translateNetworkMode(t, "point-s-only")}</SelectItem>
                      <SelectItem value="preferred-oem-and-point-s">{translateNetworkMode(t, "preferred-oem-and-point-s")}</SelectItem>
                      <SelectItem value="approved-network-only">{translateNetworkMode(t, "approved-network-only")}</SelectItem>
                      <SelectItem value="open-network">{translateNetworkMode(t, "open-network")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("fleet.policyManagement.preferredOems", "Preferred OEMs")}</Label>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    {OEM_OPTIONS.map((option) => {
                      const selected = form.serviceNetworkRule.preferredOEMs.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            const currentValues = form.serviceNetworkRule.preferredOEMs;
                            setNestedRuleField(
                              "serviceNetworkRule",
                              "preferredOEMs",
                              selected
                                ? currentValues.filter((entry) => entry !== option)
                                : [...currentValues, option],
                            );
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {translateTyreBrand(t, option)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>{t("fleet.policyManagement.preferredPosLocations", "Preferred POS locations")}</Label>
                  <Input
                    value={form.serviceNetworkRule.preferredPOSLocations}
                    onChange={(event) =>
                      setNestedRuleField(
                        "serviceNetworkRule",
                        "preferredPOSLocations",
                        event.target.value,
                      )
                    }
                    placeholder={t("fleet.policyManagement.preferredPosLocationsPlaceholder", "Frankfurt Nord, Darmstadt, Wiesbaden")}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>{t("fleet.policyManagement.excludedProviders", "Excluded providers")}</Label>
                  <Input
                    value={form.serviceNetworkRule.excludedProviders}
                    onChange={(event) =>
                      setNestedRuleField(
                        "serviceNetworkRule",
                        "excludedProviders",
                        event.target.value,
                      )
                    }
                    placeholder={t("fleet.policyManagement.excludedProvidersPlaceholder", "Open roadside vendors")}
                  />
                </div>
                {[
                  ["crossBorderAllowed", t("fleet.policyManagement.crossBorderAllowed", "Cross-border allowed")],
                  ["mobileServiceAllowed", t("fleet.policyManagement.mobileServiceAllowed", "Mobile service allowed")],
                  ["nearestStationAutoAssign", t("fleet.policyManagement.nearestStationAutoAssign", "Nearest station auto-assign")],
                  ["outOfNetworkApprovalRequired", t("fleet.policyManagement.outOfNetworkApprovalRequired", "Out-of-network approval required")],
                ].map(([field, label]) => (
                  <div className="grid gap-2" key={field}>
                    <Label>{label}</Label>
                    <Select
                      onValueChange={(value) =>
                        setNestedRuleField(
                          "serviceNetworkRule",
                          field,
                          value === "true",
                        )
                      }
                      value={String(form.serviceNetworkRule[field])}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t("driver.request.yes", "Yes")}</SelectItem>
                        <SelectItem value="false">{t("driver.request.no", "No")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="change-note">{t("fleet.policyManagement.versionChangeNote")}</Label>
            <Input
              id="change-note"
              onChange={handleFormField("changeNote")}
              placeholder={t("fleet.policyManagement.versionChangeNotePlaceholder")}
              value={form.changeNote}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={policyApiSaving} className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]">{t("fleet.policyManagement.saveAsPolicyVersion")}</Button>
            <p className="text-xs text-slate-500">
              {t("fleet.policyManagement.saveHint")}
            </p>
            <p className="text-xs text-slate-500">
              {t(
                "fleet.policyManagement.livePolicyGuardrail",
                "Saving creates a new version. If saved as Active, the previous active version for this code is retired automatically.",
              )}
            </p>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.policyManagement.activePolicySummary", "Active policy summary")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t(
                "fleet.policyManagement.activePolicySummaryDesc",
                "Current live versions per policy code with scope, limits, and affected vehicle count.",
              )}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {activePolicies.length} {t("fleet.policyManagement.activePolicies", "active policies")}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {activePolicies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              {t("fleet.policyManagement.noActivePolicies", "No active policies.")}
            </div>
          ) : (
            activePolicies.map((policy) => {
              const impactedCount = vehicles.filter((vehicle) => {
                if (policy.appliesTo?.vehicleId && vehicle.id !== policy.appliesTo.vehicleId) {
                  return false;
                }
                if (policy.appliesTo?.vehicleClass && vehicle.type !== policy.appliesTo.vehicleClass) {
                  return false;
                }
                return true;
              }).length;
              return (
                <article
                  key={policy.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {policy.name} · {policy.policyCode} · v{policy.version}
                      </p>
                      <p className="text-xs text-slate-500">{toScopeLabel(t, policy)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {t("fleet.policyManagement.currentActiveVersion", "Current active version")}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>{t("fleet.policyManagement.serviceCap", "Service cap")}: {toCurrencyEuro(policy.servicePriceLimit)}</p>
                    <p>{t("fleet.policyManagement.tyreCap", "Tyre cap")}: {toCurrencyEuro(policy.tyrePriceLimit)}</p>
                    <p>{t("fleet.policyManagement.approvalThreshold", "Approval threshold")}: {policy.approvalThreshold === null ? "-" : `${policy.approvalThreshold}%`}</p>
                    <p>{t("fleet.policyManagement.affectedVehicles", "Affected vehicles")}: {impactedCount}</p>
                    <p>{t("fleet.policyManagement.emergencyBreakdownRule", "Emergency breakdown rule")}: {policy.emergencyBreakdownRule?.enabled ? normalizePolicyStatusLabel(t, "Active") : t("fleet.policyManagement.disabled", "Disabled")}</p>
                    <p>{t("fleet.policyManagement.networkMode", "Network mode")}: {policy.serviceNetworkRule?.networkMode ? translateNetworkMode(t, policy.serviceNetworkRule.networkMode) : "-"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {policy.allowedTyreBrands.slice(0, 4).map((brand) => (
                      <span key={brand} className="rounded-full bg-white px-2.5 py-1 text-slate-700">
                        {translateTyreBrand(t, brand)}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{t("fleet.policyManagement.policyRecords")}</h3>
            <span className="text-xs text-slate-500">
              {t("fleet.policyManagement.policyFamilies", { count: filteredLatestPolicies.length })}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Input
                className="pr-10"
                onChange={(event) => setPolicySearch(event.target.value)}
                placeholder={t("fleet.policyManagement.searchNameCodeScope")}
                value={policySearch}
              />
              {policySearch ? (
                <button
                  aria-label={t("fleet.policyManagement.clearSearch")}
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => setPolicySearch("")}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fleet.policyManagement.statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("fleet.policyManagement.allStatuses")}</SelectItem>
                <SelectItem value="Active">{normalizePolicyStatusLabel(t, "Active")}</SelectItem>
                <SelectItem value="Draft">{normalizePolicyStatusLabel(t, "Draft")}</SelectItem>
                <SelectItem value="Retired">{normalizePolicyStatusLabel(t, "Retired")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {filteredLatestPolicies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                {t("fleet.policyManagement.noPolicyRecordsFound")}
              </div>
            ) : (
              filteredLatestPolicies.map((policy) => (
                <article
                  key={policy.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {policy.name} (v{policy.version})
                      </p>
                      <p className="text-xs text-slate-500">
                        {policy.policyCode} | {toScopeLabel(t, policy)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                          policy.status
                        )}`}
                      >
                        {normalizePolicyStatusLabel(t, policy.status)}
                      </span>
                      {policy.status === "Active" ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {t("fleet.policyManagement.currentActiveVersion", "Current active version")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>{t("fleet.policyManagement.serviceCap", "Service cap")}: {toCurrencyEuro(policy.servicePriceLimit)}</p>
                    <p>{t("fleet.policyManagement.tyreCap", "Tyre cap")}: {toCurrencyEuro(policy.tyrePriceLimit)}</p>
                    <p>{t("fleet.policyManagement.approvalThreshold", "Approval threshold")}: {policy.approvalThreshold === null ? "-" : `${policy.approvalThreshold}%`}</p>
                    <p>{t("fleet.policyManagement.allowedBrands", "Allowed brands")}: {policy.allowedTyreBrands.length}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={handleLoadFromPolicy(policy)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t("fleet.policyManagement.loadInForm")}
                    </Button>
                    <Select
                      onValueChange={handlePolicyStatusChange(policy)}
                      value={policy.status}
                    >
                      <SelectTrigger className="h-8 w-[140px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">{normalizePolicyStatusLabel(t, "Active")}</SelectItem>
                        <SelectItem value="Draft">{normalizePolicyStatusLabel(t, "Draft")}</SelectItem>
                        <SelectItem value="Retired">{normalizePolicyStatusLabel(t, "Retired")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{t("fleet.policyManagement.classWisePolicyView")}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("fleet.policyManagement.classWisePolicyViewDesc")}
          </p>
          <div className="card-list-scrollbar mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {classWisePolicies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                {t("fleet.policyManagement.noClassScopedPoliciesYet")}
              </div>
            ) : (
              classWisePolicies.map((item) => (
                <div
                  key={item.className}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{item.className}</p>
                    <span className="text-xs text-slate-500">
                      {t("fleet.policyManagement.policiesCount", { count: item.policies.length })}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {item.policies.map((policy) => (
                      <span
                        key={policy.id}
                        className="rounded-full bg-white px-2.5 py-1 text-slate-700"
                      >
                        {policy.policyCode} v{policy.version}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{t("fleet.policyManagement.policyVersionHistory")}</h3>
          <Select onValueChange={setHistoryCode} value={historyCode}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={t("fleet.policyManagement.filterByPolicyCode")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("fleet.policyManagement.allPolicyCodes")}</SelectItem>
              {policyCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
          {selectedHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              {t("fleet.policyManagement.noVersionHistoryFound")}
            </div>
          ) : (
            selectedHistory.map((policy) => (
              <article
                key={policy.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {policy.policyCode} | {policy.name} | v{policy.version}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("fleet.policyManagement.effective", "Effective")} {policy.effectiveFrom || "-"} | {toScopeLabel(t, policy)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                      policy.status
                    )}`}
                  >
                    {normalizePolicyStatusLabel(t, policy.status)}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <p>
                    {t("fleet.policyManagement.allowedServiceTypes", "Allowed service types")}:{" "}
                    {policy.allowedServiceTypes.length > 0
                      ? policy.allowedServiceTypes
                          .map((entry) => translatePolicyServiceType(t, entry))
                          .join(", ")
                      : "-"}
                  </p>
                  <p>
                    {t("fleet.policyManagement.allowedTyreBrandsCategories", "Allowed tyre brands/categories")}:{" "}
                    {[...policy.allowedTyreBrands, ...policy.allowedTyreCategories].length >
                    0
                      ? `${policy.allowedTyreBrands
                          .map((entry) => translateTyreBrand(t, entry))
                          .join(", ")} | ${policy.allowedTyreCategories
                          .map((entry) => translateTyreCategory(t, entry))
                          .join(", ")}`
                      : "-"}
                  </p>
                  <p>
                    {t("fleet.policyManagement.priceLimits", "Price limits")}: {t("fleet.policyManagement.serviceCap", "Service cap")}{" "}
                    {toCurrencyEuro(policy.servicePriceLimit)}, {t("fleet.policyManagement.tyreCap", "Tyre cap")} {toCurrencyEuro(policy.tyrePriceLimit)}
                  </p>
                  <p>
                    {t("fleet.policyManagement.approvalThreshold", "Approval threshold")}:{" "}
                    {policy.approvalThreshold === null
                      ? "-"
                      : `${policy.approvalThreshold}%`}
                  </p>
                  <p>
                    {t("fleet.policyManagement.emergencyBreakdownRule", "Emergency breakdown rule")}:{" "}
                    {policy.emergencyBreakdownRule?.enabled
                      ? `${policy.emergencyBreakdownRule.approvalMode} | ${toCurrencyEuro(policy.emergencyBreakdownRule.costLimitEur)}`
                      : t("fleet.policyManagement.disabled", "Disabled")}
                  </p>
                  <p>
                    {t("fleet.policyManagement.serviceNetworkRule", "Service network rule")}:{" "}
                    {policy.serviceNetworkRule?.networkMode
                      ? translateNetworkMode(t, policy.serviceNetworkRule.networkMode)
                      : "-"} |{" "}
                    {policy.serviceNetworkRule?.outOfNetworkApprovalRequired
                      ? t("fleet.policyManagement.outOfNetworkApprovalRequired", "Out-of-network approval required")
                      : t("fleet.policyManagement.openNetworkAllowed", "Open network allowed")}
                  </p>
                </div>

                {getPolicyChanges(policy, previousPoliciesById.get(policy.id)).length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("fleet.policyManagement.versionChanges", "Version changes")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getPolicyChanges(policy, previousPoliciesById.get(policy.id)).map((change) => (
                        <span
                          key={change}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                        >
                          {translatePolicyChange(t, change)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(policy.seasonalTyreRules || policy.specialCaseExceptions) && (
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <p>{t("fleet.policyManagement.seasonalTyreRules", "Seasonal tyre rules")}: {policy.seasonalTyreRules || "-"}</p>
                    <p>{t("fleet.policyManagement.specialCaseExceptions", "Special case exceptions")}: {policy.specialCaseExceptions || "-"}</p>
                  </div>
                )}

                {(policy.emergencyBreakdownRule || policy.serviceNetworkRule) && (
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <p>
                      {t("fleet.policyManagement.dispatchGuidance", "Dispatch guidance")}:{" "}
                      {policy.emergencyBreakdownRule?.dispatchGuidance || "-"}
                    </p>
                    <p>
                      {t("fleet.policyManagement.preferredOems", "Preferred OEMs")}:{" "}
                      {policy.serviceNetworkRule?.preferredOEMs?.length
                        ? policy.serviceNetworkRule.preferredOEMs
                            .map((entry) => translateTyreBrand(t, entry))
                            .join(", ")
                        : "-"}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  {t("fleet.policyManagement.versionChangeNote", "Version change note")}: {policy.changeNote || "-"} | {t("fleet.policyManagement.updated", "Updated")}{" "}
                  {new Date(policy.updatedAt).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default VehiclePolicyManagement;











