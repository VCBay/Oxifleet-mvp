import { ShieldCheck, Truck } from "lucide-react";
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

const healthBandColor = (score) => {
  if (score >= 85) {
    return "#16a34a";
  }
  if (score >= 70) {
    return "#2563eb";
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
  const band = healthBandLabel(score);
  const tone = healthBandColor(score);
  return (
    <div className="min-w-[220px] rounded-2xl border border-slate-700/60 bg-[#0F172A] px-3 py-2 text-white shadow-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
        Vehicle Health
      </p>
      <p className="mt-1 text-sm font-semibold">{point?.name || "Metric"}</p>
      <div className="mt-2 rounded-xl border border-slate-600/70 bg-white/5 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-300">Score</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-900"
            style={{ backgroundColor: tone }}
          >
            {band}
          </span>
        </div>
        <p className="mt-1 text-base font-semibold text-white">{score}%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: tone, width: `${Math.min(100, Math.max(0, score))}%` }}
          />
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
    <div className="min-w-[230px] rounded-2xl border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-white shadow-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
        Service Spend Trend
      </p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <span className="inline-block size-2 rounded-full bg-slate-200" />
            Spend
          </div>
          <p className="text-xs font-semibold text-white">${spend}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <span className="inline-block size-2 rounded-full bg-sky-400" />
            Service checks
          </div>
          <p className="text-xs font-semibold text-white">{checks}</p>
        </div>
        <div className="mt-1 rounded-lg border border-slate-600/60 bg-white/5 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-300">Cost per check</p>
          <p className="text-xs font-semibold text-white">${perCheck}</p>
        </div>
      </div>
    </div>
  );
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
  const healthRows = analytics.healthIndex || [];
  const averageHealthScore =
    healthRows.length > 0
      ? Math.round(
          healthRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / healthRows.length
        )
      : 0;
  const bestHealthMetric = healthRows.reduce(
    (best, row) => ((Number(row.score) || 0) > (Number(best?.score) || -1) ? row : best),
    null
  );
  const riskHealthMetric = healthRows.reduce(
    (risk, row) => ((Number(row.score) || 0) < (Number(risk?.score) || 101) ? row : risk),
    null
  );
  const spendRows = analytics.spendTrend || [];
  const averageSpend =
    spendRows.length > 0
      ? Math.round(spendRows.reduce((sum, row) => sum + (Number(row.spend) || 0), 0) / spendRows.length)
      : 0;
  const peakSpend = spendRows.reduce(
    (peak, row) => ((Number(row.spend) || 0) > (Number(peak?.spend) || -1) ? row : peak),
    null
  );
  const lowSpend = spendRows.reduce(
    (low, row) => ((Number(row.spend) || 0) < (Number(low?.spend) || Number.MAX_SAFE_INTEGER) ? row : low),
    null
  );
  const checksMax = spendRows.reduce(
    (max, row) => Math.max(max, Number(row.checks) || 0),
    0
  );

  return (
    <>
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Days to next service</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {analytics.daysToNextService}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Warranty days remaining</p>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Service spend trend (6 months)
              </h2>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Avg ${averageSpend}
              </span>
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
            <div className="mt-4 h-64">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={analytics.spendTrend}>
                  <defs>
                    <linearGradient id="driverSpendGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity={0.48} />
                      <stop offset="70%" stopColor="#0f172a" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                    <filter id="spendGlow">
                      <feDropShadow dx="0" dy="4" floodColor="#0f172a" floodOpacity="0.24" stdDeviation="3" />
                    </filter>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    stroke="#64748b"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(value) => `$${value}`}
                    tickLine={false}
                  />
                  <YAxis domain={[0, Math.max(3, checksMax + 1)]} hide yAxisId="checks" />
                  <ReferenceLine
                    label={{ fill: "#64748b", fontSize: 10, value: "Avg" }}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    y={averageSpend}
                  />
                  <Tooltip content={renderSpendTrendTooltip} />
                  <Area
                    dataKey="spend"
                    fill="url(#driverSpendGradient)"
                    fillOpacity={1}
                    filter="url(#spendGlow)"
                    activeDot={{ r: 6, fill: "#0f172a", stroke: "#e2e8f0", strokeWidth: 2 }}
                    stroke="#0f172a"
                    strokeWidth={2.4}
                    type="monotone"
                  />
                  <Line
                    dataKey="checks"
                    dot={{ fill: "#0ea5e9", r: 3 }}
                    stroke="#0ea5e9"
                    strokeDasharray="5 3"
                    strokeWidth={2}
                    type="monotone"
                    yAxisId="checks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Spend area
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                Service checks
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Vehicle health index</h2>
              <div
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: healthBandColor(averageHealthScore) }}
              >
                Overall {averageHealthScore}% | {healthBandLabel(averageHealthScore)}
              </div>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p>
                Best:{" "}
                <span className="font-semibold text-slate-900">
                  {bestHealthMetric?.name || "N/A"} ({bestHealthMetric?.score ?? 0}%)
                </span>
              </p>
              <p>
                Needs attention:{" "}
                <span className="font-semibold text-slate-900">
                  {riskHealthMetric?.name || "N/A"} ({riskHealthMetric?.score ?? 0}%)
                </span>
              </p>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={analytics.healthIndex} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid stroke="#dbe6f3" strokeDasharray="3 3" />
                  <XAxis
                    domain={[0, 100]}
                    stroke="#64748b"
                    ticks={[0, 25, 50, 75, 100]}
                    type="number"
                  />
                  <YAxis dataKey="name" stroke="#64748b" type="category" width={110} />
                  <Tooltip content={renderHealthTooltip} />
                  <ReferenceLine
                    label={{
                      fill: "#475569",
                      fontSize: 10,
                      value: "Benchmark",
                    }}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    x={75}
                  />
                  <Bar
                    background={{ fill: "#e2e8f0", radius: [8, 8, 8, 8] }}
                    barSize={18}
                    dataKey="score"
                    radius={[8, 8, 8, 8]}
                  >
                    {analytics.healthIndex.map((entry) => (
                      <Cell key={`health-cell-${entry.name}`} fill={healthBandColor(entry.score)} />
                    ))}
                    <LabelList
                      dataKey="score"
                      fill="#0f172a"
                      formatter={(value) => `${value}%`}
                      position="right"
                      style={{ fontSize: 11, fontWeight: 700 }}
                    />
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
            <p className="text-slate-600">Plate: {vehicle.plate || "N/A"}</p>
            <p className="text-slate-600">Class: {vehicle.type || "N/A"}</p>
            <p className="text-slate-600">Status: {vehicle.status || "Active"}</p>
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
                serviceEligibility.status
              )}`}
            >
              {serviceEligibility.status}
            </span>
            <p className="mt-3 text-sm text-slate-600">{serviceEligibility.note}</p>
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
              Service type: <span className="font-semibold">{nextService.serviceType}</span>
            </p>
            <p className="text-slate-700">
              Due date: <span className="font-semibold">{formatDate(nextService.date)}</span>
            </p>
            <p className="text-slate-700">
              Due odometer:{" "}
              <span className="font-semibold">{nextService.km.toLocaleString()} km</span>
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Seasonal tyre change reminder</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold text-slate-900">{seasonalReminder.title}</p>
            <p className="text-slate-700">
              Reminder date: {formatDate(seasonalReminder.dueDate)}
            </p>
            <p className="text-slate-600">{seasonalReminder.note}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Vehicle tyre specifications</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              Brand: <span className="font-semibold">{vehicle.tyreSpecs?.brand || "N/A"}</span>
            </p>
            <p>
              Size: <span className="font-semibold">{vehicle.tyreSpecs?.size || "N/A"}</span>
            </p>
            <p>
              Front PSI:{" "}
              <span className="font-semibold">{vehicle.tyreSpecs?.frontPsi ?? "N/A"}</span>
            </p>
            <p>
              Rear PSI:{" "}
              <span className="font-semibold">{vehicle.tyreSpecs?.rearPsi ?? "N/A"}</span>
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Warranty information</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>
              Provider: <span className="font-semibold">{warranty.provider}</span>
            </p>
            <p>
              Expiry date: <span className="font-semibold">{formatDate(warranty.expiryDate)}</span>
            </p>
            <p>
              Status: <span className="font-semibold">{warranty.status}</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default DriverOverviewSection;
