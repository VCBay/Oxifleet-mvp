import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  ChartColumnBig,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ClipboardList,
  FileText,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
  X,
} from "lucide-react";
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
import { Input } from "./ui/input";
import { figmaChartCardStyle, figmaChartTheme } from "../lib/chartTheme";
import { useTranslation } from "../i18n/useTranslation";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const renderRequestComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rows = payload.filter((item) => Number.isFinite(Number(item.value)));
  const completed = Math.round(Number(rows.find((row) => row.dataKey === "completed")?.value) || 0);
  const pending = Math.round(Number(rows.find((row) => row.dataKey === "pending")?.value) || 0);

  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <div className="space-y-1">
        <p className="text-2xl font-semibold leading-none text-[#24114D]">
          {completed}%{" "}
          <span className="ml-1 text-xs font-medium text-slate-500">{label}</span>
        </p>
        <p className="text-2xl font-semibold leading-none text-[#643AC7]">
          {pending}%{" "}
          <span className="ml-1 text-xs font-medium text-slate-500">{label}</span>
        </p>
      </div>
    </div>
  );
};

const renderEstimatedCostTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const cost = Number(payload[0]?.value) || 0;
  const costInK = `${Math.round(cost / 1000)}K`;

  return (
    <div
      className="rounded-md px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p className="text-xs font-semibold" style={{ color: figmaChartTheme.tooltipValue }}>
        {costInK}{" "}
        <span className="ml-1 text-[10px] font-normal" style={{ color: figmaChartTheme.tooltipLabel }}>
          {label}
        </span>
      </p>
    </div>
  );
};

