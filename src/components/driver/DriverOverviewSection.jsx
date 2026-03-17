import {
  Activity,
  CalendarClock,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "../../hooks/use-mobile";
import { figmaChartCardStyle, figmaChartTheme } from "../../lib/chartTheme";

const healthBandColor = (score) => {
  if (score >= 85) {
    return "#22c55e";
  }
  if (score >= 70) {
    return "#3b82f6";
  }
  if (score >= 55) {
    return "#f59e0b";
  }
  return "#ef4444";
};

const healthBandLabel = (score) => {
  if (score >= 85) {
    return "Excellent";
  }
  if (score >= 70) {
    return "Good";
  }
  if (score >= 55) {
    return "Watch";
  }
  return "Critical";
};

const renderHealthTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0]?.payload;
  const score = Number(point?.score) || 0;
  const tone = healthBandColor(score);
  return (
    <div
      className="min-w-[220px] rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.16em]"
        style={{ color: figmaChartTheme.tooltipLabel }}
      >
        Vehicle Health
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: figmaChartTheme.tooltipTitle }}>
        {point?.name || "Metric"}
      </p>
      <div
        className="mt-2 rounded-md px-3 py-2"
        style={{ border: `0.5px solid ${figmaChartTheme.tooltipBorder}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs" style={{ color: figmaChartTheme.tooltipLabel }}>
            Status
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: tone }}
          >
            {healthBandLabel(score)}
          </span>
        </div>
        <p className="mt-1 text-base font-semibold" style={{ color: figmaChartTheme.tooltipValue }}>
          {score}%
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-300">
          <div className="h-full rounded-full" style={{ backgroundColor: tone, width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
};

const renderSpendTrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const spendPoint = payload.find((item) => String(item.dataKey) === "spend");
  const checksPoint = payload.find((item) => String(item.dataKey) === "checks");
  const spend = Number(spendPoint?.value) || 0;
  const checks = Number(checksPoint?.value) || 0;
  const perCheck = checks > 0 ? Math.round(spend / checks) : spend;

  return (
    <div
      className="min-w-[230px] rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.16em]"
        style={{ color: figmaChartTheme.tooltipLabel }}
      >
        Service Spend Trend
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: figmaChartTheme.tooltipTitle }}>
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: figmaChartTheme.tooltipLabel }}>
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: figmaChartTheme.linePrimary }}
            />
            Spend
          </div>
          <p className="text-xs font-semibold" style={{ color: figmaChartTheme.tooltipValue }}>
            ${spend}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: figmaChartTheme.tooltipLabel }}>
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: figmaChartTheme.lineSecondary }}
            />
            Service checks
          </div>
          <p className="text-xs font-semibold" style={{ color: figmaChartTheme.tooltipValue }}>
            {checks}
          </p>
        </div>
        <div
          className="mt-1 rounded-md px-2 py-1.5"
          style={{ border: `0.5px solid ${figmaChartTheme.tooltipBorder}` }}
        >
          <p className="text-[10px] uppercase tracking-wide" style={{ color: figmaChartTheme.tooltipLabel }}>
            Cost per check
          </p>
          <p className="text-xs font-semibold" style={{ color: figmaChartTheme.tooltipValue }}>
            ${perCheck}
          </p>
        </div>
      </div>
    </div>
  );
};

const kpiTone = (status) => {
  if (status === "good") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "warn") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

function DriverOverviewSection({
  analytics,
  matchingPolicies,
  vehicle,
  serviceEligibility,
  nextService,
  seasonalReminder,
  warranty,
  formatDate,
  eligibilityClass,
}) {
  const isMobile = useIsMobile();
  const healthRows = analytics.healthIndex || [];
  const spendRows = analytics.spendTrend || [];

  const averageHealthScore =
    healthRows.length > 0
      ? Math.round(
          healthRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) /
            healthRows.length
        )
      : 0;
  const bestHealthMetric = healthRows.reduce(
    (best, row) =>
      (Number(row.score) || 0) > (Number(best?.score) || -1) ? row : best,
    null
  );
  const riskHealthMetric = healthRows.reduce(
    (risk, row) =>
      (Number(row.score) || 0) < (Number(risk?.score) || 101) ? row : risk,
    null
  );

  const averageSpend =
    spendRows.length > 0
      ? Math.round(
          spendRows.reduce((sum, row) => sum + (Number(row.spend) || 0), 0) /
            spendRows.length
        )
      : 0;
  const peakSpend = spendRows.reduce(
    (peak, row) =>
      (Number(row.spend) || 0) > (Number(peak?.spend) || -1) ? row : peak,
    null
  );
  const lowSpend = spendRows.reduce(
    (low, row) =>
      (Number(row.spend) || 0) < (Number(low?.spend) || Number.MAX_SAFE_INTEGER)
        ? row
        : low,
    null
  );
  const checksMax = spendRows.reduce(
    (max, row) => Math.max(max, Number(row.checks) || 0),
    0
  );

  const profileInitials = String(vehicle?.model || "DV")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const serviceWindowStatus =
    Number(analytics.daysToNextService) <= 10 ? "warn" : "good";
  const warrantyStatus =
    Number(analytics.warrantyDaysRemaining) <= 30 ? "warn" : "good";
  const policyStatus = matchingPolicies.length > 0 ? "good" : "risk";
  const eligibilityStatus =
    Number(analytics.serviceEligibilityScore) >= 70 ? "good" : "warn";
  const lastUpdated = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const summaryCards = [
    {
      title: "Days to next service",
      value: analytics.daysToNextService,
      helper: `Due ${formatDate(nextService.date)}`,
      status: serviceWindowStatus,
      icon: CalendarClock,
    },
    {
      title: "Warranty days remaining",
      value: analytics.warrantyDaysRemaining ?? "N/A",
      helper: warranty.status,
      status: warrantyStatus,
      icon: ShieldCheck,
    },
    {
      title: "Eligibility score",
      value: `${analytics.serviceEligibilityScore}%`,
      helper: serviceEligibility.status,
      status: eligibilityStatus,
      icon: Gauge,
    },
    {
      title: "Policies mapped",
      value: matchingPolicies.length,
      helper: `${vehicle.type || "Vehicle"} class`,
      status: policyStatus,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,#1f2937_0%,#0f172a_45%,#0b0d12_100%)] px-5 pb-24 pt-7 text-white shadow-xl sm:px-8 sm:pb-28">
        <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-tl-[120px] bg-white/15" />
        <div className="relative z-10">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-300">
            Driver Dashboard
          </p> */}
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Operations Overview
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              Updated {lastUpdated}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              Vehicle {vehicle.id}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              Type {vehicle.type || "N/A"}
            </span>
          </div>
        </div>
      </section>

      <section className="-mt-20 mx-auto grid w-[calc(100%-1.5rem)] grid-cols-2 gap-2.5 sm:-mt-24 sm:w-[calc(100%-2.5rem)] sm:gap-3 lg:w-[calc(100%-4.5rem)] xl:w-[calc(100%-6rem)] xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm"
              key={card.title}
            >
              <div className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-slate-100" />
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {card.helper}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Icon size={12} />
                </span>
              </div>
              <div className="mt-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${kpiTone(
                    card.status,
                  )}`}
                >
                  {card.status === "good"
                    ? "On track"
                    : card.status === "warn"
                      ? "Needs attention"
                      : "Action required"}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="p-4 shadow-sm sm:p-6" style={figmaChartCardStyle}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold sm:text-lg" style={{ color: figmaChartTheme.title }}>
                Service spend trend (6 months)
              </h2>
              <p className="mt-1 text-xs" style={{ color: figmaChartTheme.subtitle }}>
                Same operational data, redesigned for quicker reading.
              </p>
            </div>
            {/* <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Avg ${averageSpend}
            </span> */}
          </div>
          <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <p>
              Peak month:{" "}
              <span className="font-semibold text-slate-900">
                {peakSpend?.label || "N/A"} (${peakSpend?.spend ?? 0})
              </span>
            </p>
            <p>
              Lowest month:{" "}
              <span className="font-semibold text-slate-900">
                {lowSpend?.label || "N/A"} (${lowSpend?.spend ?? 0})
              </span>
            </p>
          </div>
          <div className="mt-4 h-56 sm:h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={analytics.spendTrend}>
                <defs>
                  <linearGradient
                    id="driverSpendGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={figmaChartTheme.areaStart} stopOpacity={1} />
                    <stop offset="60%" stopColor={figmaChartTheme.areaMid} stopOpacity={1} />
                    <stop offset="100%" stopColor={figmaChartTheme.areaEnd} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={figmaChartTheme.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  stroke={figmaChartTheme.axis}
                  tick={{ fill: figmaChartTheme.axis, fontSize: isMobile ? 10 : 11 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  stroke={figmaChartTheme.axis}
                  tick={{ fill: figmaChartTheme.axis, fontSize: isMobile ? 10 : 11 }}
                  tickFormatter={(value) => `$${value}`}
                  tickLine={false}
                  width={isMobile ? 34 : 44}
                />
                <YAxis
                  domain={[0, Math.max(3, checksMax + 1)]}
                  hide
                  yAxisId="checks"
                />
                <ReferenceLine
                  label={{ fill: figmaChartTheme.axis, fontSize: 10, value: "Avg" }}
                  stroke={figmaChartTheme.grid}
                  strokeDasharray="4 4"
                  y={averageSpend}
                />
                <Tooltip
                  content={renderSpendTrendTooltip}
                  cursor={{ fill: figmaChartTheme.cursorFill }}
                />
                <Area
                  activeDot={{
                    r: 6,
                    fill: figmaChartTheme.linePrimary,
                    stroke: figmaChartTheme.grid,
                    strokeWidth: 2,
                  }}
                  dataKey="spend"
                  fill="url(#driverSpendGradient)"
                  fillOpacity={1}
                  stroke={figmaChartTheme.linePrimary}
                  strokeWidth={2.4}
                  type="monotone"
                />
                <Line
                  dataKey="checks"
                  dot={{ fill: figmaChartTheme.lineSecondary, r: 3 }}
                  stroke={figmaChartTheme.lineSecondary}
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="checks"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 shadow-sm sm:p-6" style={figmaChartCardStyle}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-base font-semibold sm:text-lg" style={{ color: figmaChartTheme.title }}>
              Vehicle health index
            </h2>
            <div
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: healthBandColor(averageHealthScore) }}
            >
              Overall {averageHealthScore}% |{" "}
              {healthBandLabel(averageHealthScore)}
            </div>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <p>
              Best:{" "}
              <span className="font-semibold text-slate-900">
                {bestHealthMetric?.name || "N/A"} (
                {bestHealthMetric?.score ?? 0}%)
              </span>
            </p>
            <p>
              Needs attention:{" "}
              <span className="font-semibold text-slate-900">
                {riskHealthMetric?.name || "N/A"} (
                {riskHealthMetric?.score ?? 0}%)
              </span>
            </p>
          </div>
          <div className="mt-4 h-56 sm:h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={analytics.healthIndex}
                layout="vertical"
                margin={{ left: isMobile ? 8 : 30, right: isMobile ? 8 : 14 }}
              >
                <CartesianGrid stroke={figmaChartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  domain={[0, 100]}
                  stroke={figmaChartTheme.axis}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: figmaChartTheme.axis, fontSize: isMobile ? 10 : 11 }}
                  type="number"
                />
                <YAxis
                  dataKey="name"
                  stroke={figmaChartTheme.axis}
                  tick={{ fill: figmaChartTheme.axis, fontSize: isMobile ? 10 : 11 }}
                  type="category"
                  width={isMobile ? 86 : 110}
                />
                <Tooltip content={renderHealthTooltip} />
                <ReferenceLine
                  label={{ fill: figmaChartTheme.axis, fontSize: 10, value: "Benchmark" }}
                  stroke={figmaChartTheme.grid}
                  strokeDasharray="4 4"
                  x={75}
                />
                <Bar
                  background={{ fill: "#ECEAF2", radius: [8, 8, 8, 8] }}
                  barSize={isMobile ? 14 : 18}
                  dataKey="score"
                  radius={[8, 8, 8, 8]}
                >
                  {analytics.healthIndex.map((entry) => (
                    <Cell
                      key={`health-cell-${entry.name}`}
                      fill={healthBandColor(entry.score)}
                    />
                  ))}
                  {!isMobile ? (
                    <LabelList
                      dataKey="score"
                      fill={figmaChartTheme.title}
                      formatter={(value) => `${value}%`}
                      position="right"
                      style={{ fontSize: 11, fontWeight: 700 }}
                    />
                  ) : null}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Excellent 85-100
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Good 70-84
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Watch 55-69
            </span>
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
              Critical 0-54
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 items-stretch gap-3 sm:auto-rows-fr sm:grid-cols-2 sm:gap-6">
        <div className="min-w-0 h-full rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            Driver quick snapshot
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            Key operational details at a glance.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 min-h-[96px] rounded-2xl border border-sky-200/70 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Assigned vehicle
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {vehicle.id} - {vehicle.model}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Plate {vehicle.plate || "N/A"}
              </p>
            </div>
            <div className="min-w-0 min-h-[96px] rounded-2xl border border-emerald-200/70 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Service eligibility
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${eligibilityClass(
                  serviceEligibility.status,
                )}`}
              >
                {serviceEligibility.status}
              </span>
              <p className="mt-2 break-words text-xs text-slate-600">
                {serviceEligibility.note}
              </p>
            </div>
            <div className="min-w-0 min-h-[96px] rounded-2xl border border-indigo-200/70 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Next service
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {nextService.serviceType}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {formatDate(nextService.date)} |{" "}
                {nextService.km.toLocaleString()} km
              </p>
            </div>
            <div className="min-w-0 min-h-[96px] rounded-2xl border border-amber-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Warranty
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {warranty.provider}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {warranty.status} | Expires {formatDate(warranty.expiryDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 h-full rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <ShieldAlert size={16} />
            </span>
            Vehicle tyre specifications
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            Active tyre profile from assigned vehicle.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs min-[460px]:grid-cols-2 sm:text-sm">
            <div className="min-w-0 min-h-[84px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Brand</p>
              <p className="mt-1 break-words font-semibold text-slate-900">
                {vehicle.tyreSpecs?.brand || "N/A"}
              </p>
            </div>
            <div className="min-w-0 min-h-[84px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Size</p>
              <p className="mt-1 break-all font-semibold text-slate-900">
                {vehicle.tyreSpecs?.size || "N/A"}
              </p>
            </div>
            <div className="min-w-0 min-h-[84px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Front PSI</p>
              <p className="mt-1 font-semibold text-slate-900">
                {vehicle.tyreSpecs?.frontPsi ?? "N/A"}
              </p>
            </div>
            <div className="min-w-0 min-h-[84px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Rear PSI</p>
              <p className="mt-1 font-semibold text-slate-900">
                {vehicle.tyreSpecs?.rearPsi ?? "N/A"}
              </p>
            </div>
          </div>
        </div>

      </section>

      <section className="mt-3 grid grid-cols-1 items-start gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-6">
        <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Wrench size={16} />
            </span>
            Seasonal tyre change reminder
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            Seasonal compliance reminder from current policy window.
          </p>
          <div className="mt-4 rounded-2xl border border-indigo-200/70 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{seasonalReminder.title}</p>
            <p className="mt-2 text-xs text-slate-700 sm:text-sm">
              Reminder date: <span className="font-semibold">{formatDate(seasonalReminder.dueDate)}</span>
            </p>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">{seasonalReminder.note}</p>
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Truck size={16} />
            </span>
            Driver identity and asset context
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
            Operational identity details used across service processing.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
              <div className="grid size-12 place-items-center rounded-full bg-[#0D0F16] text-sm font-semibold text-white">
                {profileInitials}
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-900">{vehicle.model}</p>
                <p className="mt-0.5 break-normal text-xs text-slate-600">
                  Vehicle ID {vehicle.id} | Plate {vehicle.plate || "N/A"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-700">
                Class {vehicle.type || "N/A"}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                Warranty {warranty.status}
              </span>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700">
                Policy links {matchingPolicies.length}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DriverOverviewSection;
