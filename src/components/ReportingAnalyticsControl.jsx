import { useMemo, useState, useSyncExternalStore } from "react";
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
  getVehicleState,
  subscribeVehicles,
} from "../data/vehicleStore";
import {
  getBillingFinanceState,
  subscribeBillingFinance,
} from "../data/billingFinanceStore";
import {
  getVehiclePolicyState,
  subscribeVehiclePolicies,
} from "../data/vehiclePolicyStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import {
  addReportSchedule,
  getReportingState,
  removeReportSchedule,
  subscribeReporting,
  toggleReportSchedule,
} from "../data/reportingStore";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const todayIso = () => new Date().toISOString().slice(0, 10);
const minusDaysIso = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

const parseCost = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstWord = (value) => {
  const [word] = String(value || "").trim().split(/\s+/);
  return word || "Unknown";
};

const parseDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const inRange = (value, startDate, endDate) => {
  const date = parseDateValue(value);
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!date || !start || !end) {
    return false;
  }
  const dateOnly = new Date(date.toISOString().slice(0, 10));
  const startOnly = new Date(start.toISOString().slice(0, 10));
  const endOnly = new Date(end.toISOString().slice(0, 10));
  return dateOnly >= startOnly && dateOnly <= endOnly;
};

const toArrayTotals = (items, keySelector, valueSelector) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keySelector(item);
    const value = Number(valueSelector(item)) || 0;
    map.set(key, (map.get(key) || 0) + value);
  });
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
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

const policyMatchesVehicle = (policy, vehicle) => {
  const scope = policy.appliesTo || {};
  if (scope.vehicleId && scope.vehicleId !== vehicle.id) {
    return false;
  }
  if (scope.vehicleClass && scope.vehicleClass !== vehicle.type) {
    return false;
  }
  return true;
};

const reportTypes = [
  "Service spending report",
  "Vehicle maintenance report",
  "Policy compliance report",
  "Manufacturer brand share report",
  "Workshop performance report",
];

