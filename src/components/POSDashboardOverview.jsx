import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  ChartColumnBig,
  ChartNoAxesColumnIncreasing,
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
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Input } from "./ui/input";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const requestComparisonMeta = {
  completed: { label: "Completed", color: "#10b981" },
  pending: { label: "Pending", color: "#f59e0b" },
};

const renderRequestComparisonTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rows = payload
    .filter((item) => Number.isFinite(Number(item.value)))
    .map((item) => {
      const key = String(item.dataKey || "");
      const meta = requestComparisonMeta[key] || {
        label: key || "Metric",
        color: item.color || "#334155",
      };
      return {
        key,
        label: meta.label,
        color: meta.color,
        value: Number(item.value) || 0,
      };
    });

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="min-w-[200px] rounded-2xl border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-white shadow-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Requests Comparison</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <div className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-3" key={row.key}>
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              {row.label}
            </div>
            <p className="text-xs font-semibold text-white">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-slate-600/70 pt-1.5 text-[11px] text-slate-300">
        Total requests: <span className="font-semibold text-white">{total}</span>
      </div>
    </div>
  );
};

const renderEstimatedCostTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const cost = Number(payload[0]?.value) || 0;

  return (
    <div className="min-w-[200px] rounded-2xl border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-white shadow-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Estimated Cost Trend</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <div className="mt-2 rounded-xl border border-slate-600/70 bg-white/5 px-3 py-2">
        <p className="text-xs text-slate-300">Estimated Cost</p>
        <p className="text-base font-semibold text-white">{formatCurrency(cost)}</p>
      </div>
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
      title: "Order Management",
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
      title: "Validation",
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
      title: "Approval Workflow",
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
      title: "Billing & Settlement",
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
      title: "Inventory & Availability",
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
      title: "Analytics & Reports",
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
      title: "Profile & Settings",
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

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{requestSummary.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{requestSummary.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{requestSummary.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">In progress</p>
          <p className="mt-2 text-2xl font-semibold text-sky-600">{requestSummary.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Approval required</p>
          <p className="mt-2 text-2xl font-semibold text-violet-700">
            {requestSummary.approvalRequired}
          </p>
        </div>
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
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Requests comparison (completed vs pending)
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  content={renderRequestComparisonTooltip}
                  cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Estimated cost trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  content={renderEstimatedCostTooltip}
                  cursor={{ stroke: "rgba(15, 23, 42, 0.25)", strokeWidth: 1 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="estimatedCost"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
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
            <p className="mt-3 text-sm text-slate-500">No vehicle found for this search.</p>
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
              <p className="text-slate-500">No service whitelist found in policy.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Allowed tyre brands/specs</h2>
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
          <h2 className="text-lg font-semibold text-slate-900">Spare parts availability</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Available units</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{spareSummary.totalAvailable}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Low stock</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{spareSummary.lowStockCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Out of stock</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{spareSummary.outOfStockCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Inventory value</p>
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
          <h2 className="text-lg font-semibold text-slate-900">Additional POS operational insights</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Average cycle time</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{requestSummary.avgCycleHours} hrs</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">On-time completion</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{requestSummary.onTimeRate}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Rejected requests</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{requestSummary.rejected}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Estimated request value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                ${Math.round(requestSummary.estimatedCostTotal)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Recommendations</p>
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
