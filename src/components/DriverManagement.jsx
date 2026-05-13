import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Clock3,
  CarFront,
  Plus,
  Search,
  ShieldCheck,
  MailCheck,
  MailWarning,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useTranslation } from "../i18n/useTranslation";

const getInitials = (name) => {
  const raw = String(name || "").trim();
  if (!raw) {
    return "DR";
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const getActivityClassName = (activityStatus) => {
  if (activityStatus === "Driving") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (activityStatus === "Idle") {
    return "bg-amber-100 text-amber-700";
  }
  if (activityStatus === "On leave") {
    return "bg-slate-200 text-slate-700";
  }
  if (activityStatus === "Inactive") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-sky-100 text-sky-700";
};

const getComplianceClassName = (score) => {
  if (score >= 90) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 75) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};


const getInviteBadgeMeta = (driver) => {
  const status = String(driver?.inviteStatus || "").toLowerCase();
  if (status === "sent" || status === "accepted") {
    return {
      label: "Invite sent",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: MailCheck,
    };
  }
  if (status === "pending") {
    return {
      label: "Invite pending",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: Clock3,
    };
  }
  if (status === "failed") {
    return {
      label: "Invite failed",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: MailWarning,
    };
  }
  return {
    label: "No invite",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: Clock3,
  };
};
const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "Driving", label: "Driving" },
  { key: "Active", label: "Active" },
  // { key: "Idle", label: "Idle" },
  { key: "On leave", label: "On leave" },
  { key: "Inactive", label: "Inactive" },
];

const driverOverviewToneClass = (tone) => {
  if (tone === "good") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (tone === "warn") {
    return "bg-amber-100 text-amber-700";
  }
  if (tone === "info") {
    return "bg-sky-100 text-sky-700";
  }
  return "bg-slate-200 text-slate-700";
};

