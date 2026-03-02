import { useMemo, useState, useSyncExternalStore } from "react";
import { Clock3, FileText, History, Send, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { getPosOrderState, subscribePosOrders } from "../data/posOrderStore";
import {
  createServiceRequest,
  getServiceOrderState,
  setOrderLifecycleStage,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

const normalize = (value) => String(value || "").trim().toLowerCase();

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  if (raw.includes("re-submit") || raw.includes("resubmit")) {
    return "Re-submitted";
  }
  if (raw.includes("pending")) {
    return "Pending approval";
  }
  return "In review";
};

const formatDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeClass = (status) => {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Rejected") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "Pending approval") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Re-submitted") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-slate-200 text-slate-700";
};

function POSApprovalWorkflowControl({ vehicles = [], session = null }) {
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

  const [selectedPosOrderId, setSelectedPosOrderId] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [selectedApprovalRequestId, setSelectedApprovalRequestId] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    posOrderId: "",
    requestId: "",
  });
  const [feedback, setFeedback] = useState("");

  const submittedOrders = useMemo(
    () => posOrderState.submittedOrders,
    [posOrderState.submittedOrders]
  );

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const approvalRequests = useMemo(
    () =>
      serviceOrderState.orders
        .map((order) => ({
          ...order,
          posOrderId: extractPosOrderId(order),
        }))
        .filter((order) => order.posOrderId)
        .sort((a, b) => {
          const ta = new Date(a.updatedAt || a.requestedAt).getTime() || 0;
          const tb = new Date(b.updatedAt || b.requestedAt).getTime() || 0;
          return tb - ta;
        }),
    [serviceOrderState.orders]
  );

  const latestRequestByOrderId = useMemo(() => {
    const map = new Map();
    approvalRequests.forEach((request) => {
      if (!map.has(request.posOrderId)) {
        map.set(request.posOrderId, request);
      }
    });
    return map;
  }, [approvalRequests]);

  const posOrderStatusRows = useMemo(
    () =>
      submittedOrders.map((order) => {
        const latest = latestRequestByOrderId.get(order.id) || null;
        return {
          id: order.id,
          serviceType: order.serviceType,
          total: order.total,
          status: latest ? getApprovalState(latest.status) : "Not requested",
          requestId: latest?.id || "",
          requestedAt: latest?.requestedAt || "",
        };
      }),
    [latestRequestByOrderId, submittedOrders]
  );

  const selectedPosOrder =
    submittedOrders.find(
      (order) => order.id === (selectedPosOrderId || submittedOrders[0]?.id || "")
    ) || null;

  const selectedApprovalRequest = useMemo(
    () =>
      approvalRequests.find(
        (request) =>
          request.id ===
          (selectedApprovalRequestId || latestRequestByOrderId.get(selectedPosOrder?.id)?.id || "")
      ) || null,
    [
      approvalRequests,
      latestRequestByOrderId,
      selectedApprovalRequestId,
      selectedPosOrder?.id,
    ]
  );

  const statusSummary = useMemo(
    () =>
      approvalRequests.reduce(
        (acc, request) => {
          const state = getApprovalState(request.status);
          if (state === "Pending approval") {
            acc.pending += 1;
          } else if (state === "Approved") {
            acc.approved += 1;
          } else if (state === "Rejected") {
            acc.rejected += 1;
          } else if (state === "Re-submitted") {
            acc.resubmitted += 1;
          } else {
            acc.review += 1;
          }
          return acc;
        },
        {
          pending: 0,
          approved: 0,
          rejected: 0,
          resubmitted: 0,
          review: 0,
        }
      ),
    [approvalRequests]
  );

  const sendApprovalRequest = () => {
    if (!selectedPosOrder) {
      setFeedback("Select a submitted order first.");
      return;
    }
    const vehicle = vehiclesById.get(selectedPosOrder.vehicleId) || null;
    const noteText = approvalNote.trim();
    const request = createServiceRequest({
      vehicleId: selectedPosOrder.vehicleId,
      vehicleModel: vehicle?.model || "Unknown vehicle",
      serviceType: selectedPosOrder.serviceType,
      requestTitle: `${selectedPosOrder.serviceType} - POS Order ${selectedPosOrder.id}`,
      requestedBy: session?.name || "POS User",
      requestedAt: new Date().toISOString(),
      priority: selectedPosOrder.priority || "Normal",
      emergency: toNumber(selectedPosOrder.total) > 2500,
      status: "Pending approval",
      orderDetails: {
        description:
          selectedPosOrder.description ||
          "Approval request initiated from POS approval workflow.",
        vendor: "POS Booking Desk",
        estimatedCost: `$${selectedPosOrder.total}`,
        location: "POS Center",
        notes: noteText
          ? `${noteText} | POS Order ${selectedPosOrder.id}`
          : `Approval requested for POS Order ${selectedPosOrder.id}`,
      },
      lifecycle: [
        {
          stage: "Requested",
          time: new Date().toISOString(),
          actor: session?.name || "POS User",
          note: noteText || "Approval request sent from POS dashboard.",
        },
      ],
    });
    setSelectedApprovalRequestId(request.id);
    setApprovalNote("");
    setFeedback(`Approval request ${request.id} sent for ${selectedPosOrder.id}.`);
  };

  const reSubmitCorrectedOrder = () => {
    if (!selectedApprovalRequest) {
      setFeedback("Select an approval request from status list.");
      return;
    }
    const posOrderId = selectedApprovalRequest.posOrderId;
    const sourceOrder = submittedOrders.find((order) => order.id === posOrderId) || null;
    if (!sourceOrder) {
      setFeedback("Source POS order not found for re-submission.");
      return;
    }

    const correctionText = correctionNote.trim() || "Corrected details and re-submitted.";

    setOrderLifecycleStage(selectedApprovalRequest.id, {
      stage: "Re-submitted",
      actor: session?.name || "POS User",
      note: correctionText,
    });

    const vehicle = vehiclesById.get(sourceOrder.vehicleId) || null;
    const newRequest = createServiceRequest({
      vehicleId: sourceOrder.vehicleId,
      vehicleModel: vehicle?.model || "Unknown vehicle",
      serviceType: sourceOrder.serviceType,
      requestTitle: `${sourceOrder.serviceType} - POS Order ${sourceOrder.id} (Re-submission)`,
      requestedBy: session?.name || "POS User",
      requestedAt: new Date().toISOString(),
      priority: sourceOrder.priority || "Normal",
      emergency: toNumber(sourceOrder.total) > 2500,
      status: "Pending approval",
      orderDetails: {
        description:
          sourceOrder.description || "Corrected order re-submitted from POS approval workflow.",
        vendor: "POS Booking Desk",
        estimatedCost: `$${sourceOrder.total}`,
        location: "POS Center",
        notes: `${correctionText} | POS Order ${sourceOrder.id}`,
      },
      lifecycle: [
        {
          stage: "Re-submitted",
          time: new Date().toISOString(),
          actor: session?.name || "POS User",
          note: correctionText,
        },
      ],
    });

    setSelectedApprovalRequestId(newRequest.id);
    setCorrectionNote("");
    setFeedback(`Corrected order re-submitted as ${newRequest.id}.`);
  };

  const openStatusDetails = (row) => () => {
    if (row.requestId) {
      setSelectedApprovalRequestId(row.requestId);
    }
    setDetailsModal({
      open: true,
      posOrderId: row.id,
      requestId: row.requestId || "",
    });
  };

  const closeStatusDetails = () => {
    setDetailsModal({
      open: false,
      posOrderId: "",
      requestId: "",
    });
  };

  const modalPosOrder =
    submittedOrders.find((order) => order.id === detailsModal.posOrderId) || null;
  const modalRequest = useMemo(() => {
    if (detailsModal.requestId) {
      const direct = approvalRequests.find((request) => request.id === detailsModal.requestId);
      if (direct) {
        return direct;
      }
    }
    if (detailsModal.posOrderId) {
      return latestRequestByOrderId.get(detailsModal.posOrderId) || null;
    }
    return null;
  }, [approvalRequests, detailsModal.posOrderId, detailsModal.requestId, latestRequestByOrderId]);

  const modalStatus = modalRequest ? getApprovalState(modalRequest.status) : "Not requested";

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total approval requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{approvalRequests.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending approval</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{statusSummary.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{statusSummary.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Rejected</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{statusSummary.rejected}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Re-submitted</p>
          <p className="mt-2 text-2xl font-semibold text-violet-700">{statusSummary.resubmitted}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Send size={18} />
            Send approval request
          </h2>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Submitted POS order</Label>
              <Select
                onValueChange={setSelectedPosOrderId}
                value={selectedPosOrderId || submittedOrders[0]?.id || "__none__"}
              >
                <SelectTrigger className="w-full min-w-0 max-w-full overflow-hidden">
                  <SelectValue className="block truncate" placeholder="Select submitted order" />
                </SelectTrigger>
                <SelectContent>
                  {submittedOrders.length === 0 ? (
                    <SelectItem value="__none__">No submitted orders</SelectItem>
                  ) : (
                    submittedOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.serviceType} (${order.total})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Approval note</Label>
              <Textarea
                onChange={(event) => setApprovalNote(event.target.value)}
                placeholder="Add reason or context for approver"
                rows={3}
                value={approvalNote}
              />
            </div>
            <Button onClick={sendApprovalRequest} type="button">
              Send approval request
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock3 size={18} />
            Re-submit corrected order
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use this for rejected/changes-required requests after correction.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Correction details</Label>
              <Textarea
                onChange={(event) => setCorrectionNote(event.target.value)}
                placeholder="What was corrected before re-submission"
                rows={3}
                value={correctionNote}
              />
            </div>
            <Button onClick={reSubmitCorrectedOrder} type="button" variant="outline">
              Re-submit corrected order
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">View approval status</h2>
        <div className="mt-4 space-y-2">
          {posOrderStatusRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No submitted POS orders available.
            </p>
          ) : (
            posOrderStatusRows.map((row) => (
              <button
                key={row.id}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                onClick={openStatusDetails(row)}
                type="button"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {row.id} - {row.serviceType}
                  </p>
                  <p className="text-sm text-slate-600">Total: ${row.total}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${statusBadgeClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                  {row.requestId ? (
                    <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">
                      {row.requestId}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <History size={18} />
          Approval history
        </h2>
        <div className="mt-4 space-y-2">
          {!selectedApprovalRequest ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              Select a request from status list to view history.
            </p>
          ) : (
            selectedApprovalRequest.lifecycle.map((entry, index) => (
              <div
                key={`${selectedApprovalRequest.id}-${entry.time}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <p className="font-semibold text-slate-900">
                  {entry.stage} - {entry.actor}
                </p>
                <p className="text-slate-600">
                  {new Date(entry.time).toLocaleString("en-US")}
                </p>
                {entry.note ? <p className="mt-1 text-slate-700">{entry.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>

      {detailsModal.open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={closeStatusDetails}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Approval details
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {modalPosOrder?.id || detailsModal.posOrderId || "POS Order"} -{" "}
                  {modalPosOrder?.serviceType || "N/A"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Request: {modalRequest?.id || "Not requested"} | Status: {modalStatus}
                </p>
              </div>
              <button
                aria-label="Close approval details"
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                onClick={closeStatusDetails}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Approval status</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                    modalStatus
                  )}`}
                >
                  {modalStatus}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Order total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  ${modalPosOrder?.total || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {modalPosOrder?.priority || modalRequest?.priority || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Requested at</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(modalRequest?.requestedAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">POS order context</h4>
                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p>
                    Vehicle:{" "}
                    <span className="font-semibold">
                      {modalPosOrder?.vehiclePlate || modalPosOrder?.vehicleId || "N/A"}
                    </span>
                  </p>
                  <p>
                    Service type:{" "}
                    <span className="font-semibold">{modalPosOrder?.serviceType || "N/A"}</span>
                  </p>
                  <p>
                    Problem type:{" "}
                    <span className="font-semibold">{modalPosOrder?.problemType || "N/A"}</span>
                  </p>
                  <p>
                    Submitted by:{" "}
                    <span className="font-semibold">{modalPosOrder?.submittedBy || "N/A"}</span>
                  </p>
                  <p>
                    Submitted at:{" "}
                    <span className="font-semibold">
                      {formatDateTime(modalPosOrder?.submittedAt)}
                    </span>
                  </p>
                  <p>
                    Last updated:{" "}
                    <span className="font-semibold">
                      {formatDateTime(modalPosOrder?.updatedAt)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText size={14} />
                  Approval decision detail
                </h4>
                {!modalRequest ? (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    No approval request created for this order yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2 text-xs text-slate-700">
                    <p>
                      Decision:{" "}
                      <span className="font-semibold">
                        {modalRequest.approval?.decision || "Pending"}
                      </span>
                    </p>
                    <p>
                      Approver:{" "}
                      <span className="font-semibold">
                        {modalRequest.approval?.approver || "N/A"}
                      </span>
                    </p>
                    <p>
                      Decision time:{" "}
                      <span className="font-semibold">
                        {formatDateTime(modalRequest.approval?.decidedAt)}
                      </span>
                    </p>
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      {modalRequest.approval?.note ||
                        modalRequest.orderDetails?.description ||
                        "No decision note available."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-900">Approval lifecycle</h4>
              <div className="mt-3 space-y-2">
                {!modalRequest || !Array.isArray(modalRequest.lifecycle) || modalRequest.lifecycle.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    No lifecycle entries available.
                  </p>
                ) : (
                  modalRequest.lifecycle.map((entry, index) => (
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                      key={`${modalRequest.id}-${entry.time}-${index}`}
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.stage} - {entry.actor}
                      </p>
                      <p className="text-xs text-slate-600">{formatDateTime(entry.time)}</p>
                      {entry.note ? (
                        <p className="mt-1 text-xs text-slate-700">{entry.note}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {modalRequest ? (
                <Button
                  onClick={() => {
                    setSelectedApprovalRequestId(modalRequest.id);
                    closeStatusDetails();
                  }}
                  type="button"
                >
                  Focus in history
                </Button>
              ) : null}
              <Button onClick={closeStatusDetails} type="button" variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}

export default POSApprovalWorkflowControl;
