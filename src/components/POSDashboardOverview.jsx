import { Search, ShieldCheck, Store, Truck } from "lucide-react";
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
}) {
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
                <Tooltip />
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
                <Tooltip formatter={(value) => [`$${value}`, "Estimated Cost"]} />
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
          <Input
            onChange={(event) => setPlateQuery(event.target.value)}
            placeholder="Enter plate (e.g. TX-8841)"
            value={plateQuery}
          />
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
          <div className="mt-4 space-y-2 text-sm">
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

          <div className="mt-4 space-y-2">
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
