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
  decideServiceRequest,
  getServiceOrderState,
  setOrderLifecycleStage,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

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
      if (statusFilter !== "all" && order.status !== statusFilter) {
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

  const decisionDisabled =
    !selectedOrder ||
    !decisionApprover.trim() ||
    !String(selectedOrder.status || "").toLowerCase().includes("pending");

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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Service & Order Control
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage all service requests, workflow approvals, manual overrides, order
          details, lifecycle tracking, and emergency monitoring.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Emergency service monitoring
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order, vehicle, type, requester"
                value={searchQuery}
              />
              <Select onValueChange={setStatusFilter} value={statusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Array.from(new Set(orders.map((order) => order.status))).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 space-y-3">
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
                        {order.vehicleId} | {order.serviceType} | {order.requestedBy}
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
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">View order details</h3>
            {selectedOrder ? (
              <div className="mt-4 grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Order ID</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.id}</p>
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
                    <p className="font-semibold text-slate-900">{selectedOrder.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                        selectedOrder.status
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
              <p className="mt-4 text-sm text-slate-500">Select an order to view details.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Approval/rejection workflow
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Manual approval override is available even after rejection/pending.
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
                <div className="space-y-2">
                  {selectedOrder.lifecycle.map((entry, index) => (
                    <div
                      key={`${selectedOrder.id}-lifecycle-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900">{entry.stage}</p>
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
                  <Select onValueChange={setLifecycleStage} value={lifecycleStage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Next stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Parts ordered">Parts ordered</SelectItem>
                      <SelectItem value="Quality check">Quality check</SelectItem>
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
                  <Button onClick={handleLifecycleUpdate} type="button" variant="outline">
                    Update lifecycle stage
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select an order to track lifecycle.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ServiceOrderControl;