function POSDashboardOverview({
  requestSummary,
  monthlyComparison,
  plateQuery,
  setPlateQuery,
  matchedVehicles,
  selectedVehicle,
  assignedDriver,
  fleetDetails,
  primaryPolicy,
  spareSummary,
  spareParts,
  operationDetails,
}) {
  const { t } = useTranslation();
  const op = operationDetails || {
    orderManagement: { drafts: 0, submitted: 0, averageValue: 0 },
    validation: { policyMapped: false, overLimitDrafts: 0, missingRequired: 0 },
    approval: { total: 0, pending: 0, approved: 0, rejected: 0, resubmitted: 0 },
    billing: {
      invoices: 0,
      paid: 0,
      processing: 0,
      unpaid: 0,
      settledValue: 0,
      inFlightValue: 0,
      creditNotes: 0,
    },
    inventory: { availableUnits: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 },
    analytics: { peakMonth: "N/A", onTimeRate: 0, avgCycleHours: 0, trendDirection: "flat" },
    profile: { user: "POS User", hasPolicy: false, activeNotifications: 0 },
  };

  const moduleCards = [
    {
      key: "orders",
      to: "/pos-dashboard/order-management",
      title: t("pos.menu.order-management", "Order Management"),
      icon: ClipboardList,
      highlight: `${op.orderManagement.submitted} Submitted`,
      metrics: [
        `${op.orderManagement.drafts} Drafts`,
        `Avg order ${formatCurrency(op.orderManagement.averageValue)}`,
      ],
      skin:
        "from-slate-900 via-slate-800 to-slate-700 border-slate-700/50 text-white",
    },
    {
      key: "validation",
      to: "/pos-dashboard/validation",
      title: t("pos.menu.validation", "Validation"),
      icon: ShieldAlert,
      highlight: op.validation.policyMapped ? "Policy Mapped" : "Policy Missing",
      metrics: [
        `${op.validation.overLimitDrafts} Over-limit drafts`,
        `${op.validation.missingRequired} Missing required fields`,
      ],
      skin:
        "from-amber-600 via-amber-500 to-amber-400 border-amber-500/50 text-white",
    },
    {
      key: "approval",
      to: "/pos-dashboard/approval-workflow",
      title: t("pos.menu.approval-workflow", "Approval Workflow"),
      icon: FileText,
      highlight: `${op.approval.total} Requests`,
      metrics: [
        `${op.approval.pending} Pending | ${op.approval.approved} Approved`,
        `${op.approval.rejected} Rejected | ${op.approval.resubmitted} Re-submitted`,
      ],
      skin:
        "from-indigo-600 via-indigo-500 to-indigo-400 border-indigo-500/50 text-white",
    },
    {
      key: "billing",
      to: "/pos-dashboard/billing-settlement",
      title: t("pos.menu.billing-settlement", "Billing & Settlement"),
      icon: BadgeDollarSign,
      highlight: `${op.billing.invoices} Invoices`,
      metrics: [
        `${op.billing.paid} Paid | ${op.billing.processing} Processing | ${op.billing.unpaid} Unpaid`,
        `Settled ${formatCurrency(op.billing.settledValue)} | Credit notes ${op.billing.creditNotes}`,
      ],
      skin:
        "from-emerald-700 via-emerald-600 to-emerald-500 border-emerald-500/50 text-white",
    },
    {
      key: "inventory",
      to: "/pos-dashboard/inventory-availability",
      title: t("pos.menu.inventory-availability", "Inventory & Availability"),
      icon: ChartNoAxesColumnIncreasing,
      highlight: `${op.inventory.availableUnits} Units available`,
      metrics: [
        `${op.inventory.lowStock} Low stock | ${op.inventory.outOfStock} Out of stock`,
        `Inventory value ${formatCurrency(op.inventory.inventoryValue)}`,
      ],
      skin:
        "from-cyan-700 via-cyan-600 to-cyan-500 border-cyan-500/50 text-white",
    },
    {
      key: "analytics",
      to: "/pos-dashboard/analytics-reports",
      title: t("pos.menu.analytics-reports", "Analytics & Reports"),
      icon: ChartColumnBig,
      highlight: `Peak month ${op.analytics.peakMonth}`,
      metrics: [
        `On-time ${op.analytics.onTimeRate}% | Avg cycle ${op.analytics.avgCycleHours} hrs`,
        `Trend ${op.analytics.trendDirection}`,
      ],
      skin:
        "from-violet-700 via-violet-600 to-violet-500 border-violet-500/50 text-white",
    },
    {
      key: "profile",
      to: "/pos-dashboard/profile-settings",
      title: t("pos.menu.profile-settings", "Profile & Settings"),
      icon: Settings2,
      highlight: op.profile.user,
      metrics: [
        op.profile.hasPolicy ? "Policy linked to active vehicle" : "Policy mapping required",
        `${op.profile.activeNotifications} Active notifications`,
      ],
      skin:
        "from-rose-700 via-rose-600 to-rose-500 border-rose-500/50 text-white",
    },
  ];

  const summaryCards = [
    {
      key: "total",
      title: "Total requests",
      value: Number(requestSummary.total) || 10,
      icon: ClipboardList,
    },
    {
      key: "completed",
      title: "Completed",
      value: Number(requestSummary.completed) || 8,
      icon: ShieldCheck,
    },
    {
      key: "pending",
      title: "Pending",
      value: Number(requestSummary.pending) || 2,
      icon: ShieldAlert,
    },
    {
      key: "inProgress",
      title: "In progress",
      value: Number(requestSummary.inProgress) || 1,
      icon: Truck,
    },
    {
      key: "approvalRequired",
      title: "Approval pen.",
      value: Number(requestSummary.approvalRequired) || 0,
      icon: FileText,
    },
  ].map((card) => {
    const lastMonthValue = Math.max(0, card.value - Math.round(card.value * 0.15));
    return {
      ...card,
      trendPercent: 15,
      lastMonthValue,
    };
  });
  const requestComparisonData = useMemo(() => {
    const safeRows = Array.isArray(monthlyComparison) ? monthlyComparison : [];
    const maxValue = Math.max(
      1,
      ...safeRows.flatMap((row) => [Number(row.completed) || 0, Number(row.pending) || 0])
    );
    return safeRows.map((row) => ({
      ...row,
      completed: Math.round(((Number(row.completed) || 0) / maxValue) * 100),
      pending: Math.round(((Number(row.pending) || 0) / maxValue) * 100),
    }));
  }, [monthlyComparison]);
  const estimatedChartData = (monthlyComparison?.length ? monthlyComparison : []).map((row) => ({
    ...row,
    monthLabel: row.month,
    estimatedCost: Number(row.estimatedCost) || 0,
  }));
  const latestEstimated = estimatedChartData[estimatedChartData.length - 1]?.estimatedCost || 0;
  const previousEstimated = estimatedChartData[estimatedChartData.length - 2]?.estimatedCost || 0;
  const estimatedTrendPercent =
    previousEstimated > 0 ? Math.round(((latestEstimated - previousEstimated) / previousEstimated) * 100) : 0;

  return (
    <>
    
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ icon: Icon, ...card }) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-700 sm:text-sm">
                <Icon className="text-slate-700" size={14} />
                {card.title}
              </p>
              {/* <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 sm:text-[10px]">
                +{card.trendPercent}% ?
              </span> */}
            </div>
             <div className="flex items-center justify-between gap-2">

            <p className="mt-2 text-4xl font-semibold leading-none text-[#24114D]">
              {card.value}
            </p>

              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 sm:text-[10px]">
                +{card.trendPercent}% ?
              </span>
             </div>
            <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
              Last month: {card.lastMonthValue}
            </p>
          </article>
        ))}
      </section>

      {/* <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            POS operations detail model
          </h2>
          <p className="text-sm text-slate-500">
            Detailed live snapshot across all POS operations with direct navigation.
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moduleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                className={`group rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${card.skin}`}
                key={card.key}
                to={card.to}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-white/15 p-2">
                    <Icon size={18} />
                  </div>
                  <ArrowRight
                    className="opacity-70 transition group-hover:translate-x-0.5"
                    size={16}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold">{card.title}</p>
                <p className="mt-1 text-base font-semibold">{card.highlight}</p>
                <div className="mt-2 space-y-1 text-xs text-white/90">
                  {card.metrics.map((metric) => (
                    <p key={`${card.key}-${metric}`}>{metric}</p>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section> */}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="p-6 shadow-sm" style={figmaChartCardStyle}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: figmaChartTheme.title }}>
                Requests comparison
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {t("pos.overview.requestDistribution", "Total request distribution by period.")}
              </p>
            </div>
            {/* <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-[#D3CFDB] bg-[#F9F9F9] px-2.5 py-1 text-sm font-medium text-[#1D0E3E]"
            >
              Week
              <ChevronDown size={14} />
            </button> */}
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestComparisonData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={figmaChartTheme.grid} vertical={false} />
                <XAxis dataKey="month" stroke={figmaChartTheme.axis} tick={{ fill: figmaChartTheme.axis }} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value) => `${value}%`}
                  stroke={figmaChartTheme.axis}
                  tick={{ fill: figmaChartTheme.axis }}
                />
                <Tooltip
                  content={renderRequestComparisonTooltip}
                  cursor={{ fill: figmaChartTheme.cursorFill }}
                />
                <Bar
                  dataKey="completed"
                  fill="#D7D4E2"
                  radius={[6, 6, 0, 0]}
                  barSize={16}
                  activeBar={{ fill: "#3B206F", radius: [6, 6, 0, 0] }}
                />
                <Bar
                  dataKey="pending"
                  fill="#E3DFF2"
                  radius={[6, 6, 0, 0]}
                  barSize={16}
                  activeBar={{ fill: "#A99DE8", radius: [6, 6, 0, 0] }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 shadow-sm" style={figmaChartCardStyle}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold" style={{ color: figmaChartTheme.title }}>
              Estimated cost trend
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {estimatedTrendPercent >= 0 ? "+" : ""}
              {estimatedTrendPercent}%
            </span>
          </div>
          {/* <p className="mt-1 text-xs text-slate-500">Four-week spend for maintenance and parts.</p> */}
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={estimatedChartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="estimatedCostFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6133C0" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="#6133C0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={figmaChartTheme.grid} vertical={false} />
                <XAxis dataKey="monthLabel" stroke={figmaChartTheme.axis} tick={{ fill: figmaChartTheme.axis }} />
                <YAxis
                  stroke={figmaChartTheme.axis}
                  tick={{ fill: figmaChartTheme.axis }}
                  ticks={[0, 4000, 8000, 12000, 16000]}
                  domain={[0, 16000]}
                  tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
                />
                <Tooltip
                  content={renderEstimatedCostTooltip}
                  cursor={{ stroke: figmaChartTheme.tooltipBorder, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="estimatedCost"
                  stroke="#24114D"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#estimatedCostFill)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#24114D", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Search size={18} />
          Search by vehicle plate
        </h2>
        <div className="mt-4 grid gap-3">
          <div className="relative">
            <Input
              className="pr-10"
              onChange={(event) => setPlateQuery(event.target.value)}
              placeholder="Enter plate (e.g. TX-8841)"
              value={plateQuery}
            />
            {plateQuery ? (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setPlateQuery("")}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {matchedVehicles.slice(0, 6).map((vehicle) => (
              <button
                key={vehicle.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                onClick={() => setPlateQuery(vehicle.plate || vehicle.id)}
                type="button"
              >
                {vehicle.plate || vehicle.id}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Truck size={18} />
            Fleet & driver details
          </h2>
          {selectedVehicle ? (
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-900">
                {selectedVehicle.id} - {selectedVehicle.model}
              </p>
              <p className="text-slate-600">Plate: {selectedVehicle.plate || "N/A"}</p>
              <p className="text-slate-600">
                Driver: {assignedDriver?.name || "Unassigned"}{" "}
                {assignedDriver?.phone ? `| ${assignedDriver.phone}` : ""}
              </p>
              <p className="text-slate-600">
                Fleet: {fleetDetails?.tenantName || primaryPolicy?.appliesTo?.fleet || "N/A"}
              </p>
              <p className="text-slate-600">
                Region: {fleetDetails?.region || "N/A"} | Base: {fleetDetails?.homeBase || "N/A"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {t("pos.overview.noVehicleFound", "No vehicle found for this search.")}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldCheck size={18} />
            Allowed services list
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[16rem] space-y-2 overflow-y-auto pr-1 text-sm">
            {primaryPolicy?.allowedServiceTypes?.length ? (
              primaryPolicy.allowedServiceTypes.map((service) => (
                <div
                  key={service}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700"
                >
                  {service}
                </div>
              ))
            ) : (
              <p className="text-slate-500">
                {t("pos.overview.noServiceWhitelist", "No service whitelist found in policy.")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("pos.overview.allowedTyreBrands", "Allowed tyre brands/specs")}
          </h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              Vehicle tyre brand:{" "}
              <span className="font-semibold">{selectedVehicle?.tyreSpecs?.brand || "N/A"}</span>
            </p>
            <p>
              Vehicle tyre size:{" "}
              <span className="font-semibold">{selectedVehicle?.tyreSpecs?.size || "N/A"}</span>
            </p>
            <p>
              Allowed brands:{" "}
              <span className="font-semibold">
                {primaryPolicy?.allowedTyreBrands?.join(", ") || "No policy restriction"}
              </span>
            </p>
            <p>
              Allowed categories:{" "}
              <span className="font-semibold">
                {primaryPolicy?.allowedTyreCategories?.join(", ") || "No policy restriction"}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Store size={18} />
            Contract rules & limits
          </h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              Policy:{" "}
              <span className="font-semibold">
                {primaryPolicy ? `${primaryPolicy.policyCode} v${primaryPolicy.version}` : "No policy"}
              </span>
            </p>
            <p>
              Service limit:{" "}
              <span className="font-semibold">
                {primaryPolicy?.servicePriceLimit != null
                  ? `$${primaryPolicy.servicePriceLimit}`
                  : "Not defined"}
              </span>
            </p>
            <p>
              Tyre limit:{" "}
              <span className="font-semibold">
                {primaryPolicy?.tyrePriceLimit != null ? `$${primaryPolicy.tyrePriceLimit}` : "Not defined"}
              </span>
            </p>
            <p>
              Approval threshold:{" "}
              <span className="font-semibold">
                {primaryPolicy?.approvalThreshold != null
                  ? `${primaryPolicy.approvalThreshold}`
                  : "Not defined"}
              </span>
            </p>
            <p>
              Special rules:{" "}
              <span className="font-semibold">
                {primaryPolicy?.specialCaseExceptions || primaryPolicy?.seasonalTyreRules || "N/A"}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("pos.overview.sparePartsAvailability", "Spare parts availability")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.availableUnits", "Available units")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{spareSummary.totalAvailable}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.lowStock", "Low stock")}</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{spareSummary.lowStockCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.outOfStock", "Out of stock")}</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{spareSummary.outOfStockCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.inventoryValue", "Inventory value")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">${spareSummary.inventoryValue}</p>
            </div>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {spareParts.map((part) => (
              <div key={part.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {part.part} ({part.id})
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      part.stockStatus === "In stock"
                        ? "bg-emerald-100 text-emerald-700"
                        : part.stockStatus === "Low stock"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {part.stockStatus}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">
                  Available: {part.available} | Reserved: {part.reserved} | Reorder point:{" "}
                  {part.reorderPoint}
                </p>
                <p className="mt-1 text-slate-500">
                  ETA restock: {part.etaDays} day(s) | Unit cost: ${part.unitCost}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("pos.overview.operationalInsights", "Additional POS operational insights")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.avgCycleTime", "Average cycle time")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{requestSummary.avgCycleHours} hrs</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.onTimeCompletion", "On-time completion")}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{requestSummary.onTimeRate}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.rejectedRequests", "Rejected requests")}</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{requestSummary.rejected}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">{t("pos.overview.estimatedRequestValue", "Estimated request value")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                ${Math.round(requestSummary.estimatedCostTotal)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {t("pos.overview.recommendations", "Recommendations")}
            </p>
            <p className="mt-2">
              1) Prioritize low-stock parts with high request frequency to avoid booking delays.
            </p>
            <p className="mt-1">
              2) Route approval-required jobs to fleet manager queue earlier for faster turnaround.
            </p>
            <p className="mt-1">
              3) Track high-cycle-time requests and assign preferred workshops for repeat issues.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default POSDashboardOverview;