function DriverManagement({
  drivers,
  assignmentVehicles,
  searchQuery,
  onSearchQueryChange,
  onAddDriverClick,
  onDriverAssignmentChange,
  onDriverActivityChange,
  onDriverAccessChange,
  onRemoveDriver,
}) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth < 1024;
  });
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const summary = useMemo(() => {
    const total = drivers.length;
    const driving = drivers.filter(
      (driver) => (driver.activityStatus || driver.status) === "Driving"
    ).length;
    const active = drivers.filter(
      (driver) => (driver.activityStatus || driver.status) === "Active"
    ).length;
    const idle = drivers.filter(
      (driver) => (driver.activityStatus || driver.status) === "Idle"
    ).length;
    const unassigned = drivers.filter(
      (driver) => !String(driver.assignedVehicleId || "").trim()
    ).length;
    const avgCompliance =
      total === 0
        ? 0
        : Math.round(
            drivers.reduce(
              (sum, driver) => sum + (Number(driver.complianceScore) || 0),
              0
            ) / total
          );

    return { total, driving, active, idle, unassigned, avgCompliance };
  }, [drivers]);

  const driverOverviewCards = [
    {
      key: "total",
      title: t("fleet.driverManagement.cards.totalDrivers"),
      value: summary.total,
      helper: t("fleet.driverManagement.cards.registeredInTenant"),
      status: t("fleet.driverManagement.cards.rosterSynced"),
      tone: "good",
      icon: Users,
    },
    {
      key: "driving",
      title: t("fleet.driverManagement.cards.drivingNow"),
      value: summary.driving,
      helper: t("fleet.driverManagement.cards.currentlyOnRoute"),
      status: t("fleet.driverManagement.cards.liveDuty"),
      tone: "good",
      icon: Activity,
    },
    {
      key: "active",
      title: t("fleet.driverManagement.cards.activeStandby"),
      value: summary.active,
      helper: t("fleet.driverManagement.cards.readyForAssignments"),
      status: t("fleet.driverManagement.cards.onStandby"),
      tone: "info",
      icon: BadgeCheck,
  Clock3,
    },
    {
      key: "idle",
      title: t("fleet.driverManagement.status.idle"),
      value: summary.idle,
      helper: t("fleet.driverManagement.cards.noActiveTrip"),
      status: t("fleet.driverManagement.cards.monitorQueue"),
      tone: "warn",
      icon: CarFront,
    },
    {
      key: "compliance",
      title: t("fleet.driverManagement.cards.avgCompliance"),
      value: `${summary.avgCompliance}%`,
      helper: t("fleet.driverManagement.cards.fleetComplianceAverage"),
      status: summary.avgCompliance >= 90 ? t("fleet.driverManagement.cards.excellent") : t("fleet.driverManagement.cards.watch"),
      tone: summary.avgCompliance >= 90 ? "good" : "warn",
      icon: ShieldCheck,
  MailCheck,
  MailWarning,
    },
  ];

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const activityStatus = driver.activityStatus || driver.status || "Active";
      const assignedVehicle = assignmentVehicles.find(
        (vehicle) => vehicle.id === driver.assignedVehicleId
      );
      const complianceScore = Number(driver.complianceScore) || 0;

      const blob = [
        driver.id,
        driver.name,
        driver.email,
        driver.phone,
        driver.license,
        activityStatus,
        driver.accessLevel,
        assignedVehicle?.id || "",
        assignedVehicle?.model || "",
      ]
        .join(" ")
        .toLowerCase();

      if (searchQuery.trim() && !blob.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (statusFilter !== "all" && activityStatus !== statusFilter) {
        return false;
      }
      if (accessFilter !== "all" && (driver.accessLevel || "Standard") !== accessFilter) {
        return false;
      }
      if (complianceFilter === "high" && complianceScore < 90) {
        return false;
      }
      if (
        complianceFilter === "watch" &&
        (complianceScore < 75 || complianceScore >= 90)
      ) {
        return false;
      }
      if (complianceFilter === "critical" && complianceScore >= 75) {
        return false;
      }
      return true;
    });
  }, [accessFilter, assignmentVehicles, complianceFilter, drivers, searchQuery, statusFilter]);

  const selectedDriver = useMemo(() => {
    const explicit = filteredDrivers.find((driver) => driver.id === selectedDriverId);
    if (explicit) {
      return explicit;
    }
    return filteredDrivers[0] || null;
  }, [filteredDrivers, selectedDriverId]);

  const selectedAssignedVehicle = selectedDriver
    ? assignmentVehicles.find((vehicle) => vehicle.id === selectedDriver.assignedVehicleId)
    : null;

  const selectedHistory = selectedDriver?.serviceHistory?.slice(0, 6) || [];
  const selectedCompliance = Number(selectedDriver?.complianceScore) || 0;
  const selectedActivity =
    selectedDriver?.activityStatus || selectedDriver?.status || "Active";

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
    if (isMobileView && isMobileDetailOpen && !selectedDriver) {
      setIsMobileDetailOpen(false);
    }
  }, [isMobileDetailOpen, isMobileView, selectedDriver]);

  const handleSelectDriver = (driverId) => {
    setSelectedDriverId(driverId);
    if (isMobileView) {
      setIsMobileDetailOpen(true);
    }
  };

  const showMobileDetailPage = isMobileView && isMobileDetailOpen;

  return (
    <section className="space-y-6">
      <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#1d3148_0%,#0f1b33_45%,#070b14_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {t("fleet.driverManagement.headerTitle")}
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/50 sm:text-sm">
              {t("fleet.driverManagement.headerDesc")}
            </p>
          </div>
          <Button onClick={onAddDriverClick} type="button" className="h-10 w-full justify-center text-sm sm:w-auto text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]">
            <Plus size={15} />
            {t("fleet.driverManagement.addDriver")}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {driverOverviewCards.map((card) => {
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
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${driverOverviewToneClass(
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
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 pl-10 pr-10 text-sm"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={
                isMobileView
                  ? t("fleet.driverManagement.searchMobile")
                  : t("fleet.driverManagement.searchDesktop")
              }
            />
            {searchQuery ? (
              <button
                aria-label={t("fleet.driverManagement.clearSearch")}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                onClick={() => onSearchQueryChange("")}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          {/* <Select value={accessFilter} onValueChange={setAccessFilter}>
            <SelectTrigger className="h-10 w-full bg-white text-sm">
              <SelectValue placeholder="Access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All access levels</SelectItem>
              <SelectItem value="Full">Full</SelectItem>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Read only">Read only</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select> */}
          {/* <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="h-10 w-full bg-white text-sm">
              <SelectValue placeholder="Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All compliance</SelectItem>
              <SelectItem value="high">High (90+)</SelectItem>
              <SelectItem value="watch">Watch (75-89)</SelectItem>
              <SelectItem value="critical">Critical (&lt;75)</SelectItem>
            </SelectContent>
          </Select> */}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.key}
              className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                statusFilter === chip.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setStatusFilter(chip.key)}
              type="button"
            >
              {chip.label}
            </button>
          ))}
          <span className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:px-3 sm:text-xs">
            {t("fleet.driverManagement.matched", { count: filteredDrivers.length })}
          </span>
        </div>
      </section>
      ) : null}

      <section
        className={`grid gap-6 ${
          isMobileView ? "grid-cols-1" : "xl:grid-cols-[1fr_1.45fr] xl:items-stretch"
        }`}
      >
        <article
          className={`rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5 ${
            isMobileView ? "min-h-[560px]" : "h-[720px]"
          } flex flex-col ${
            showMobileDetailPage ? "hidden" : ""
          }`}
        >
          <div className="driver-list-scrollbar mt-1 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => {
                const activityStatus =
                  driver.activityStatus || driver.status || "Active";
                const assignedVehicle = assignmentVehicles.find(
                  (vehicle) => vehicle.id === driver.assignedVehicleId
                );
                const complianceScore = Number(driver.complianceScore) || 0;
                const isSelected = selectedDriver?.id === driver.id;
                return (
                  <button
                    key={driver.id}
                    className={`w-full rounded-2xl border p-3 text-left transition sm:p-4 ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                    onClick={() => handleSelectDriver(driver.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-9 place-items-center rounded-full text-xs font-semibold ${
                            isSelected ? "bg-white/10" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {getInitials(driver.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold sm:text-base">
                            {driver.name}
                          </p>
                          <p className={`text-[11px] ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                            {driver.id} | {assignedVehicle?.id || t("fleet.driverManagement.unassigned")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isSelected
                              ? "bg-white/15 text-white"
                              : getActivityClassName(activityStatus)
                          }`}
                        >
                          {activityStatus}
                        </span>
                        {(() => {
                          const inviteBadge = getInviteBadgeMeta(driver);
                          const InviteIcon = inviteBadge.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isSelected
                                  ? "bg-white/10 text-white border border-white/20"
                                  : inviteBadge.className
                              }`}
                            >
                              <InviteIcon size={10} />
                              {inviteBadge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className={isSelected ? "text-white/70" : "text-slate-500"}>
                          {t("fleet.driverManagement.compliance")}
                        </span>
                        <span className="font-semibold">{complianceScore}%</span>
                      </div>
                      <div className={`h-2 rounded-full ${isSelected ? "bg-white/15" : "bg-slate-200"}`}>
                        <div
                          className={`h-full rounded-full ${
                            complianceScore >= 90
                              ? "bg-emerald-500"
                              : complianceScore >= 75
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, complianceScore))}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="grid h-full min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t("fleet.driverManagement.noDriversMatched")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("fleet.driverManagement.noDriversMatchedDesc")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>

        <article
          className={`rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 ${
            isMobileView ? "min-h-[560px]" : "h-[720px]"
          } ${
            isMobileView && !showMobileDetailPage ? "hidden" : ""
          } overflow-y-auto`}
        >
          {showMobileDetailPage ? (
            <button
              className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              onClick={() => setIsMobileDetailOpen(false)}
              type="button"
            >
              <ArrowLeft size={14} />
              {t("fleet.driverManagement.backToDriverList")}
            </button>
          ) : null}
          {selectedDriver ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-white/10 text-sm font-semibold">
                      {getInitials(selectedDriver.name)}
                    </span>
                    <div>
                      <p className="text-lg font-semibold">{selectedDriver.name}</p>
                      <p className="text-xs text-slate-300">{selectedDriver.id} | {selectedDriver.email}</p>
                      {(() => {
                        const inviteBadge = getInviteBadgeMeta(selectedDriver);
                        const InviteIcon = inviteBadge.icon;
                        return (
                          <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${inviteBadge.className}`}>
                            <InviteIcon size={12} />
                            {inviteBadge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <Button onClick={onRemoveDriver(selectedDriver.id)} type="button" variant="destructive">
                    <UserMinus size={14} />
                    {t("actions.remove")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.driverManagement.assignVehicle")}
                  </p>
                  <Select
                    value={selectedDriver.assignedVehicleId || "unassigned"}
                    onValueChange={onDriverAssignmentChange(selectedDriver.id)}
                  >
                    <SelectTrigger className="mt-2 w-full bg-white">
                      <SelectValue placeholder={t("fleet.driverManagement.selectVehicle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t("fleet.driverManagement.unassigned")}</SelectItem>
                      {assignmentVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.id} - {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-slate-500">
                    {t("fleet.driverManagement.current")}: {selectedAssignedVehicle ? selectedAssignedVehicle.id : t("fleet.driverManagement.unassigned")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.driverManagement.driverActivityStatus")}
                  </p>
                  <Select
                    value={selectedActivity}
                    onValueChange={onDriverActivityChange(selectedDriver.id)}
                  >
                    <SelectTrigger className="mt-2 w-full bg-white">
                      <SelectValue placeholder={t("fleet.driverManagement.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Driving">Driving</SelectItem>
                      <SelectItem value="Idle">Idle</SelectItem>
                      <SelectItem value="On leave">On leave</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActivityClassName(
                      selectedActivity
                    )}`}
                  >
                    {selectedActivity}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.driverManagement.driverAccessControl")}
                  </p>
                  <Select
                    value={selectedDriver.accessLevel || "Standard"}
                    onValueChange={onDriverAccessChange(selectedDriver.id)}
                  >
                    <SelectTrigger className="mt-2 w-full bg-white">
                      <SelectValue placeholder={t("fleet.driverManagement.selectAccessLevel")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full">Full</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Read only">Read only</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.driverManagement.driverComplianceScore")}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getComplianceClassName(
                      selectedCompliance
                    )}`}
                  >
                    {selectedCompliance}%
                  </span>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        selectedCompliance >= 90
                          ? "bg-emerald-500"
                          : selectedCompliance >= 75
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, selectedCompliance))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("fleet.driverManagement.driverServiceHistory")}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selectedHistory.length > 0 ? (
                    selectedHistory.map((entry, index) => (
                      <div
                        key={`${selectedDriver.id}-${entry.date}-${index}`}
                        className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs text-slate-600"
                      >
                        <p className="font-semibold text-slate-800">{entry.event}</p>
                        <p className="mt-1">
                          {entry.date}
                          {entry.vehicleId ? ` - ${entry.vehicleId}` : ""}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      {t("fleet.driverManagement.noServiceHistory")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">{t("fleet.driverManagement.noDriverSelected")}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("fleet.driverManagement.noDriverSelectedDesc")}
                </p>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Users size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Unassigned</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.unassigned}</p>
        </article>
        <article className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <CarFront size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Assigned</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {Math.max(0, summary.total - summary.unassigned)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <BadgeCheck size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">High compliance</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {drivers.filter((driver) => (Number(driver.complianceScore) || 0) >= 90).length}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Watchlist</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {drivers.filter((driver) => (Number(driver.complianceScore) || 0) < 75).length}
          </p>
        </article>
      </section> */}

      <section className="hidden rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5 lg:block">
        <div className="flex items-center gap-2">
          <Activity size={17} className="text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Driver status distribution
          </h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Driving", value: summary.driving, className: "bg-emerald-500" },
            { label: "Active", value: summary.active, className: "bg-sky-500" },
            { label: "Idle", value: summary.idle, className: "bg-amber-500" },
          ].map((item) => {
            const width = summary.total > 0 ? Math.round((item.value / summary.total) * 100) : 0;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{item.label}</p>
                  <p>{item.value}</p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${item.className}`}
                    style={{ width: `${Math.max(8, width)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export default DriverManagement;








