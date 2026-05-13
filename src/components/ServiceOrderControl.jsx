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
  getServiceOrderState,
  setServiceOrdersFromApi,
  subscribeServiceOrders,
  upsertServiceOrderFromApi,
} from "../data/serviceOrderStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  acknowledgeFleetServiceOrderSettlementApi,
  decideFleetServiceOrderApi,
  listFleetServiceOrdersApi,
  updateFleetServiceOrderLifecycleApi,
} from "../services/fleetServiceOrderApi";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const matchesStatusFilter = (status, filterKey) => {
  const normalized = normalizeStatus(status);
  if (filterKey === "all") {
    return true;
  }
  if (filterKey === "pending") {
    return normalized.includes("pending");
  }
  if (filterKey === "approved") {
    return normalized.includes("approved");
  }
  if (filterKey === "rejected") {
    return normalized.includes("rejected");
  }
  if (filterKey === "in_progress") {
    return normalized.includes("progress") || normalized.includes("invoice");
  }
  if (filterKey === "completed") {
    return normalized.includes("completed") || normalized.includes("closed");
  }
  return false;
};

const statusClassName = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("approved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("rejected")) {
    return "bg-rose-100 text-rose-700";
  }
  if (normalized.includes("progress")) {
    return "bg-sky-100 text-sky-700";
  }
  if (normalized.includes("invoice")) {
    return "bg-indigo-100 text-indigo-700";
  }
  if (normalized.includes("pending")) {
    return "bg-amber-100 text-amber-700";
  }
  if (normalized.includes("completed") || normalized.includes("closed")) {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-slate-100 text-slate-700";
};

const parseTechnicalNotes = (notes) => {
  const raw = String(notes || "").trim();
  if (!raw) {
    return [];
  }
  return raw
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, index) => {
      const colonIndex = segment.indexOf(":");
      if (colonIndex > 0) {
        return {
          id: `note-${index}`,
          key: segment.slice(0, colonIndex).trim(),
          value: segment.slice(colonIndex + 1).trim() || "N/A",
        };
      }
      return {
        id: `note-${index}`,
        key: "Note",
        value: segment,
      };
    });
};

const highlightTechnicalNoteKeys = new Set([
  "tenant",
  "category",
  "subcategory",
  "routing",
  "booking mode",
  "policy check",
  "preferred date",
  "preferred slot",
  "tyre supply",
]);

