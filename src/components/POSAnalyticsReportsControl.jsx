import { useMemo, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getPosOrderState,
  subscribePosOrders,
} from "../data/posOrderStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import {
  getBillingFinanceState,
  subscribeBillingFinance,
} from "../data/billingFinanceStore";
import {
  getDriverState,
  subscribeDrivers,
} from "../data/driverStore";
import {
  getDriverOperationsState,
  subscribeDriverOperations,
} from "../data/driverOperationsStore";

const normalize = (value) => String(value || "").trim().toLowerCase();

const toTime = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const extractPosOrderId = (serviceOrder) => {
  const title = String(serviceOrder?.requestTitle || "");
  const notes = String(serviceOrder?.orderDetails?.notes || "");
  const match = `${title} ${notes}`.match(/POS\s+Order\s+([A-Z0-9-]+)/i);
  return match ? String(match[1]).trim() : "";
};

const getApprovalState = (status) => {
  const raw = normalize(status);
  if (raw.includes("rejected")) {
    return "Rejected";
  }
  if (raw.includes("approved")) {
    return "Approved";
  }
  if (raw.includes("pending")) {
    return "Pending";
  }
  return "In review";
};

function POSAnalyticsReportsControl() {
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState
  );
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState
  );

  const submittedOrders = useMemo(
    () =>
      [...posOrderState.submittedOrders].sort(
        (a, b) => toTime(b.submittedAt || b.updatedAt) - toTime(a.submittedAt || a.updatedAt)
      ),
    [posOrderState.submittedOrders]
  );

  const approvalRequests = useMemo(
    () =>
      serviceOrderState.orders
        .map((order) => ({
          ...order,
          posOrderId: extractPosOrderId(order),
        }))
        .filter((order) => order.posOrderId),
    [serviceOrderState.orders]
  );

  const latestApprovalByPosOrder = useMemo(() => {
    const map = new Map();
    approvalRequests.forEach((request) => {
      const existing = map.get(request.posOrderId);
      const currentTs = toTime(request.updatedAt || request.requestedAt);
      const existingTs = existing ? toTime(existing.updatedAt || existing.requestedAt) : -1;
      if (!existing || currentTs >= existingTs) {
        map.set(request.posOrderId, request);
      }
    });
    return map;
  }, [approvalRequests]);

  const ordersPerPeriod = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        month: d.toLocaleDateString("en-US", { month: "short" }),
        total: 0,
        approved: 0,
        rejected: 0,
      };
    });

    const map = new Map(months.map((month) => [month.key, month]));

    submittedOrders.forEach((order) => {
      const key = monthKey(order.submittedAt || order.updatedAt);
      const row = key ? map.get(key) : null;
      if (!row) {
        return;
      }
      row.total += 1;
      const linked = latestApprovalByPosOrder.get(order.id);
      const approvalState = linked ? getApprovalState(linked.status) : "Pending";
      if (approvalState === "Approved") {
        row.approved += 1;
      }
      if (approvalState === "Rejected") {
        row.rejected += 1;
      }
    });

    return months;
  }, [latestApprovalByPosOrder, submittedOrders]);

  const revenueSummary = useMemo(() => {
    const totalRevenue = billingState.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount || 0),
      0
    );
    const paidRevenue = billingState.invoices
      .filter((invoice) => normalize(invoice.status) === "paid")
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const processingRevenue = billingState.invoices
      .filter((invoice) => normalize(invoice.status) === "processing")
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const unpaidRevenue = billingState.invoices
      .filter((invoice) => normalize(invoice.status) === "unpaid")
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const averageInvoice =
      billingState.invoices.length > 0 ? Math.round(totalRevenue / billingState.invoices.length) : 0;
    return {
      totalRevenue,
      paidRevenue,
      processingRevenue,
      unpaidRevenue,
      averageInvoice,
    };
  }, [billingState.invoices]);

  const rejectionRateSummary = useMemo(() => {
    const considered = submittedOrders
      .map((order) => latestApprovalByPosOrder.get(order.id))
      .filter(Boolean);

    const rejected = considered.filter(
      (request) => getApprovalState(request.status) === "Rejected"
    ).length;
    const approved = considered.filter(
      (request) => getApprovalState(request.status) === "Approved"
    ).length;
    const pending = considered.filter(
      (request) => getApprovalState(request.status) === "Pending"
    ).length;

    const rejectionRate = considered.length > 0 ? Math.round((rejected / considered.length) * 100) : 0;

    return {
      considered: considered.length,
      rejected,
      approved,
      pending,
      rejectionRate,
    };
  }, [latestApprovalByPosOrder, submittedOrders]);

  const fleetWisePerformance = useMemo(() => {
    const assignmentByDriverName = new Map(
      opsState.tenantAssignments.map((assignment) => [
        normalize(assignment.driverName),
        assignment,
      ])
    );
    const tenantById = new Map(opsState.tenants.map((tenant) => [tenant.id, tenant]));
    const driverByVehicleId = new Map(
      driverState.drivers
        .filter((driver) => driver.assignedVehicleId)
        .map((driver) => [driver.assignedVehicleId, driver])
    );

    const rows = new Map();

    submittedOrders.forEach((order) => {
      const driver = driverByVehicleId.get(order.vehicleId);
      const assignment = driver
        ? assignmentByDriverName.get(normalize(driver.name))
        : null;
      const tenant = assignment ? tenantById.get(assignment.tenantId) : null;
      const fleetName = tenant?.name || "Unmapped fleet";

      const entry = rows.get(fleetName) || {
        fleet: fleetName,
        orders: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
      };

      entry.orders += 1;
      const linked = latestApprovalByPosOrder.get(order.id);
      const approvalState = linked ? getApprovalState(linked.status) : "Pending";
      if (approvalState === "Approved") {
        entry.approved += 1;
      } else if (approvalState === "Rejected") {
        entry.rejected += 1;
      } else {
        entry.pending += 1;
      }
      rows.set(fleetName, entry);
    });

    return Array.from(rows.values())
      .map((entry) => ({
        ...entry,
        approvalRate:
          entry.orders > 0 ? Math.round((entry.approved / entry.orders) * 100) : 0,
      }))
      .sort((a, b) => b.orders - a.orders);
  }, [
    driverState.drivers,
    latestApprovalByPosOrder,
    opsState.tenantAssignments,
    opsState.tenants,
    submittedOrders,
  ]);

  const topServicedVehicles = useMemo(() => {
    const map = new Map();
    serviceOrderState.orders.forEach((order) => {
      const key = order.vehicleId || "N/A";
      const entry = map.get(key) || {
        vehicleId: key,
        vehicleModel: order.vehicleModel || "Unknown vehicle",
        services: 0,
        latestServiceAt: order.requestedAt || order.updatedAt,
      };
      entry.services += 1;
      const currentTs = toTime(order.requestedAt || order.updatedAt);
      const existingTs = toTime(entry.latestServiceAt);
      if (currentTs > existingTs) {
        entry.latestServiceAt = order.requestedAt || order.updatedAt;
      }
      map.set(key, entry);
    });
    return Array.from(map.values())
      .sort((a, b) => b.services - a.services)
      .slice(0, 8);
  }, [serviceOrderState.orders]);

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Orders per period</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersPerPeriod}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Revenue summary</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(revenueSummary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Paid revenue</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCurrency(revenueSummary.paidRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Processing revenue</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {formatCurrency(revenueSummary.processingRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Unpaid revenue</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {formatCurrency(revenueSummary.unpaidRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Avg invoice</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(revenueSummary.averageInvoice)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Rejection rate</h2>
          <p className="mt-2 text-3xl font-semibold text-rose-600">
            {rejectionRateSummary.rejectionRate}%
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Based on {rejectionRateSummary.considered} approval-linked orders.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Approved</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">
                {rejectionRateSummary.approved}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Rejected</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">
                {rejectionRateSummary.rejected}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Pending</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">
                {rejectionRateSummary.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top serviced vehicles</h2>
          <div className="mt-4 space-y-2">
            {topServicedVehicles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No service history available.
              </p>
            ) : (
              topServicedVehicles.map((vehicle) => (
                <div
                  key={vehicle.vehicleId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {vehicle.vehicleId} - {vehicle.vehicleModel}
                  </p>
                  <p className="text-slate-600">
                    Services: {vehicle.services} | Last:{" "}
                    {new Date(vehicle.latestServiceAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Fleet-wise performance</h2>
        <div className="mt-4 space-y-2">
          {fleetWisePerformance.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No fleet performance data available.
            </p>
          ) : (
            fleetWisePerformance.map((fleet) => (
              <div
                key={fleet.fleet}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{fleet.fleet}</p>
                  <p className="text-slate-600">
                    Orders {fleet.orders} | Approved {fleet.approved} | Rejected {fleet.rejected} |
                    Pending {fleet.pending}
                  </p>
                </div>
                <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  Approval rate {fleet.approvalRate}%
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

export default POSAnalyticsReportsControl;