function ReportingAnalyticsControl() {
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState
  );
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState
  );
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );
  const reportingState = useSyncExternalStore(
    subscribeReporting,
    getReportingState,
    getReportingState
  );

  const [startDate, setStartDate] = useState(minusDaysIso(30));
  const [endDate, setEndDate] = useState(todayIso());
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    reportType: "Service spending report",
    frequency: "Weekly",
    runAt: "09:00",
    recipients: "",
  });
  const [downloadMessage, setDownloadMessage] = useState("");

  const filteredInvoices = useMemo(
    () =>
      billingState.invoices.filter((invoice) =>
        inRange(invoice.date, startDate, endDate)
      ),
    [billingState.invoices, startDate, endDate]
  );

  const serviceSpending = useMemo(() => {
    const total = filteredInvoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );
    const byService = toArrayTotals(
      filteredInvoices.flatMap((invoice) => invoice.services || []),
      (serviceLine) => serviceLine.name || "Service",
      (serviceLine) => serviceLine.cost || 0
    ).slice(0, 6);
    return { total, byService };
  }, [filteredInvoices]);

  const maintenanceReport = useMemo(() => {
    const entries = vehicleState.vehicles.flatMap((vehicle) =>
      (vehicle.serviceHistory || []).map((entry) => ({
        vehicleId: vehicle.id,
        vehicleModel: vehicle.model,
        vehicleType: vehicle.type,
        date: entry.date,
        event: entry.event,
        cost: parseCost(entry.cost),
      }))
    );
    const filteredEntries = entries.filter((entry) =>
      inRange(entry.date, startDate, endDate)
    );
    const byVehicle = toArrayTotals(
      filteredEntries,
      (entry) => `${entry.vehicleId} - ${entry.vehicleModel}`,
      (entry) => entry.cost
    ).slice(0, 6);
    return {
      totalEvents: filteredEntries.length,
      totalCost: filteredEntries.reduce((sum, entry) => sum + entry.cost, 0),
      byVehicle,
    };
  }, [vehicleState.vehicles, startDate, endDate]);

  const policyCompliance = useMemo(() => {
    const latestPolicies = getLatestPolicies(policyState.policies);
    const activePolicies = latestPolicies.filter(
      (policy) => String(policy.status || "").toLowerCase() === "active"
    );

    const coveredVehicles = vehicleState.vehicles.filter((vehicle) =>
      activePolicies.some((policy) => policyMatchesVehicle(policy, vehicle))
    ).length;
    const totalVehicles = vehicleState.vehicles.length;

    const ordersInRange = serviceOrderState.orders.filter((order) =>
      inRange(order.requestedAt, startDate, endDate)
    );

    let compliant = 0;
    let nonCompliant = 0;
    let unscoped = 0;

    ordersInRange.forEach((order) => {
      const vehicle = vehicleState.vehicles.find((item) => item.id === order.vehicleId);
      if (!vehicle) {
        unscoped += 1;
        return;
      }
      const policies = activePolicies.filter((policy) =>
        policyMatchesVehicle(policy, vehicle)
      );
      if (policies.length === 0) {
        unscoped += 1;
        return;
      }
      const orderType = String(order.serviceType || "").toLowerCase();
      const matches = policies.some((policy) => {
        const allowed = Array.isArray(policy.allowedServiceTypes)
          ? policy.allowedServiceTypes
          : [];
        if (allowed.length === 0) {
          return true;
        }
        return allowed.some((type) =>
          orderType.includes(String(type || "").toLowerCase())
        );
      });
      if (matches) {
        compliant += 1;
      } else {
        nonCompliant += 1;
      }
    });

    return {
      activePolicies: activePolicies.length,
      coveredVehicles,
      totalVehicles,
      coverageRate:
        totalVehicles > 0 ? Math.round((coveredVehicles / totalVehicles) * 100) : 0,
      compliant,
      nonCompliant,
      unscoped,
    };
  }, [
    policyState.policies,
    serviceOrderState.orders,
    startDate,
    endDate,
    vehicleState.vehicles,
  ]);

  const manufacturerShare = useMemo(() => {
    const total = vehicleState.vehicles.length || 1;
    const grouped = toArrayTotals(
      vehicleState.vehicles,
      (vehicle) => firstWord(vehicle.model),
      () => 1
    );
    return grouped.map((item) => ({
      ...item,
      share: Math.round((item.value / total) * 100),
    }));
  }, [vehicleState.vehicles]);

  const workshopPerformance = useMemo(() => {
    const orders = serviceOrderState.orders.filter((order) =>
      inRange(order.requestedAt, startDate, endDate)
    );
    const map = new Map();
    orders.forEach((order) => {
      const vendor = order.orderDetails?.vendor || "Unassigned";
      const requested = parseDateValue(order.requestedAt);
      const lastLifecycle = (order.lifecycle || []).reduce((latest, entry) => {
        const current = parseDateValue(entry.time);
        if (!latest || (current && current > latest)) {
          return current;
        }
        return latest;
      }, requested);
      const turnaroundHours =
        requested && lastLifecycle
          ? Math.max(0, (lastLifecycle.getTime() - requested.getTime()) / 36e5)
          : 0;

      const current = map.get(vendor) || {
        vendor,
        totalOrders: 0,
        completedOrders: 0,
        avgTurnaroundHours: 0,
        totalTurnaroundHours: 0,
      };

      const isCompleted =
        String(order.status || "").toLowerCase().includes("completed") ||
        String(order.status || "").toLowerCase().includes("closed");

      const next = {
        ...current,
        totalOrders: current.totalOrders + 1,
        completedOrders: current.completedOrders + (isCompleted ? 1 : 0),
        totalTurnaroundHours: current.totalTurnaroundHours + turnaroundHours,
      };
      map.set(vendor, next);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avgTurnaroundHours:
          item.totalOrders > 0
            ? Math.round(item.totalTurnaroundHours / item.totalOrders)
            : 0,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }, [serviceOrderState.orders, startDate, endDate]);

  const handleAddSchedule = () => {
    if (!scheduleForm.name.trim()) {
      return;
    }
    addReportSchedule({
      name: scheduleForm.name,
      reportType: scheduleForm.reportType,
      frequency: scheduleForm.frequency,
      runAt: scheduleForm.runAt,
      recipients: scheduleForm.recipients,
      active: true,
    });
    setScheduleForm((prev) => ({
      ...prev,
      name: "",
      recipients: "",
    }));
  };

  const summaryPayload = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      serviceSpendingReports: serviceSpending,
      vehicleMaintenanceReports: maintenanceReport,
      policyComplianceReports: policyCompliance,
      manufacturerBrandShareReport: manufacturerShare,
      workshopPerformanceReport: workshopPerformance,
      scheduledRecurringReports: reportingState.schedules,
    }),
    [
      endDate,
      maintenanceReport,
      manufacturerShare,
      policyCompliance,
      reportingState.schedules,
      serviceSpending,
      startDate,
      workshopPerformance,
    ]
  );

  const downloadFile = (content, filename, mimeType) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      setDownloadMessage("Download is available in browser runtime only.");
      return;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonReport = () => {
    downloadFile(
      JSON.stringify(summaryPayload, null, 2),
      `reporting-analytics-${todayIso()}.json`,
      "application/json"
    );
    setDownloadMessage("JSON report downloaded.");
  };

  const handleDownloadCsvReport = () => {
    const lines = [
      "invoice_id,date,order_id,vehicle_id,driver,location,status,total_amount",
      ...filteredInvoices.map((invoice) =>
        [
          invoice.id,
          invoice.date,
          invoice.orderId,
          invoice.vehicleId,
          invoice.driverName,
          invoice.location,
          invoice.status,
          invoice.totalAmount,
        ]
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    downloadFile(
      lines.join("\n"),
      `reporting-invoices-${todayIso()}.csv`,
      "text/csv"
    );
    setDownloadMessage("CSV report downloaded.");
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Reporting & Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Service spending, maintenance, compliance, brand share, workshop
              performance, scheduling, and downloadable analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setStartDate(minusDaysIso(7))} type="button" variant="outline">
              Last 7 days
            </Button>
            <Button onClick={() => setStartDate(minusDaysIso(30))} type="button" variant="outline">
              Last 30 days
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="report-start-date">Custom date range start</Label>
            <Input
              id="report-start-date"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-end-date">Custom date range end</Label>
            <Input
              id="report-end-date"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Reports span</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {startDate} to {endDate}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Invoices in range</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {filteredInvoices.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Service spending reports
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Total spend in selected range: {formatCurrency(serviceSpending.total)}
          </p>
          <div className="mt-4 space-y-2">
            {serviceSpending.byService.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No service spending data in this range.
              </p>
            ) : (
              serviceSpending.byService.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <p className="font-semibold text-slate-800">{entry.key}</p>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(entry.value)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Vehicle maintenance reports
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Maintenance events</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {maintenanceReport.totalEvents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Estimated maintenance cost</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(maintenanceReport.totalCost)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {maintenanceReport.byVehicle.slice(0, 5).map((entry) => (
              <div
                key={entry.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800">{entry.key}</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(entry.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Policy compliance reports
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Active policies</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {policyCompliance.activePolicies}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Vehicle coverage</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {policyCompliance.coverageRate}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Compliant orders</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {policyCompliance.compliant}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            Non-compliant: {policyCompliance.nonCompliant} | Unscoped orders:{" "}
            {policyCompliance.unscoped}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Manufacturer brand share report
          </h3>
          <div className="mt-4 space-y-2">
            {manufacturerShare.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No vehicle brand data available.
              </p>
            ) : (
              manufacturerShare.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{entry.key}</p>
                    <p className="font-semibold text-slate-900">{entry.share}%</p>
                  </div>
                  <p className="mt-1 text-slate-600">{entry.value} vehicles</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Workshop performance report
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {workshopPerformance.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No workshop orders in this range.
            </p>
          ) : (
            workshopPerformance.map((item) => (
              <div
                key={item.vendor}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800">{item.vendor}</p>
                <p className="mt-1 text-slate-600">Orders: {item.totalOrders}</p>
                <p className="mt-1 text-slate-600">
                  Completed: {item.completedOrders}
                </p>
                <p className="mt-1 text-slate-600">
                  Avg turnaround: {item.avgTurnaroundHours}h
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Scheduled recurring reports
          </h3>
          <div className="mt-4 space-y-2">
            {reportingState.schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{schedule.name}</p>
                    <p className="text-slate-600">
                      {schedule.reportType} | {schedule.frequency} at {schedule.runAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleReportSchedule(schedule.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {schedule.active ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      onClick={() => removeReportSchedule(schedule.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-slate-600">
                  Recipients:{" "}
                  {schedule.recipients.length > 0
                    ? schedule.recipients.join(", ")
                    : "None"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
            <Input
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Schedule name"
              value={scheduleForm.name}
            />
            <Select
              onValueChange={(value) =>
                setScheduleForm((prev) => ({ ...prev, reportType: value }))
              }
              value={scheduleForm.reportType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({ ...prev, frequency: value }))
                }
                value={scheduleForm.frequency}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Input
                onChange={(event) =>
                  setScheduleForm((prev) => ({ ...prev, runAt: event.target.value }))
                }
                type="time"
                value={scheduleForm.runAt}
              />
            </div>
            <Textarea
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  recipients: event.target.value,
                }))
              }
              placeholder="Recipients (comma separated emails)"
              rows={2}
              value={scheduleForm.recipients}
            />
            <Button onClick={handleAddSchedule} type="button" variant="outline">
              Add recurring schedule
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Downloadable reports
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Download full analytics pack (JSON) or invoice slice (CSV) for the
            selected custom date range.
          </p>

          <div className="mt-4 grid gap-3">
            <Button onClick={handleDownloadJsonReport} type="button">
              Download report pack (JSON)
            </Button>
            <Button onClick={handleDownloadCsvReport} type="button" variant="outline">
              Download invoice report (CSV)
            </Button>
            {downloadMessage ? (
              <p className="text-sm text-slate-600">{downloadMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReportingAnalyticsControl;