function ServiceOrderControl() {
  const { t } = useTranslation();
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionApprover, setDecisionApprover] = useState("Operations Lead");
  const [lifecycleStage, setLifecycleStage] = useState("In progress");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [serviceOrderApiLoading, setServiceOrderApiLoading] = useState(false);
  const [serviceOrderApiSaving, setServiceOrderApiSaving] = useState(false);
  const [serviceOrderApiError, setServiceOrderApiError] = useState("");
  const serviceOrdersInitRef = useRef(false);
  const statusTabs = [
    { key: "all", label: t("fleet.serviceOrder.all", "All") },
    { key: "pending", label: t("fleet.serviceOrder.pending", "Pending") },
    { key: "approved", label: t("fleet.serviceOrder.approved", "Approved") },
    { key: "rejected", label: t("fleet.serviceOrder.rejected", "Rejected") },
    { key: "in_progress", label: t("fleet.serviceOrder.inProgress", "In progress") },
    { key: "completed", label: t("fleet.serviceOrder.completed", "Completed") },
  ];

  useEffect(() => {
    if (serviceOrdersInitRef.current) return;
    serviceOrdersInitRef.current = true;

    let ignore = false;

    const run = async () => {
      setServiceOrderApiLoading(true);
      setServiceOrderApiError("");
      try {
        const rows = await listFleetServiceOrdersApi();
        if (ignore) return;
        setServiceOrdersFromApi(rows);
      } catch (error) {
        if (ignore) return;
        setServiceOrderApiError(error?.message || "Unable to load service orders from backend. Showing local data.");
      } finally {
        if (!ignore) setServiceOrderApiLoading(false);
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, []);

  const orders = useMemo(
    () =>
      [...serviceOrderState.orders].sort((a, b) => {
        const timeA = new Date(a.requestedAt).getTime() || 0;
        const timeB = new Date(b.requestedAt).getTime() || 0;
        return timeB - timeA;
      }),
    [serviceOrderState.orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!matchesStatusFilter(order.status, statusFilter)) {
        return false;
      }
      if (!searchQuery.trim()) {
        return true;
      }
      const blob = [
        order.id,
        order.vehicleId,
        order.vehicleModel,
        order.requestTitle,
        order.serviceType,
        order.status,
        order.requestedBy,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(searchQuery.trim().toLowerCase());
    });
  }, [orders, searchQuery, statusFilter]);

  const statusTabCounts = useMemo(() => {
    return statusTabs.reduce((acc, tab) => {
      acc[tab.key] = orders.filter((order) =>
        matchesStatusFilter(order.status, tab.key)
      ).length;
      return acc;
    }, {});
  }, [orders]);

  const selectedOrder = useMemo(() => {
    const explicit = orders.find((order) => order.id === selectedOrderId);
    if (explicit) {
      return explicit;
    }
    return filteredOrders[0] || null;
  }, [filteredOrders, orders, selectedOrderId]);

  const selectedId = selectedOrder?.id || "";
  const technicalNoteItems = useMemo(
    () => parseTechnicalNotes(selectedOrder?.orderDetails?.notes),
    [selectedOrder?.orderDetails?.notes],
  );
  const highlightedTechnicalNotes = useMemo(
    () =>
      technicalNoteItems.filter((item) =>
        highlightTechnicalNoteKeys.has(String(item.key || "").toLowerCase()),
      ),
    [technicalNoteItems],
  );
  const detailedTechnicalNotes = useMemo(
    () =>
      technicalNoteItems.filter(
        (item) =>
          !highlightTechnicalNoteKeys.has(String(item.key || "").toLowerCase()),
      ),
    [technicalNoteItems],
  );

  const emergencyOrders = useMemo(
    () => orders.filter((order) => order.emergency),
    [orders]
  );

  const activeEmergencyOrders = emergencyOrders.filter((order) => {
    const normalized = String(order.status || "").toLowerCase();
    return (
      !normalized.includes("rejected") &&
      !normalized.includes("completed") &&
      !normalized.includes("closed")
    );
  });

  const pendingApprovalOrders = useMemo(
    () =>
      orders.filter((order) =>
        String(order.status || "").toLowerCase().includes("pending")
      ),
    [orders]
  );

  const decisionDisabled =
    serviceOrderApiSaving ||
    !selectedOrder ||
    !decisionApprover.trim() ||
    !String(selectedOrder.status || "").toLowerCase().includes("pending");

  const settlementReadyOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order?.settlement?.readyForSettlement &&
          !String(order?.settlement?.fleetAcknowledgedAt || "").trim()
      ),
    [orders]
  );

  const handleDecision = (decision, manualOverride = false) => async () => {
    if (!selectedOrder) {
      return;
    }

    setServiceOrderApiSaving(true);
    setServiceOrderApiError("");
    try {
      const updated = await decideFleetServiceOrderApi(selectedId, {
        decision,
        approver: decisionApprover,
        note: decisionNote,
        manualOverride,
      });
      upsertServiceOrderFromApi(updated);
      setDecisionNote("");
    } catch (error) {
      setServiceOrderApiError(error?.message || "Unable to update service order decision.");
    } finally {
      setServiceOrderApiSaving(false);
    }
  };

  const handleLifecycleUpdate = async () => {
    if (!selectedOrder) {
      return;
    }

    setServiceOrderApiSaving(true);
    setServiceOrderApiError("");
    try {
      const updated = await updateFleetServiceOrderLifecycleApi(selectedId, {
        stage: lifecycleStage,
        actor: decisionApprover,
        note: lifecycleNote,
      });
      upsertServiceOrderFromApi(updated);
      setLifecycleNote("");
    } catch (error) {
      setServiceOrderApiError(error?.message || "Unable to update lifecycle stage.");
    } finally {
      setServiceOrderApiSaving(false);
    }
  };

  const handleAcknowledgeSettlement = (orderId) => async () => {
    setServiceOrderApiSaving(true);
    setServiceOrderApiError("");
    try {
      const updated = await acknowledgeFleetServiceOrderSettlementApi(orderId, {
        actor: decisionApprover,
        note: t("fleet.serviceOrder.invoiceReceivedNote", "Invoice received from POS. Fleet confirmed completion."),
      });
      upsertServiceOrderFromApi(updated);
    } catch (error) {
      setServiceOrderApiError(error?.message || "Unable to acknowledge settlement.");
    } finally {
      setServiceOrderApiSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div
        className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-5 text-white shadow-lg sm:p-7 lg:block"
        // className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
          {t("fleet.menu.service_order_control", "Service & Order Control")}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {t("fleet.serviceOrder.headerDesc", "Manage all service requests, workflow approvals, manual overrides, order details, lifecycle tracking, and emergency monitoring.")}
        </p>
      </div>

      {serviceOrderApiError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serviceOrderApiError}
        </div>
      ) : null}

      {serviceOrderApiLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Loading service orders from backend...
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.emergencyServiceMonitoring", "Emergency service monitoring")}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t("fleet.serviceOrder.emergencyRequests", "Emergency requests")}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {emergencyOrders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t("fleet.serviceOrder.activeEmergency", "Active emergency")}</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  {activeEmergencyOrders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t("fleet.serviceOrder.totalRequests", "Total requests")}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {orders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t("fleet.serviceOrder.pendingApprovals", "Pending approvals")}</p>
                <p className="mt-2 text-2xl font-semibold text-sky-700">
                  {pendingApprovalOrders.length}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {activeEmergencyOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  {t("fleet.serviceOrder.noActiveEmergencyOrders", "No active emergency orders.")}
                </p>
              ) : (
                activeEmergencyOrders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs"
                  >
                    <p className="font-semibold text-rose-700">
                      {order.id} - {order.requestTitle}
                    </p>
                    <p className="mt-1 text-rose-600">
                      {order.vehicleId} | {order.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.allServiceRequestsList", "All service requests list")}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("fleet.serviceOrder.searchPlaceholder", "Search by order, vehicle, type, requester")}
                  value={searchQuery}
                />
                {searchQuery ? (
                  <button
                    aria-label={t("driver.request.clearSearch", "Clear search")}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {statusTabs.map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label} ({statusTabCounts[tab.key] || 0})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-list-scrollbar mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  {t("fleet.serviceOrder.noServiceRequestsFound", "No service requests found.")}
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          {order.id} - {order.requestTitle}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isSelected
                              ? "bg-white/10 text-white"
                              : statusClassName(order.status)
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-80">
                        {order.vehicleId} | {order.serviceType} |{" "}
                        {order.requestedBy}
                      </p>
                      {order.emergency ? (
                        <p className="mt-1 text-xs font-semibold text-rose-300">
                          {t("driver.request.emergency", "Emergency")}
                        </p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.invoiceSubmissionsAwaitingConfirmation", "Invoice submissions awaiting fleet confirmation")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("fleet.serviceOrder.invoiceSubmissionsDesc", "POS has sent invoices. Confirm from fleet side to finalize service completion.")}
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {settlementReadyOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  {t("fleet.serviceOrder.noInvoiceSubmissions", "No invoice submissions waiting for fleet confirmation.")}
                </p>
              ) : (
                settlementReadyOrders.map((order) => (
                  <div
                    key={`settlement-ready-${order.id}`}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-emerald-900">
                        {order.id} - {order.requestTitle}
                      </p>
                      <Button
                        onClick={handleAcknowledgeSettlement(order.id)}
                        disabled={serviceOrderApiSaving}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        {t("fleet.notifications.confirmCompletion", "Confirm completion")}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      {t("fleet.serviceOrder.invoiceSentBy", "Invoice sent by")}{" "}
                      {order?.settlement?.completionConfirmedBy || "POS"} {t("fleet.serviceOrder.on", "on")}{" "}
                      {order?.settlement?.completionConfirmedAt
                        ? new Date(
                            order.settlement.completionConfirmedAt,
                          ).toLocaleString()
                        : t("common.notAvailable", "N/A")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.viewOrderDetails", "View order details")}
            </h3>
            {selectedOrder ? (
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("fleet.serviceOrder.orderId", "Order ID")}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOrder.id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("fleet.serviceOrder.requestedAt", "Requested at")}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {new Date(selectedOrder.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("fleet.serviceOrder.priority", "Priority")}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOrder.priority}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("fleet.serviceOrder.status", "Status")}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                        selectedOrder.status,
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.serviceOrder.serviceContext", "Service context")}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.vehicle", "Vehicle")}: </span>
                      <span className="font-semibold">{selectedOrder.vehicleId}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.model", "Model")}: </span>
                      <span className="font-semibold">{selectedOrder.vehicleModel || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.requestedBy", "Requested by")}: </span>
                      <span className="font-semibold">{selectedOrder.requestedBy || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.serviceType", "Service type")}: </span>
                      <span className="font-semibold">{selectedOrder.serviceType || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.route", "Route")}: </span>
                      <span className="font-semibold">
                        {selectedOrder.orderDetails?.routeTo === "fleet-only"
                          ? t("fleet.serviceOrder.directFleet", "Direct fleet")
                          : t("fleet.serviceOrder.posFlow", "POS flow")}
                      </span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("driver.request.emergency", "Emergency")}: </span>
                      <span className={`font-semibold ${selectedOrder.emergency ? "text-rose-700" : "text-slate-900"}`}>
                        {selectedOrder.emergency
                          ? t("common.yes", "Yes")
                          : t("common.no", "No")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.serviceOrder.requestDetails", "Request details")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {selectedOrder.orderDetails?.description || t("common.notAvailable", "N/A")}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.vendor", "Vendor")}: </span>
                      <span className="font-semibold">{selectedOrder.orderDetails?.vendor || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.estimated", "Estimated")}: </span>
                      <span className="font-semibold">{selectedOrder.orderDetails?.estimatedCost || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.location", "Location")}: </span>
                      <span className="font-semibold">{selectedOrder.orderDetails?.location || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <span className="text-slate-500">{t("driver.request.odometer", "Odometer")}: </span>
                      <span className="font-semibold">
                        {selectedOrder.orderDetails?.odometerReading !== null &&
                        selectedOrder.orderDetails?.odometerReading !== undefined
                          ? `${Number(selectedOrder.orderDetails.odometerReading).toLocaleString()} ${selectedOrder.orderDetails?.odometerUnit || "km"}`
                          : t("common.notAvailable", "N/A")}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedOrder.orderDetails?.recommendation ? (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                        {t("fleet.serviceOrder.odometerRecommendation", "Odometer recommendation")}
                      </p>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        {selectedOrder.orderDetails.recommendation.level || "low"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedOrder.orderDetails.recommendation.title || "Recommendation"}
                    </p>
                    {selectedOrder.orderDetails.recommendation.summary ? (
                      <p className="mt-1 text-xs text-slate-700">
                        {selectedOrder.orderDetails.recommendation.summary}
                      </p>
                    ) : null}
                    {selectedOrder.orderDetails.recommendation.suggestion ? (
                      <p className="mt-1 text-xs text-slate-700">
                        {selectedOrder.orderDetails.recommendation.suggestion}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-700">
                      <span className="text-slate-500">{t("fleet.serviceOrder.driverAccepted", "Driver accepted")}: </span>
                      <span className="font-semibold">
                        {selectedOrder.orderDetails.recommendationAccepted
                          ? t("common.yes", "Yes")
                          : t("common.no", "No")}
                      </span>
                    </p>
                  </div>
                ) : null}

                {selectedOrder.approval?.decision ||
                selectedOrder.approval?.approver ||
                selectedOrder.approval?.note ||
                selectedOrder.approval?.decidedAt ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("fleet.serviceOrder.approvalDetails", "Approval details")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.decision", "Decision")}: </span>
                        <span className="font-semibold">{selectedOrder.approval?.decision || "N/A"}</span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.approver", "Approver")}: </span>
                        <span className="font-semibold">{selectedOrder.approval?.approver || "N/A"}</span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.manualOverride", "Manual override")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.approval?.manualOverride
                            ? t("common.yes", "Yes")
                            : t("common.no", "No")}
                        </span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.decidedAt", "Decided at")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.approval?.decidedAt
                            ? new Date(selectedOrder.approval.decidedAt).toLocaleString()
                            : "N/A"}
                        </span>
                      </p>
                    </div>
                    {selectedOrder.approval?.note ? (
                      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        {selectedOrder.approval.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedOrder.appointment?.dateTime ||
                selectedOrder.appointment?.confirmedBy ||
                selectedOrder.appointment?.note ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("fleet.serviceOrder.appointment", "Appointment")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.dateTime", "Date & time")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.appointment?.dateTime
                            ? new Date(selectedOrder.appointment.dateTime).toLocaleString()
                            : "N/A"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.confirmedBy", "Confirmed by")}: </span>
                        <span className="font-semibold">{selectedOrder.appointment?.confirmedBy || "N/A"}</span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.calendarChecked", "Calendar checked")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.appointment?.calendarChecked
                            ? t("common.yes", "Yes")
                            : t("common.no", "No")}
                        </span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.stockChecked", "Stock checked")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.appointment?.stockChecked
                            ? t("common.yes", "Yes")
                            : t("common.no", "No")}
                        </span>
                      </p>
                    </div>
                    {selectedOrder.appointment?.note ? (
                      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        {selectedOrder.appointment.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedOrder.checkIn?.checkedInAt ||
                selectedOrder.checkIn?.checkedInBy ||
                selectedOrder.checkIn?.odometerReading !== null ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("fleet.serviceOrder.posCheckIn", "POS check-in")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.checkedInAt", "Checked in at")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.checkIn?.checkedInAt
                            ? new Date(selectedOrder.checkIn.checkedInAt).toLocaleString()
                            : "N/A"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.checkedInBy", "Checked in by")}: </span>
                        <span className="font-semibold">{selectedOrder.checkIn?.checkedInBy || "N/A"}</span>
                      </p>
                      <p className="text-xs text-slate-700">
                        <span className="text-slate-500">{t("fleet.serviceOrder.verifiedOdometer", "Verified odometer")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.checkIn?.odometerReading !== null &&
                          selectedOrder.checkIn?.odometerReading !== undefined
                            ? `${Number(selectedOrder.checkIn.odometerReading).toLocaleString()} ${selectedOrder.checkIn?.odometerUnit || "km"}`
                            : "N/A"}
                        </span>
                      </p>
                    </div>
                    {selectedOrder.checkIn?.note ? (
                      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        {selectedOrder.checkIn.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedOrder.settlement?.completionConfirmedAt ||
                selectedOrder.settlement?.fleetAcknowledgedAt ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {t("fleet.serviceOrder.settlement", "Settlement")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="text-xs text-emerald-800">
                        <span className="text-emerald-700">{t("fleet.serviceOrder.completionConfirmedBy", "Completion confirmed by")}: </span>
                        <span className="font-semibold">{selectedOrder.settlement?.completionConfirmedBy || "N/A"}</span>
                      </p>
                      <p className="text-xs text-emerald-800">
                        <span className="text-emerald-700">{t("fleet.serviceOrder.completionConfirmedAt", "Completion confirmed at")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.settlement?.completionConfirmedAt
                            ? new Date(selectedOrder.settlement.completionConfirmedAt).toLocaleString()
                            : "N/A"}
                        </span>
                      </p>
                      <p className="text-xs text-emerald-800">
                        <span className="text-emerald-700">{t("fleet.serviceOrder.fleetAcknowledgedBy", "Fleet acknowledged by")}: </span>
                        <span className="font-semibold">{selectedOrder.settlement?.fleetAcknowledgedBy || "N/A"}</span>
                      </p>
                      <p className="text-xs text-emerald-800">
                        <span className="text-emerald-700">{t("fleet.serviceOrder.fleetAcknowledgedAt", "Fleet acknowledged at")}: </span>
                        <span className="font-semibold">
                          {selectedOrder.settlement?.fleetAcknowledgedAt
                            ? new Date(selectedOrder.settlement.fleetAcknowledgedAt).toLocaleString()
                            : "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : null}

                {selectedOrder.orderDetails?.notes ? (
                  <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white via-violet-50/45 to-indigo-50/40 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                        {t("fleet.serviceOrder.technicalNotes", "Technical notes")}
                      </p>
                      <span className="rounded-full border border-violet-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                        {technicalNoteItems.length} fields
                      </span>
                    </div>

                    {highlightedTechnicalNotes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {highlightedTechnicalNotes.map((item) => (
                          <div
                            key={`highlight-${item.id}`}
                            className="rounded-full border border-violet-200 bg-violet-100/70 px-2.5 py-1 text-[11px] text-violet-900"
                          >
                            <span className="font-semibold">{item.key}</span>:{" "}
                            <span className="font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {detailedTechnicalNotes.length > 0 ? (
                      <div className="card-list-scrollbar mt-3 grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {detailedTechnicalNotes.map((item) => {
                          const isLongValue =
                            item.value.length > 140 || item.value.includes(";");
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {item.key}
                              </p>
                              <p
                                className={`mt-1 break-words text-xs text-slate-700 ${
                                  isLongValue
                                    ? "card-list-scrollbar max-h-24 overflow-y-auto pr-1"
                                    : ""
                                }`}
                              >
                                {item.value}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs text-slate-700">
                        {selectedOrder.orderDetails.notes}
                      </div>
                    )}
                  </div>
                ) : null}

                {Array.isArray(selectedOrder.orderDetails?.attachments) &&
                selectedOrder.orderDetails.attachments.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("fleet.serviceOrder.attachedPhotos", "Attached photos")}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {selectedOrder.orderDetails.attachments.length}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selectedOrder.orderDetails.attachments.map((attachment) => (
                        <div
                          key={`${selectedOrder.id}-${attachment.id || attachment.name}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                        >
                          <p
                            className="truncate text-xs font-semibold text-slate-800"
                            title={attachment.name}
                          >
                            {attachment.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {Math.max(1, Math.round((attachment.size || 0) / 1024))} KB
                          </p>
                          <Button
                            className="mt-2 h-7 text-xs"
                            onClick={() => setPreviewAttachment(attachment)}
                            type="button"
                            variant="outline"
                          >
                            {t("pos.order.view", "View")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {t("fleet.serviceOrder.selectOrderToView", "Select an order to view details.")}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.approvalRejectionWorkflow", "Approval/rejection workflow")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("fleet.serviceOrder.approvalRejectionDesc", "Manual approval override is available even after rejection/pending.")}
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="approver-name">{t("fleet.serviceOrder.approver", "Approver")}</Label>
                <Input
                  id="approver-name"
                  onChange={(event) => setDecisionApprover(event.target.value)}
                  value={decisionApprover}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-note">{t("fleet.serviceOrder.decisionNote", "Decision note")}</Label>
                <Textarea
                  id="decision-note"
                  onChange={(event) => setDecisionNote(event.target.value)}
                  rows={3}
                  value={decisionNote}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={decisionDisabled}
                  onClick={handleDecision("Approved")}
                  type="button"
                >
                  {t("fleet.serviceOrder.approve", "Approve")}
                </Button>
                <Button
                  disabled={decisionDisabled}
                  onClick={handleDecision("Rejected")}
                  type="button"
                  variant="destructive"
                >
                  {t("fleet.serviceOrder.reject", "Reject")}
                </Button>
                <Button
                  disabled={serviceOrderApiSaving || !selectedOrder || !decisionApprover.trim()}
                  onClick={handleDecision("Approved", true)}
                  type="button"
                  variant="outline"
                >
                  {t("fleet.serviceOrder.manualApprovalOverride", "Manual approval override")}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("fleet.serviceOrder.trackOrderLifecycle", "Track order lifecycle")}
            </h3>
            {selectedOrder ? (
              <div className="mt-4 grid gap-4">
                <div className="card-list-scrollbar max-h-[20rem] space-y-2 overflow-y-auto pr-1">
                  {selectedOrder.lifecycle.map((entry, index) => (
                    <div
                      key={`${selectedOrder.id}-lifecycle-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.stage}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {new Date(entry.time).toLocaleString()} | {entry.actor}
                      </p>
                      {entry.note ? (
                        <p className="mt-1 text-slate-600">{entry.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 border-t border-slate-200 pt-3">
                  <Select
                    onValueChange={setLifecycleStage}
                    value={lifecycleStage}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("fleet.serviceOrder.nextStage", "Next stage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In progress">{t("fleet.serviceOrder.inProgress", "In progress")}</SelectItem>
                      <SelectItem value="Parts ordered">{t("fleet.serviceOrder.partsOrdered", "Parts ordered")}</SelectItem>
                      <SelectItem value="Quality check">{t("fleet.serviceOrder.qualityCheck", "Quality check")}</SelectItem>
                      <SelectItem value="Completed">{t("fleet.serviceOrder.completed", "Completed")}</SelectItem>
                      <SelectItem value="Closed">{t("fleet.serviceOrder.closed", "Closed")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    onChange={(event) => setLifecycleNote(event.target.value)}
                    placeholder={t("fleet.serviceOrder.lifecycleUpdateNote", "Lifecycle update note")}
                    rows={2}
                    value={lifecycleNote}
                  />
                  <Button
                    onClick={handleLifecycleUpdate}
                    disabled={serviceOrderApiSaving}
                    type="button"
                    variant="outline"
                  >
                    {t("fleet.serviceOrder.updateLifecycleStage", "Update lifecycle stage")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {t("fleet.serviceOrder.selectOrderToTrack", "Select an order to track lifecycle.")}
              </p>
            )}
          </div>
        </div>
      </div>
      {previewAttachment ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {previewAttachment.name || t("fleet.serviceOrder.attachment", "Attachment")}
                </p>
                <p className="text-xs text-slate-500">
                  {Math.max(1, Math.round((previewAttachment.size || 0) / 1024))} KB
                </p>
              </div>
              <Button
                onClick={() => setPreviewAttachment(null)}
                type="button"
                variant="outline"
              >
                {t("driver.request.close", "Close")}
              </Button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                alt={previewAttachment.name || t("fleet.serviceOrder.attachmentPreview", "Attachment preview")}
                className="max-h-[65vh] w-full object-contain"
                src={previewAttachment.dataUrl}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ServiceOrderControl;












