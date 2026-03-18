import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Gauge,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Truck,
  Upload,
  Van,
  Wrench,
  X,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { updateVehicle, upsertVehicles } from "../data/vehicleStore";

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

const deriveWarrantyStatus = (vehicle) => {
  const normalized = toIsoDate(vehicle?.warrantyExpiryDate);
  if (!normalized) {
    return "Unknown";
  }
  const now = new Date();
  const expiry = new Date(`${normalized}T23:59:59`);
  const diffDays = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return "Expired";
  }
  if (diffDays <= 60) {
    return "Expiring soon";
  }
  return "Active";
};

const getWarrantyClassName = (status) => {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Expiring soon") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Expired") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-200 text-slate-700";
};

const getStatusClassName = (status) => {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "In service") {
    return "bg-sky-100 text-sky-700";
  }
  if (status === "Inactive") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-slate-100 text-slate-700";
};

const getVehicleIcon = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("van")) {
    return Van;
  }
  return Truck;
};

const getPseudoScore = (vehicleId) => {
  const source = String(vehicleId || "0");
  let total = 0;
  for (let index = 0; index < source.length; index += 1) {
    total += source.charCodeAt(index);
  }
  return 68 + (total % 29);
};

const parseCostNumber = (value) => {
  if (!value) {
    return 0;
  }
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCurrency = (value) => {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString()}`;
};

const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "Active", label: "Active" },
  // { key: "In service", label: "In service" },
  { key: "Inactive", label: "Inactive" },
];

const WARRANTY_CHIPS = [
  // { key: "all", label: "All warranty" },
  // { key: "Active", label: "Active" },
  // { key: "Expiring soon", label: "Expiring soon" },
  // { key: "Expired", label: "Expired" },
];

const buildProfileDraft = (vehicle) => ({
  model: vehicle?.model || "",
  plate: vehicle?.plate || "",
  type: vehicle?.type || "Truck",
  notes: vehicle?.notes || "",
});

const buildTyreDraft = (vehicle) => ({
  brand: vehicle?.tyreSpecs?.brand || "",
  size: vehicle?.tyreSpecs?.size || "",
  frontPsi: String(vehicle?.tyreSpecs?.frontPsi ?? ""),
  rearPsi: String(vehicle?.tyreSpecs?.rearPsi ?? ""),
});

const buildWarrantyDraft = (vehicle) => ({
  provider: vehicle?.warrantyProvider || "",
  expiryDate: vehicle?.warrantyExpiryDate || "",
});

const buildReplacementDraft = (vehicle) => ({
  replacementVehicleId: vehicle?.replacementVehicleId || "none",
  replacementNotes: vehicle?.replacementNotes || "",
});

function VehicleManagement({ vehicles, onAddVehicleClick = () => {} }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [warrantyFilter, setWarrantyFilter] = useState("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth < 1024;
  });
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkPayload, setBulkPayload] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [profileDraftById, setProfileDraftById] = useState({});
  const [tyreDraftById, setTyreDraftById] = useState({});
  const [warrantyDraftById, setWarrantyDraftById] = useState({});
  const [replacementDraftById, setReplacementDraftById] = useState({});
  const [serviceForm, setServiceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    event: "",
    cost: "",
  });

  const typeOptions = useMemo(() => {
    const set = new Set(
      vehicles.map((vehicle) => vehicle.type).filter((value) => Boolean(value))
    );
    return Array.from(set).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const warrantyStatus = deriveWarrantyStatus(vehicle);
      const queryBlob = [
        vehicle.id,
        vehicle.model,
        vehicle.plate,
        vehicle.type,
        vehicle.status,
        vehicle.warrantyProvider,
        warrantyStatus,
      ]
        .join(" ")
        .toLowerCase();

      if (searchQuery.trim()) {
        const matchesSearch = queryBlob.includes(searchQuery.trim().toLowerCase());
        if (!matchesSearch) {
          return false;
        }
      }
      if (statusFilter !== "all" && vehicle.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && vehicle.type !== typeFilter) {
        return false;
      }
      if (warrantyFilter !== "all" && warrantyStatus !== warrantyFilter) {
        return false;
      }
      return true;
    });
  }, [searchQuery, statusFilter, typeFilter, vehicles, warrantyFilter]);

  const selectedVehicle = useMemo(() => {
    const explicit = filteredVehicles.find(
      (vehicle) => vehicle.id === selectedVehicleId
    );
    if (explicit) {
      return explicit;
    }
    return filteredVehicles[0] || null;
  }, [filteredVehicles, selectedVehicleId]);

  const selectedId = selectedVehicle?.id || "";
  const selectedWarrantyStatus = deriveWarrantyStatus(selectedVehicle);
  const replacementOptions = vehicles.filter(
    (vehicle) => vehicle.id !== selectedVehicle?.id
  );

  const profileDraft = selectedVehicle
    ? profileDraftById[selectedId] || buildProfileDraft(selectedVehicle)
    : null;
  const tyreDraft = selectedVehicle
    ? tyreDraftById[selectedId] || buildTyreDraft(selectedVehicle)
    : null;
  const warrantyDraft = selectedVehicle
    ? warrantyDraftById[selectedId] || buildWarrantyDraft(selectedVehicle)
    : null;
  const replacementDraft = selectedVehicle
    ? replacementDraftById[selectedId] || buildReplacementDraft(selectedVehicle)
    : null;
  const selectedVehicleScore = getPseudoScore(selectedVehicle?.id);

  const summary = useMemo(() => {
    const active = vehicles.filter((vehicle) => vehicle.status === "Active").length;
    const inService = vehicles.filter(
      (vehicle) => vehicle.status === "In service"
    ).length;
    const inactive = vehicles.filter(
      (vehicle) => vehicle.status === "Inactive"
    ).length;
    const expiring = vehicles.filter(
      (vehicle) => deriveWarrantyStatus(vehicle) === "Expiring soon"
    ).length;
    const replacementAssigned = vehicles.filter(
      (vehicle) => Boolean(vehicle.replacementVehicleId)
    ).length;

    return {
      total: vehicles.length,
      active,
      inService,
      inactive,
      expiring,
      replacementAssigned,
    };
  }, [vehicles]);

  const vehicleOverviewCards = [
    {
      key: "total",
      title: "Total vehicles",
      value: summary.total,
      helper: "Vehicles in catalog",
      status: "On track",
      tone: "good",
      icon: Truck,
    },
    {
      key: "active",
      title: "Active",
      value: summary.active,
      helper: "Currently operating",
      status: "Running",
      tone: "good",
      icon: Gauge,
    },
    {
      key: "in-service",
      title: "In service",
      value: summary.inService,
      helper: "Assigned to workshop",
      status: "Workshop",
      tone: "info",
      icon: Wrench,
    },
    {
      key: "inactive",
      title: "Inactive",
      value: summary.inactive,
      helper: "Not currently active",
      status: "Paused",
      tone: "neutral",
      icon: ShieldX,
    },
    {
      key: "warranty-alerts",
      title: "Warranty alerts",
      value: summary.expiring,
      helper: "Expiring within 60 days",
      status: "Expiring soon",
      tone: "warn",
      icon: AlertTriangle,
    },
    {
      key: "replacement-mapped",
      title: "Replacement mapped",
      value: summary.replacementAssigned,
      helper: "Backup vehicle linked",
      status: "Ready backup",
      tone: "good",
      icon: ShieldCheck,
    },
  ];

  const vehicleOverviewToneClass = (tone) => {
    if (tone === "good") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (tone === "info") {
      return "bg-sky-100 text-sky-700";
    }
    if (tone === "warn") {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-slate-200 text-slate-700";
  };

  const spendByClass = useMemo(() => {
    const totals = {};
    vehicles.forEach((vehicle) => {
      const key = vehicle.type || "Unknown";
      const serviceTotal = (vehicle.serviceHistory || []).reduce(
        (sum, entry) => sum + parseCostNumber(entry.cost),
        0
      );
      totals[key] = (totals[key] || 0) + serviceTotal;
    });
    const rows = Object.entries(totals)
      .map(([type, spend]) => ({ type, spend }))
      .sort((left, right) => right.spend - left.spend);
    const maxValue = rows[0]?.spend || 1;
    return rows.map((row) => ({
      ...row,
      ratio: Math.max(8, Math.round((row.spend / maxValue) * 100)),
    }));
  }, [vehicles]);

  const topRiskVehicles = useMemo(() => {
    return [...vehicles]
      .map((vehicle) => {
        const warrantyStatus = deriveWarrantyStatus(vehicle);
        const warrantyRisk =
          warrantyStatus === "Expired"
            ? 45
            : warrantyStatus === "Expiring soon"
              ? 25
              : 8;
        const statusRisk =
          vehicle.status === "In service"
            ? 25
            : vehicle.status === "Inactive"
              ? 20
              : 8;
        const totalRisk = Math.min(
          100,
          warrantyRisk + statusRisk + (100 - getPseudoScore(vehicle.id))
        );
        return {
          id: vehicle.id,
          model: vehicle.model,
          totalRisk,
          warrantyStatus,
          status: vehicle.status,
        };
      })
      .sort((left, right) => right.totalRisk - left.totalRisk)
      .slice(0, 4);
  }, [vehicles]);

  const downtimeTrend = useMemo(() => {
    const baseline = Math.max(1, summary.inService + summary.inactive);
    return [
      { month: "Oct", value: baseline + 1 },
      { month: "Nov", value: baseline + 2 },
      { month: "Dec", value: baseline + 1 },
      { month: "Jan", value: baseline + 3 },
      { month: "Feb", value: baseline + 2 },
      { month: "Mar", value: baseline },
    ];
  }, [summary.inService, summary.inactive]);

  const maxDowntimeValue = Math.max(
    1,
    ...downtimeTrend.map((entry) => entry.value)
  );

  const setProfileField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setProfileDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildProfileDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setTyreField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setTyreDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildTyreDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setWarrantyField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setWarrantyDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildWarrantyDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setReplacementField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setReplacementDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildReplacementDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const handleProfileSave = () => {
    if (!selectedVehicle || !profileDraft) {
      return;
    }
    updateVehicle(selectedId, {
      model: profileDraft.model,
      plate: profileDraft.plate,
      type: profileDraft.type,
      notes: profileDraft.notes,
    });
  };

  const handleTyreSave = () => {
    if (!selectedVehicle || !tyreDraft) {
      return;
    }
    updateVehicle(selectedId, {
      tyreSpecs: {
        brand: tyreDraft.brand,
        size: tyreDraft.size,
        frontPsi: tyreDraft.frontPsi,
        rearPsi: tyreDraft.rearPsi,
      },
    });
  };

  const handleWarrantySave = () => {
    if (!selectedVehicle || !warrantyDraft) {
      return;
    }
    updateVehicle(selectedId, {
      warrantyProvider: warrantyDraft.provider,
      warrantyExpiryDate: warrantyDraft.expiryDate,
    });
  };

  const handleServiceAdd = () => {
    if (!selectedVehicle || !serviceForm.event.trim()) {
      return;
    }
    const nextHistory = [
      {
        date: serviceForm.date || new Date().toISOString().slice(0, 10),
        event: serviceForm.event.trim(),
        cost: serviceForm.cost.trim() || "N/A",
      },
      ...(selectedVehicle.serviceHistory || []),
    ].slice(0, 10);

    updateVehicle(selectedId, {
      serviceHistory: nextHistory,
    });

    setServiceForm((prev) => ({
      ...prev,
      event: "",
      cost: "",
    }));
  };

  const handleActivationToggle = () => {
    if (!selectedVehicle) {
      return;
    }
    updateVehicle(selectedId, {
      status: selectedVehicle.status === "Inactive" ? "Active" : "Inactive",
    });
  };

  const handleReplacementSave = () => {
    if (!selectedVehicle || !replacementDraft) {
      return;
    }
    updateVehicle(selectedId, {
      replacementVehicleId:
        replacementDraft.replacementVehicleId === "none"
          ? ""
          : replacementDraft.replacementVehicleId,
      replacementNotes: replacementDraft.replacementNotes,
    });
  };

  const handleBulkUpsert = () => {
    try {
      const parsed = JSON.parse(bulkPayload);
      const payload = Array.isArray(parsed) ? parsed : [parsed];
      if (payload.length === 0) {
        setBulkFeedback("No vehicle records found in payload.");
        return;
      }
      const result = upsertVehicles(payload);
      setBulkFeedback(
        `Bulk update complete: ${result.inserted} inserted, ${result.updated} updated, ${result.total} total.`
      );
    } catch {
      setBulkFeedback("Invalid JSON payload. Provide an object or an array.");
    }
  };

  const bulkFeedbackIsError =
    bulkFeedback.toLowerCase().includes("invalid") ||
    bulkFeedback.toLowerCase().includes("no vehicle");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => {
      setIsMobileView(mediaQuery.matches);
    };
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileView) {
      setIsMobileDetailOpen(false);
    }
  }, [isMobileView]);

  useEffect(() => {
    if (isMobileView && isMobileDetailOpen && !selectedVehicle) {
      setIsMobileDetailOpen(false);
    }
  }, [isMobileDetailOpen, isMobileView, selectedVehicle]);

  const handleSelectVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    if (isMobileView) {
      setIsMobileDetailOpen(true);
    }
  };

  const showMobileDetailPage = isMobileView && isMobileDetailOpen;

  return (
    <section className="space-y-6">
      <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
              Vehicle Management
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/70 sm:text-sm">
              Operate vehicles with one command surface. Keep service history in sync from a single workflow.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">
              Live fleet
            </p>
            <p className="mt-1 text-2xl font-semibold text-center">{summary.total}</p> 
            {/* <p className="text-xs text-slate-300">Vehicles in catalog</p> */}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {vehicleOverviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
              key={card.key}
            >
              <div className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-slate-100" />
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                    {card.title}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-3xl">
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                    {card.helper}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Icon size={13} />
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${vehicleOverviewToneClass(
                    card.tone,
                  )}`}
                >
                  {card.status}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {!showMobileDetailPage ? (
        <section className="sticky top-0 z-20 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur sm:rounded-3xl sm:p-5">
          <div className="grid gap-2 sm:gap-3 lg:grid-cols-[1.45fr_auto] lg:items-center">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 pl-10 pr-10 text-sm"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  isMobileView
                    ? "Search ID, model, plate or type"
                    : "Search by ID, model, plate, type or warranty"
                }
              />
              {searchQuery ? (
                <button
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          <div className="flex items-center">
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Button
                className="h-10 w-full justify-center px-3 text-sm sm:w-auto"
                onClick={() => setIsBulkDialogOpen(true)}
                type="button"
                variant="outline"
              >
                <Upload size={15} />
                Bulk upload
              </Button>
              <Button
                // className="h-10 w-full justify-center px-3 text-sm sm:w-auto"
                className="h-10 w-full justify-center text-sm sm:w-auto text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                onClick={onAddVehicleClick}
                type="button"
              >
                <Plus size={15} />
                Add vehicle
              </Button>
            </div>
          </div>
        </div>

          <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 xl:grid-cols-[1.8fr_1fr_1fr]">
            <div className="flex flex-wrap gap-2">
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${statusFilter === chip.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  onClick={() => setStatusFilter(chip.key)}
                  type="button"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {WARRANTY_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${warrantyFilter === chip.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  onClick={() => setWarrantyFilter(chip.key)}
                  type="button"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 w-full bg-white text-sm">
                  <SelectValue placeholder="Vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.length > 0 ? (
                    typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      ) : null}

      <div
        className={`grid gap-6 ${isMobileView ? "grid-cols-1" : "xl:grid-cols-[1fr_1.4fr]"}`}
      >
        <div
          className={`min-h-[420px] rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 ${showMobileDetailPage ? "hidden" : ""
            }`}
        >
          <h3 className="text-lg font-semibold text-slate-900">
            Vehicles
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredVehicles.length} vehicles matched
          </p>

          <div className="vehicle-list-scrollbar mt-4 min-h-[1100px] max-h-[1100px] space-y-3 overflow-y-auto pr-1">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => {
                const warrantyStatus = deriveWarrantyStatus(vehicle);
                const isSelected = selectedVehicle?.id === vehicle.id;
                const VehicleIcon = getVehicleIcon(vehicle.type);
                const score = getPseudoScore(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    onClick={() => handleSelectVehicle(vehicle.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid size-8 place-items-center rounded-lg ${isSelected ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                        >
                          <VehicleIcon size={15} />
                        </span>
                        <p className="font-semibold">{vehicle.model}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSelected
                            ? "bg-white/10 text-white"
                            : getStatusClassName(vehicle.status)
                          }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">
                      {vehicle.id} | {vehicle.plate}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSelected
                            ? "bg-white/10 text-white"
                            : getWarrantyClassName(warrantyStatus)
                          }`}
                      >
                        {warrantyStatus}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSelected
                            ? "bg-white/10 text-white"
                            : "bg-indigo-100 text-indigo-700"
                          }`}
                      >
                        Health {score}%
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSelected
                            ? "bg-white/10 text-white"
                            : "bg-slate-200 text-slate-700"
                          }`}
                      >
                        {vehicle.type}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* <Button
                        className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => handleSelectVehicle(vehicle.id)}
                    type="button"
                        variant={isSelected ? "secondary" : "outline"}
                      >
                        View details
                      </Button> */}
                      <Button
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() =>
                          updateVehicle(vehicle.id, {
                            status: vehicle.status === "Inactive" ? "Active" : "Inactive",
                          })
                        }
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                      >
                        {vehicle.status === "Inactive" ? "Activate" : "Deactivate"}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No vehicles available. Add vehicles from the top Add Vehicle button
                or use bulk upload.
              </div>
            )}
          </div>
        </div>

        <div
          className={`space-y-6 ${isMobileView && !showMobileDetailPage ? "hidden" : ""
            }`}
        >
          <div className="min-h-[420px] rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            {showMobileDetailPage ? (
              <button
                className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={() => setIsMobileDetailOpen(false)}
                type="button"
              >
                <ArrowLeft size={14} />
                Back to vehicle list
              </button>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Vehicle profile details
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedVehicle
                    ? `${selectedVehicle.id} - ${selectedVehicle.model}`
                    : "Select a vehicle from the list"}
                </p>
              </div>
              {selectedVehicle ? (
                <Button onClick={handleActivationToggle} type="button" variant="outline">
                  {selectedVehicle.status === "Inactive"
                    ? "Activate vehicle"
                    : "Deactivate vehicle"}
                </Button>
              ) : null}
            </div>

            {selectedVehicle && profileDraft ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-white/10">
                        <Gauge size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Operations score</p>
                        <p className="text-xs text-slate-300">
                          Derived from status, service recency and warranty health
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                      {selectedVehicleScore}%
                    </span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-profile-model">Model</Label>
                    <Input
                      id="vehicle-profile-model"
                      value={profileDraft.model}
                      onChange={(event) => setProfileField("model", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-profile-plate">Plate</Label>
                    <Input
                      id="vehicle-profile-plate"
                      value={profileDraft.plate}
                      onChange={(event) => setProfileField("plate", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select
                      value={profileDraft.type}
                      onValueChange={(value) => setProfileField("type", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                        <SelectItem value="Trailer">Trailer</SelectItem>
                        <SelectItem value="Utility">Utility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Input value={selectedVehicle.status} disabled />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle-profile-notes">Notes</Label>
                  <Textarea
                    id="vehicle-profile-notes"
                    value={profileDraft.notes}
                    onChange={(event) => setProfileField("notes", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Added{" "}
                    {selectedVehicle.createdAt
                      ? new Date(selectedVehicle.createdAt).toLocaleString()
                      : "-"}
                  </p>
                  <Button onClick={handleProfileSave} type="button">
                    Save profile
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid min-h-[290px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No vehicle selected
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Select a vehicle from the list to view and edit profile details.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="min-h-[320px] rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Tyre specifications
              </h3>
              {selectedVehicle && tyreDraft ? (
                <div className="mt-4 grid gap-3">
                  <Input
                    value={tyreDraft.brand}
                    onChange={(event) => setTyreField("brand", event.target.value)}
                    placeholder="Brand"
                  />
                  <Input
                    value={tyreDraft.size}
                    onChange={(event) => setTyreField("size", event.target.value)}
                    placeholder="Size"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={tyreDraft.frontPsi}
                      onChange={(event) => setTyreField("frontPsi", event.target.value)}
                      placeholder="Front PSI"
                      type="number"
                    />
                    <Input
                      value={tyreDraft.rearPsi}
                      onChange={(event) => setTyreField("rearPsi", event.target.value)}
                      placeholder="Rear PSI"
                      type="number"
                    />
                  </div>
                  <Button onClick={handleTyreSave} type="button" variant="outline">
                    Save tyre specs
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid min-h-[215px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm text-slate-600">
                    Tyre specification fields will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-[320px] rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Warranty tracking
              </h3>
              {selectedVehicle && warrantyDraft ? (
                <>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWarrantyClassName(
                        selectedWarrantyStatus
                      )}`}
                    >
                      {selectedWarrantyStatus}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={warrantyDraft.provider}
                      onChange={(event) =>
                        setWarrantyField("provider", event.target.value)
                      }
                      placeholder="Warranty provider"
                    />
                    <Input
                      value={warrantyDraft.expiryDate}
                      onChange={(event) =>
                        setWarrantyField("expiryDate", event.target.value)
                      }
                      type="date"
                    />
                    <Button
                      onClick={handleWarrantySave}
                      type="button"
                      variant="outline"
                    >
                      Save warranty
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-4 grid min-h-[215px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm text-slate-600">
                    Warranty status and editable fields will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>


          <div className="grid gap-6 md:grid-cols-2">
            <div className="min-h-[360px] rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Service history
              </h3>
              {selectedVehicle ? (
                <>
                  <div className="card-list-scrollbar mt-4 max-h-[15rem] space-y-2 overflow-y-auto pr-1">
                    {(selectedVehicle.serviceHistory || []).slice(0, 5).map((entry, index) => (
                      <div
                        key={`${selectedVehicle.id}-service-${index}`}
                        className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs"
                      >
                        <p className="font-semibold text-slate-800">{entry.event}</p>
                        <p className="mt-1 text-slate-600">
                          {entry.date} - {entry.cost}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={serviceForm.date}
                      onChange={(event) =>
                        setServiceForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                      type="date"
                    />
                    <Input
                      value={serviceForm.event}
                      onChange={(event) =>
                        setServiceForm((prev) => ({ ...prev, event: event.target.value }))
                      }
                      placeholder="Service event"
                    />
                    <Input
                      value={serviceForm.cost}
                      onChange={(event) =>
                        setServiceForm((prev) => ({ ...prev, cost: event.target.value }))
                      }
                      placeholder="Cost, e.g. $560"
                    />
                    <Button onClick={handleServiceAdd} type="button" variant="outline">
                      Add service entry
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-4 grid min-h-[245px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm text-slate-600">
                    Service history and add-entry form will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-[360px] rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Replacement
              </h3>
              {selectedVehicle && replacementDraft ? (
                <div className="mt-4 grid gap-3">
                  <Select
                    value={replacementDraft.replacementVehicleId}
                    onValueChange={(value) =>
                      setReplacementField("replacementVehicleId", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select replacement vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No replacement</SelectItem>
                      {replacementOptions.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.id} - {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={replacementDraft.replacementNotes}
                    onChange={(event) =>
                      setReplacementField("replacementNotes", event.target.value)
                    }
                    placeholder="Replacement reason, dates, and planning notes"
                    rows={4}
                  />
                  <Button
                    onClick={handleReplacementSave}
                    type="button"
                    variant="outline"
                  >
                    Save replacement plan
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid min-h-[245px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm text-slate-600">
                    Replacement mapping controls will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* <section className="grid gap-5 xl:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Wrench size={17} className="text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              Service cost by class
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {spendByClass.map((row) => (
              <div key={row.type}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{row.type}</p>
                  <p>{toCurrency(row.spend)}</p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-800 to-slate-500"
                    style={{ width: `${row.ratio}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={17} className="text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              Downtime trend
            </h3>
          </div>
          <div className="mt-4 flex h-[148px] items-end gap-2">
            {downtimeTrend.map((entry) => (
              <div key={entry.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-[120px] w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-amber-400/70 to-amber-200"
                    style={{
                      height: `${Math.max(12, Math.round((entry.value / maxDowntimeValue) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                  {entry.month}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              Top risk vehicles
            </h3>
          </div>
          <div className="mt-4 space-y-2.5">
            {topRiskVehicles.map((vehicle) => {
              const Icon =
                vehicle.warrantyStatus === "Active"
                  ? ShieldCheck
                  : vehicle.warrantyStatus === "Expired"
                    ? ShieldX
                    : Clock3;
              return (
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-slate-200/70 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                        {vehicle.model}
                      </p>
                      <p className="text-[10px] text-slate-500 sm:text-xs">
                        {vehicle.id} | {vehicle.status}
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 sm:text-xs">
                      Risk {vehicle.totalRisk}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600 sm:text-xs">
                    <Icon size={13} />
                    {vehicle.warrantyStatus}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section> */}

      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-3xl overflow-hidden border-slate-200/80 p-0">
          <div className="bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] px-6 py-5 text-white">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-semibold text-white">
                Bulk upload vehicle data
              </DialogTitle>
              <DialogDescription className="text-slate-300">
               Only JSON format accepted.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Textarea
                className="min-h-[220px] border-slate-200 bg-white font-mono text-xs leading-5"
                value={bulkPayload}
                onChange={(event) => setBulkPayload(event.target.value)}
                placeholder='[{"id":"VH-100","model":"Freightliner Cascadia","plate":"TX-1001","type":"Truck","status":"Active"}]'
                rows={10}
              />
            </div>

            {bulkFeedback ? (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  bulkFeedbackIsError
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {bulkFeedback}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-between">
              {/* <Button
                onClick={() => {
                  setBulkPayload("");
                  setBulkFeedback("");
                }}
                type="button"
                variant="outline"
              >
                Clear
              </Button> */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsBulkDialogOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkUpsert} type="button">
                 Upload bulk
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default VehicleManagement;
