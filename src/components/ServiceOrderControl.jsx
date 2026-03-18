import { useMemo, useState, useSyncExternalStore } from "react";
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
  acknowledgeSettlementByFleet,
  decideServiceRequest,
  getServiceOrderState,
  setOrderLifecycleStage,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const statusTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

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

function ServiceOrderControl() {
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

  const handleDecision = (decision, manualOverride = false) => () => {
    if (!selectedOrder) {
      return;
    }
    decideServiceRequest(selectedId, {
      decision,
      approver: decisionApprover,
      note: decisionNote,
      manualOverride,
    });
    setDecisionNote("");
  };

  const handleLifecycleUpdate = () => {
    if (!selectedOrder) {
      return;
    }
    setOrderLifecycleStage(selectedId, {
      stage: lifecycleStage,
      actor: decisionApprover,
      note: lifecycleNote,
    });
    setLifecycleNote("");
  };

  const handleAcknowledgeSettlement = (orderId) => () => {
    acknowledgeSettlementByFleet(orderId, {
      actor: decisionApprover,
      note: "Invoice received from POS. Fleet confirmed completion.",
    });
  };

  return (
    <section className="space-y-6">
      <div
        className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-5 text-white shadow-lg sm:p-7 lg:block"
        // className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
          Service & Order Control
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Manage all service requests, workflow approvals, manual overrides,
          order details, lifecycle tracking, and emergency monitoring.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Emergency service monitoring
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Emergency requests</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {emergencyOrders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Active emergency</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  {activeEmergencyOrders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total requests</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {orders.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Pending approvals</p>
                <p className="mt-2 text-2xl font-semibold text-sky-700">
                  {pendingApprovalOrders.length}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {activeEmergencyOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No active emergency orders.
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
              All service requests list
            </h3>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by order, vehicle, type, requester"
                  value={searchQuery}
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
                  No service requests found.
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
                          Emergency
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
              Invoice submissions awaiting fleet confirmation
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              POS has sent invoices. Confirm from fleet side to finalize service
              completion.
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {settlementReadyOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No invoice submissions waiting for fleet confirmation.
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
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        Confirm completion
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Invoice sent by{" "}
                      {order?.settlement?.completionConfirmedBy || "POS"} on{" "}
                      {order?.settlement?.completionConfirmedAt
                        ? new Date(
                            order.settlement.completionConfirmedAt,
                          ).toLocaleString()
                        : "N/A"}
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
              View order details
            </h3>
            {selectedOrder ? (
              <div className="mt-4 grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Order ID</p>
                    <p className="font-semibold text-slate-900">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Requested at</p>
                    <p className="font-semibold text-slate-900">
                      {new Date(selectedOrder.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vehicle</p>
                    <p className="font-semibold text-slate-900">
                      {selectedOrder.vehicleId} - {selectedOrder.vehicleModel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Service type</p>
                    <p className="font-semibold text-slate-900">
                      {selectedOrder.serviceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Priority</p>
                    <p className="font-semibold text-slate-900">
                      {selectedOrder.priority}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                        selectedOrder.status,
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="mt-1 text-slate-700">
                    {selectedOrder.orderDetails.description}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <p className="text-xs text-slate-600">
                      Vendor: {selectedOrder.orderDetails.vendor}
                    </p>
                    <p className="text-xs text-slate-600">
                      Estimated: {selectedOrder.orderDetails.estimatedCost}
                    </p>
                    <p className="text-xs text-slate-600">
                      Location: {selectedOrder.orderDetails.location}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Select an order to view details.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Approval/rejection workflow
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Manual approval override is available even after
              rejection/pending.
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="approver-name">Approver</Label>
                <Input
                  id="approver-name"
                  onChange={(event) => setDecisionApprover(event.target.value)}
                  value={decisionApprover}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-note">Decision note</Label>
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
                  Approve
                </Button>
                <Button
                  disabled={decisionDisabled}
                  onClick={handleDecision("Rejected")}
                  type="button"
                  variant="destructive"
                >
                  Reject
                </Button>
                <Button
                  disabled={!selectedOrder || !decisionApprover.trim()}
                  onClick={handleDecision("Approved", true)}
                  type="button"
                  variant="outline"
                >
                  Manual approval override
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Track order lifecycle
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
                      <SelectValue placeholder="Next stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Parts ordered">
                        Parts ordered
                      </SelectItem>
                      <SelectItem value="Quality check">
                        Quality check
                      </SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    onChange={(event) => setLifecycleNote(event.target.value)}
                    placeholder="Lifecycle update note"
                    rows={2}
                    value={lifecycleNote}
                  />
                  <Button
                    onClick={handleLifecycleUpdate}
                    type="button"
                    variant="outline"
                  >
                    Update lifecycle stage
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Select an order to track lifecycle.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ServiceOrderControl;
