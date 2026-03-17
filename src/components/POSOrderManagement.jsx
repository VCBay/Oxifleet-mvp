import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FileText, Loader2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SearchableSelect } from "./ui/searchable-select";
import { Textarea } from "./ui/textarea";
import {
  deletePosOrderDraft,
  duplicateSubmittedPosOrder,
  getPosOrderState,
  savePosOrderDraft,
  submitPosOrder,
  subscribePosOrders,
} from "../data/posOrderStore";
import {
  createServiceRequest,
  submitInvoiceToFleet,
} from "../data/serviceOrderStore";
import { addInvoice } from "../data/billingFinanceStore";

const createLineId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const EURO_CURRENCY_FORMATTER = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatEuro = (value) => EURO_CURRENCY_FORMATTER.format(normalizeNumber(value));

const createAttachmentId = () =>
  `ATT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeAttachmentMeta = (file) => ({
  name: file.name,
  size: file.size,
  type: file.type || "application/octet-stream",
});

const isImageAttachment = (type) => String(type || "").toLowerCase().startsWith("image/");

const toPreviewFromMeta = (meta) => ({
  id: createAttachmentId(),
  name: meta.name,
  size: meta.size,
  type: meta.type || "application/octet-stream",
  isImage: isImageAttachment(meta.type),
  url: "",
});

const toPreviewFromFile = (file) => {
  const meta = normalizeAttachmentMeta(file);
  const isImage = isImageAttachment(meta.type);
  return {
    id: createAttachmentId(),
    ...meta,
    isImage,
    url: isImage ? URL.createObjectURL(file) : "",
  };
};

const toMetaFromPreview = (preview) => ({
  name: preview.name,
  size: preview.size,
  type: preview.type || "application/octet-stream",
});

const revokeAttachmentPreviewUrls = (items = []) => {
  items.forEach((item) => {
    if (typeof item?.url === "string" && item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  });
};

const formatAttachmentSize = (size) =>
  `${Math.max(1, Math.round(Number(size || 0) / 1024))} KB`;

const createInitialForm = (selectedVehicle) => ({
  id: "",
  vehicleId: selectedVehicle?.id || "",
  vehiclePlate: selectedVehicle?.plate || "",
  serviceType: "General service",
  problemType: "General check",
  description: "",
  priority: "Normal",
  parts: [],
  labour: [],
  attachments: [],
  notes: "",
});

function POSOrderManagement({
  vehicles = [],
  selectedVehicle = null,
  session = null,
  completionMode = false,
  completionRequestId = "",
  completionPosOrderId = "",
  completionVehicleId = "",
  completionServiceType = "",
}) {
  const navigate = useNavigate();
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState
  );

  const [orderForm, setOrderForm] = useState(() => createInitialForm(selectedVehicle));
  const [partDraft, setPartDraft] = useState({
    name: "",
    qty: 1,
    unitCost: 0,
  });
  const [labourDraft, setLabourDraft] = useState({
    name: "",
    hours: 1,
    rate: 0,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    order: null,
    source: "draft",
  });
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCompletionSubmitting, setIsCompletionSubmitting] = useState(false);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [completionPopup, setCompletionPopup] = useState({
    open: false,
    title: "",
    detail: "",
    invoiceId: "",
    requestId: "",
    posOrderId: "",
    vehicleId: "",
    serviceType: "",
    partsCount: 0,
    labourCount: 0,
    total: 0,
    status: "",
    invoiceDate: "",
  });
  const completionInitKeyRef = useRef("");
  const completionSubmitTimeoutRef = useRef(null);
  const completionPopupTimeoutRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const attachmentPreviewsRef = useRef([]);

  const clearAttachmentInput = () => {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const updateAttachmentPreviews = (nextPreviews) => {
    setAttachmentPreviews((prev) => {
      revokeAttachmentPreviewUrls(prev);
      return nextPreviews;
    });
  };

  const applyAttachmentMeta = (attachments = []) => {
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    updateAttachmentPreviews(safeAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setOrderForm((prev) => ({
      ...prev,
      attachments: safeAttachments,
    }));
  };

  const selectedVehicleModel = useMemo(
    () => vehicles.find((item) => item.id === orderForm.vehicleId) || selectedVehicle || null,
    [orderForm.vehicleId, selectedVehicle, vehicles]
  );

  const totals = useMemo(() => {
    const partsTotal = orderForm.parts.reduce(
      (sum, item) => sum + normalizeNumber(item.qty) * normalizeNumber(item.unitCost),
      0
    );
    const labourTotal = orderForm.labour.reduce(
      (sum, item) => sum + normalizeNumber(item.hours) * normalizeNumber(item.rate),
      0
    );
    return {
      partsTotal: Math.round(partsTotal),
      labourTotal: Math.round(labourTotal),
      total: Math.round(partsTotal + labourTotal),
    };
  }, [orderForm.labour, orderForm.parts]);

  const completionInvoiceServices = useMemo(() => {
    const partLines = orderForm.parts
      .map((item) => ({
        name: `Part: ${item.name}`,
        cost: Math.round(normalizeNumber(item.qty) * normalizeNumber(item.unitCost)),
      }))
      .filter((line) => line.cost > 0);
    const labourLines = orderForm.labour
      .map((item) => ({
        name: `Labour: ${item.name}`,
        cost: Math.round(normalizeNumber(item.hours) * normalizeNumber(item.rate)),
      }))
      .filter((line) => line.cost > 0);
    return [...partLines, ...labourLines];
  }, [orderForm.labour, orderForm.parts]);

  useEffect(() => {
    const initKey = completionMode
      ? `${completionRequestId}|${completionPosOrderId}|${completionVehicleId}|${completionServiceType}`
      : "";
    if (!completionMode) {
      completionInitKeyRef.current = "";
      return;
    }
    if (!initKey || completionInitKeyRef.current === initKey) {
      return;
    }

    const sourceOrder =
      posOrderState.submittedOrders.find((order) => order.id === completionPosOrderId) ||
      null;
    const sourceVehicle =
      vehicles.find((item) => item.id === (sourceOrder?.vehicleId || completionVehicleId)) ||
      selectedVehicle ||
      null;
    const sourceAttachments = Array.isArray(sourceOrder?.attachments)
      ? sourceOrder.attachments
      : [];

    setOrderForm((prev) => ({
      ...prev,
      id: sourceOrder?.id || prev.id,
      vehicleId: sourceOrder?.vehicleId || completionVehicleId || sourceVehicle?.id || prev.vehicleId,
      vehiclePlate:
        sourceOrder?.vehiclePlate ||
        sourceVehicle?.plate ||
        prev.vehiclePlate,
      serviceType:
        completionServiceType ||
        sourceOrder?.serviceType ||
        prev.serviceType,
      problemType: sourceOrder?.problemType || prev.problemType,
      description:
        sourceOrder?.description ||
        `Completion invoice for ${completionRequestId || "service request"}.`,
      priority: sourceOrder?.priority || prev.priority,
      parts: Array.isArray(sourceOrder?.parts) ? sourceOrder.parts : prev.parts,
      labour: Array.isArray(sourceOrder?.labour) ? sourceOrder.labour : prev.labour,
      attachments: sourceAttachments,
      notes:
        sourceOrder?.notes ||
        prev.notes ||
        "Completion invoice prepared from POS workflow.",
    }));
    updateAttachmentPreviews(sourceAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setSelectedDraftId("");
    setFeedback(
      `Invoice mode active for ${completionRequestId || "selected request"}. Add/adjust parts and labour, then send invoice to fleet owner.`
    );
    completionInitKeyRef.current = initKey;
  }, [
    completionMode,
    completionPosOrderId,
    completionRequestId,
    completionServiceType,
    completionVehicleId,
    posOrderState.submittedOrders,
    selectedVehicle,
    vehicles,
  ]);

  useEffect(
    () => () => {
      if (completionSubmitTimeoutRef.current) {
        window.clearTimeout(completionSubmitTimeoutRef.current);
      }
      if (completionPopupTimeoutRef.current) {
        window.clearTimeout(completionPopupTimeoutRef.current);
      }
      revokeAttachmentPreviewUrls(attachmentPreviewsRef.current);
    },
    []
  );

  useEffect(() => {
    attachmentPreviewsRef.current = attachmentPreviews;
  }, [attachmentPreviews]);

  const loadDraftIntoForm = (draft) => {
    if (!draft) {
      return;
    }
    const draftAttachments = Array.isArray(draft.attachments) ? draft.attachments : [];
    setOrderForm({
      id: draft.id,
      vehicleId: draft.vehicleId || "",
      vehiclePlate: draft.vehiclePlate || "",
      serviceType: draft.serviceType || "General service",
      problemType: draft.problemType || "General check",
      description: draft.description || "",
      priority: draft.priority || "Normal",
      parts: Array.isArray(draft.parts) ? draft.parts : [],
      labour: Array.isArray(draft.labour) ? draft.labour : [],
      attachments: draftAttachments,
      notes: draft.notes || "",
    });
    updateAttachmentPreviews(draftAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setSelectedDraftId(draft.id);
  };

  const handleVehicleChange = (vehicleId) => {
    const target = vehicles.find((item) => item.id === vehicleId);
    setOrderForm((prev) => ({
      ...prev,
      vehicleId,
      vehiclePlate: target?.plate || prev.vehiclePlate,
    }));
  };

  const addPartItem = () => {
    if (!partDraft.name.trim()) {
      return;
    }
    const item = {
      id: createLineId("PART"),
      name: partDraft.name.trim(),
      qty: Math.max(0, normalizeNumber(partDraft.qty)),
      unitCost: Math.max(0, normalizeNumber(partDraft.unitCost)),
    };
    setOrderForm((prev) => ({
      ...prev,
      parts: [...prev.parts, item],
    }));
    setPartDraft({
      name: "",
      qty: 1,
      unitCost: 0,
    });
  };

  const addLabourItem = () => {
    if (!labourDraft.name.trim()) {
      return;
    }
    const item = {
      id: createLineId("LAB"),
      name: labourDraft.name.trim(),
      hours: Math.max(0, normalizeNumber(labourDraft.hours)),
      rate: Math.max(0, normalizeNumber(labourDraft.rate)),
    };
    setOrderForm((prev) => ({
      ...prev,
      labour: [...prev.labour, item],
    }));
    setLabourDraft({
      name: "",
      hours: 1,
      rate: 0,
    });
  };

  const removePartItem = (lineId) => () => {
    setOrderForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((item) => item.id !== lineId),
    }));
  };

  const removeLabourItem = (lineId) => () => {
    setOrderForm((prev) => ({
      ...prev,
      labour: prev.labour.filter((item) => item.id !== lineId),
    }));
  };

  const onFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    const previews = files.map(toPreviewFromFile);
    setOrderForm((prev) => ({
      ...prev,
      attachments: previews.map(toMetaFromPreview),
    }));
    updateAttachmentPreviews(previews);
  };

  const removeAttachmentById = (attachmentId) => {
    setAttachmentPreviews((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(target.url);
      }
      const next = prev.filter((item) => item.id !== attachmentId);
      setOrderForm((formPrev) => ({
        ...formPrev,
        attachments: next.map(toMetaFromPreview),
      }));
      if (next.length === 0) {
        clearAttachmentInput();
      }
      return next;
    });
  };

  const clearAttachments = () => {
    updateAttachmentPreviews([]);
    clearAttachmentInput();
    setOrderForm((prev) => ({
      ...prev,
      attachments: [],
    }));
  };

  const saveDraft = () => {
    if (!orderForm.vehicleId || !orderForm.serviceType.trim()) {
      setFeedback("Vehicle and service type are required to save draft.");
      return;
    }
    const saved = savePosOrderDraft(orderForm);
    setOrderForm((prev) => ({ ...prev, id: saved.id }));
    setSelectedDraftId(saved.id);
    setFeedback("Draft order saved.");
  };

  const submitOrder = () => {
    if (!orderForm.vehicleId || !orderForm.serviceType.trim()) {
      setFeedback("Vehicle and service type are required before submission.");
      return;
    }

    const submitted = submitPosOrder(orderForm, session?.name || "POS User");
    createServiceRequest({
      vehicleId: submitted.vehicleId,
      vehicleModel: selectedVehicleModel?.model || "Unknown vehicle",
      serviceType: submitted.serviceType,
      requestTitle: `${submitted.serviceType} - POS Order ${submitted.id}`,
      requestedBy: session?.name || "POS User",
      priority: submitted.priority,
      emergency: normalizeNumber(submitted.total) > 2500,
      status: "Pending approval",
      orderDetails: {
        description: submitted.description || "POS-created service order.",
        vendor: "POS Booking Desk",
        estimatedCost: formatEuro(submitted.total),
        location: "POS Center",
        notes: `Parts ${submitted.parts.length}, Labour ${submitted.labour.length}, Attachments ${submitted.attachments.length}`,
      },
    });

    applyAttachmentMeta([]);
    setOrderForm(createInitialForm(selectedVehicle));
    setSelectedDraftId("");
    setFeedback(`Order ${submitted.id} submitted.`);
  };

  const goToCompletionDetails = (requestId, posOrderId) => {
    if (!requestId) {
      return;
    }
    const redirectParams = new URLSearchParams({
      focus: "status",
      requestId,
    });
    if (posOrderId) {
      redirectParams.set("posOrderId", posOrderId);
    }
    navigate(`/pos-dashboard/approval-workflow?${redirectParams.toString()}`);
  };

  const submitCompletionInvoice = () => {
    if (!completionMode) {
      return;
    }
    if (!completionRequestId) {
      const message = "Completion request is missing. Re-open from Approval Workflow.";
      setFeedback(message);
      toast.error("Invoice not submitted", { description: message, duration: 3200 });
      return;
    }
    if (!orderForm.vehicleId) {
      const message = "Vehicle is required to generate invoice.";
      setFeedback(message);
      toast.error("Invoice not submitted", { description: message, duration: 3200 });
      return;
    }
    if (completionInvoiceServices.length === 0 || totals.total <= 0) {
      const message = "Add at least one parts/labour line with valid cost.";
      setFeedback(message);
      toast.error("Invoice not submitted", { description: message, duration: 3200 });
      return;
    }

    setIsCompletionSubmitting(true);
    if (completionSubmitTimeoutRef.current) {
      window.clearTimeout(completionSubmitTimeoutRef.current);
    }
    completionSubmitTimeoutRef.current = window.setTimeout(() => {
      const createdInvoice = addInvoice({
        orderId: completionRequestId,
        vehicleId: orderForm.vehicleId,
        vehicleModel: selectedVehicleModel?.model || "Unknown vehicle",
        driverName: session?.name || "POS User",
        location: "POS Center",
        status: "Processing",
        services: completionInvoiceServices,
        totalAmount: totals.total,
      });

      const invoiceSubmitted = submitInvoiceToFleet(completionRequestId, {
        actor: session?.name || "POS User",
        note: `Invoice ${createdInvoice.id} sent to fleet for completion confirmation.`,
        invoiceId: createdInvoice.id,
      });

      if (!invoiceSubmitted) {
        setIsCompletionSubmitting(false);
        const message = "Invoice created but unable to move request to invoice processing.";
        setFeedback(message);
        toast.error("Invoice status update failed", { description: message, duration: 3400 });
        return;
      }

      const detail = `Invoice ${createdInvoice.id} sent to fleet owner. ${completionRequestId} is now Invoice processing.`;
      setFeedback(detail);
      setIsCompletionSubmitting(false);
      setCompletionPopup({
        open: true,
        title: "Invoice submitted",
        detail,
        invoiceId: createdInvoice.id,
        requestId: completionRequestId,
        posOrderId: completionPosOrderId || orderForm.id,
        vehicleId: orderForm.vehicleId,
        serviceType: orderForm.serviceType,
        partsCount: orderForm.parts.length,
        labourCount: orderForm.labour.length,
        total: totals.total,
        status: createdInvoice.status || "Processing",
        invoiceDate: createdInvoice.date || new Date().toISOString(),
      });
      toast.success("Invoice sent to fleet", {
        description: detail,
        duration: 3000,
      });

      if (completionPopupTimeoutRef.current) {
        window.clearTimeout(completionPopupTimeoutRef.current);
      }
      completionPopupTimeoutRef.current = window.setTimeout(() => {
        goToCompletionDetails(completionRequestId, completionPosOrderId || orderForm.id);
      }, 1900);
    }, 850);
  };

  const onDuplicateSubmittedOrder = (orderId) => () => {
    const duplicated = duplicateSubmittedPosOrder(orderId);
    if (!duplicated) {
      setFeedback("Unable to duplicate selected order.");
      return;
    }
    loadDraftIntoForm(duplicated);
    setFeedback(`Order duplicated as draft ${duplicated.id}.`);
  };

  const onDeleteDraft = (draftId) => () => {
    const removed = deletePosOrderDraft(draftId);
    if (!removed) {
      return;
    }
    if (selectedDraftId === draftId) {
      setSelectedDraftId("");
      applyAttachmentMeta([]);
      setOrderForm(createInitialForm(selectedVehicle));
    }
    setFeedback("Draft removed.");
  };

  const openOrderDetails = (order, source) => () => {
    setDetailsModal({
      open: true,
      order,
      source,
    });
  };

  const closeOrderDetails = () => {
    setDetailsModal({
      open: false,
      order: null,
      source: "draft",
    });
  };

  const loadDraftFromModal = () => {
    if (!detailsModal.order) {
      return;
    }
    loadDraftIntoForm(detailsModal.order);
    closeOrderDetails();
    setFeedback(`Draft ${detailsModal.order.id} loaded in editor.`);
  };

  const duplicateFromModal = () => {
    if (!detailsModal.order) {
      return;
    }
    const duplicated = duplicateSubmittedPosOrder(detailsModal.order.id);
    if (!duplicated) {
      setFeedback("Unable to duplicate selected order.");
      return;
    }
    loadDraftIntoForm(duplicated);
    closeOrderDetails();
    setFeedback(`Order duplicated as draft ${duplicated.id}.`);
  };

  const modalOrder = detailsModal.order;
  const modalParts = Array.isArray(modalOrder?.parts) ? modalOrder.parts : [];
  const modalLabour = Array.isArray(modalOrder?.labour) ? modalOrder.labour : [];
  const modalAttachments = Array.isArray(modalOrder?.attachments)
    ? modalOrder.attachments
    : [];

  return (
    <section className="space-y-6">
      {/* <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Order Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create, edit, draft, duplicate, and submit service orders with parts,
          labour, and document attachments.
        </p>
      </div> */}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Create service order</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <Label>Vehicle</Label>
                <SearchableSelect
                  onValueChange={handleVehicleChange}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.plate || vehicle.id} - ${vehicle.model}`,
                    description: vehicle.type || vehicle.category,
                    meta: vehicle.status,
                  }))}
                  value={orderForm.vehicleId || ""}
                  placeholder="Select vehicle"
                  searchPlaceholder="Search vehicles"
                  emptyLabel="No vehicles"
                  noMatchLabel="No matching vehicles"
                  triggerClassName="w-full min-w-0 max-w-full overflow-hidden"
                />
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <SearchableSelect
                  onValueChange={(value) => setOrderForm((prev) => ({ ...prev, priority: value }))}
                  options={[
                    { value: "Low", label: "Low" },
                    { value: "Normal", label: "Normal" },
                    { value: "High", label: "High" },
                    { value: "Emergency", label: "Emergency" },
                  ]}
                  value={orderForm.priority || ""}
                  placeholder="Priority"
                  searchPlaceholder="Search priorities"
                  emptyLabel="No priority options"
                  noMatchLabel="No matching priorities"
                  triggerClassName="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Label>Service type</Label>
                <Input
                  onChange={(event) =>
                    setOrderForm((prev) => ({ ...prev, serviceType: event.target.value }))
                  }
                  placeholder="General service"
                  value={orderForm.serviceType}
                />
              </div>
              <div className="grid gap-2">
                <Label>Problem type</Label>
                <Input
                  onChange={(event) =>
                    setOrderForm((prev) => ({ ...prev, problemType: event.target.value }))
                  }
                  placeholder="Brake issue / Tyre wear / Diagnostics"
                  value={orderForm.problemType}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <Label>Description</Label>
              <Textarea
                onChange={(event) =>
                  setOrderForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe service issue and observed symptoms."
                rows={3}
                value={orderForm.description}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Add parts items</h3>
              <div className="mt-3 grid gap-2">
                <Input
                  onChange={(event) =>
                    setPartDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Part name"
                  value={partDraft.name}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    min="0"
                    onChange={(event) =>
                      setPartDraft((prev) => ({ ...prev, qty: event.target.value }))
                    }
                    placeholder="Qty"
                    type="number"
                    value={partDraft.qty}
                  />
                  <Input
                    min="0"
                    onChange={(event) =>
                      setPartDraft((prev) => ({ ...prev, unitCost: event.target.value }))
                    }
                    placeholder="Unit cost"
                    type="number"
                    value={partDraft.unitCost}
                  />
                </div>
                <Button onClick={addPartItem} type="button" variant="outline">
                  Add part
                </Button>
              </div>

              <div className="card-list-scrollbar mt-3 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                {orderForm.parts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    No parts added.
                  </p>
                ) : (
                  orderForm.parts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-slate-600">
                          Qty {item.qty} x {formatEuro(item.unitCost)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatEuro(
                            Math.round(normalizeNumber(item.qty) * normalizeNumber(item.unitCost))
                          )}
                        </p>
                        <button
                          className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700"
                          onClick={removePartItem(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Add labour items</h3>
              <div className="mt-3 grid gap-2">
                <Input
                  onChange={(event) =>
                    setLabourDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Labour task"
                  value={labourDraft.name}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    min="0"
                    onChange={(event) =>
                      setLabourDraft((prev) => ({ ...prev, hours: event.target.value }))
                    }
                    placeholder="Hours"
                    type="number"
                    value={labourDraft.hours}
                  />
                  <Input
                    min="0"
                    onChange={(event) =>
                      setLabourDraft((prev) => ({ ...prev, rate: event.target.value }))
                    }
                    placeholder="Rate/hr"
                    type="number"
                    value={labourDraft.rate}
                  />
                </div>
                <Button onClick={addLabourItem} type="button" variant="outline">
                  Add labour
                </Button>
              </div>

              <div className="card-list-scrollbar mt-3 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                {orderForm.labour.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    No labour items added.
                  </p>
                ) : (
                  orderForm.labour.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-slate-600">
                          {item.hours} hr x {formatEuro(item.rate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatEuro(
                            Math.round(normalizeNumber(item.hours) * normalizeNumber(item.rate))
                          )}
                        </p>
                        <button
                          className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700"
                          onClick={removeLabourItem(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Upload images/documents
            </h3>
            <div className="mt-3 grid gap-3">
              <Input
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={onFilesSelected}
                ref={attachmentInputRef}
                type="file"
              />
              {attachmentPreviews.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      Uploaded files ({attachmentPreviews.length})
                    </p>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      onClick={clearAttachments}
                      type="button"
                    >
                      <Trash2 size={12} />
                      Clear all
                    </button>
                  </div>
                  <div className="card-list-scrollbar mt-3 grid max-h-[18rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {attachmentPreviews.map((preview) => (
                      <figure
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        key={preview.id}
                      >
                        {preview.isImage && preview.url ? (
                          <img
                            alt={preview.name}
                            className="h-24 w-full object-cover sm:h-28"
                            loading="lazy"
                            src={preview.url}
                          />
                        ) : (
                          <div className="flex h-24 w-full items-center justify-center border-b border-slate-200 bg-slate-100 sm:h-28">
                            <FileText className="size-5 text-slate-500" />
                          </div>
                        )}
                        <button
                          aria-label={`Remove ${preview.name}`}
                          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => removeAttachmentById(preview.id)}
                          type="button"
                        >
                          <X size={12} />
                        </button>
                        <figcaption className="border-t border-slate-200 px-2 py-1.5">
                          <p className="truncate text-[11px] font-medium text-slate-800" title={preview.name}>
                            {preview.name}
                          </p>
                          <p className="text-[10px] text-slate-500">{formatAttachmentSize(preview.size)}</p>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  No files attached.
                </p>
              )}
              <Textarea
                onChange={(event) =>
                  setOrderForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Optional internal notes"
                rows={2}
                value={orderForm.notes}
              />
            </div>
          </div>

          {completionMode ? (
            <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/40 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Generate service invoice
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Add final replaced parts and labour above, then send invoice to fleet
                owner for completion confirmation.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">Service request</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {completionRequestId || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">POS order</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {completionPosOrderId || orderForm.id || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">Invoice total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatEuro(totals.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  disabled={isCompletionSubmitting}
                  onClick={submitCompletionInvoice}
                  type="button"
                >
                  {isCompletionSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Submitting invoice...
                    </>
                  ) : (
                    "Send invoice to fleet owner"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Edit order before submission
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Modify any details, parts, labour, files, then save as draft or submit.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Parts total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatEuro(totals.partsTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Labour total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatEuro(totals.labourTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Order total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatEuro(totals.total)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveDraft} type="button" variant="outline">
                Save draft
              </Button>
              {!completionMode ? (
                <Button
                  className="h-[36px] w-[136px] rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  onClick={submitOrder}
                  type="button"
                >
                  Submit order
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  applyAttachmentMeta([]);
                  setOrderForm(createInitialForm(selectedVehicle));
                  setSelectedDraftId("");
                  setFeedback("Form reset.");
                }}
                type="button"
                variant="secondary"
              >
                Reset form
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Draft orders</h3>
            <p className="mt-1 text-sm text-slate-500">
              Resume and edit saved drafts before submission.
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {posOrderState.draftOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  No draft orders.
                </p>
              ) : (
                posOrderState.draftOrders.map((draft) => (
                  <div
                    key={draft.id}
                    className={`rounded-xl border p-3 text-xs ${
                      selectedDraftId === draft.id
                        ? "border-slate-400 bg-slate-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">
                      {draft.id} - {draft.serviceType}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {draft.vehiclePlate || draft.vehicleId || "Vehicle N/A"} | Priority{" "}
                      {draft.priority}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        onClick={openOrderDetails(draft, "draft")}
                        size="sm"
                        type="button"
                        variant="secondary"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => loadDraftIntoForm(draft)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={onDeleteDraft(draft.id)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Duplicate previous order
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Clone submitted orders as new drafts.
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {posOrderState.submittedOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  No submitted orders yet.
                </p>
              ) : (
                posOrderState.submittedOrders.slice(0, 8).map((order) => (
                  <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-slate-800">
                      {order.id} - {order.serviceType}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {order.vehiclePlate || order.vehicleId || "Vehicle N/A"} |{" "}
                      {formatEuro(order.total)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        onClick={openOrderDetails(order, "submitted")}
                        size="sm"
                        type="button"
                        variant="secondary"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        View
                      </Button>
                      <Button
                        onClick={onDuplicateSubmittedOrder(order.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Duplicate
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {feedback}
            </div>
          ) : null}
        </div>
      </div>

      {isCompletionSubmitting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-2xl">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Sending invoice...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Preparing billing lines and sharing with fleet owner.
            </p>
          </div>
        </div>
      ) : null}

      {completionPopup.open ? (
        <div className="fixed inset-0 z-[61] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <p className="text-lg font-semibold text-slate-900">{completionPopup.title}</p>
            <p className="mt-1 text-sm text-slate-600">{completionPopup.detail}</p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Invoice ID</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.invoiceId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Request ID</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.requestId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Vehicle</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.vehicleId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Service</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.serviceType || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Lines</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Parts {completionPopup.partsCount} • Labour {completionPopup.labourCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Invoice Total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(completionPopup.total)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {completionPopup.status} • {formatDateTime(completionPopup.invoiceDate)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Redirecting to approval details...</p>
              <Button
                onClick={() => {
                  if (completionPopupTimeoutRef.current) {
                    window.clearTimeout(completionPopupTimeoutRef.current);
                  }
                  goToCompletionDetails(
                    completionPopup.requestId,
                    completionPopup.posOrderId
                  );
                }}
                size="sm"
                type="button"
              >
                Open details now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsModal.open && modalOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={closeOrderDetails}
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
                  Order details
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {modalOrder.id} - {modalOrder.serviceType}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {modalOrder.vehiclePlate || modalOrder.vehicleId || "Vehicle N/A"} |{" "}
                  {detailsModal.source === "draft" ? "Draft order" : "Submitted order"}
                </p>
              </div>
              <button
                aria-label="Close details"
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                onClick={closeOrderDetails}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{modalOrder.priority}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Parts total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.partsTotal || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Labour total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.labourTotal || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Order total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.total || 0)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Core details</h4>
                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p>
                    Service type:{" "}
                    <span className="font-semibold">{modalOrder.serviceType || "N/A"}</span>
                  </p>
                  <p>
                    Problem type:{" "}
                    <span className="font-semibold">{modalOrder.problemType || "N/A"}</span>
                  </p>
                  <p>
                    Created:{" "}
                    <span className="font-semibold">{formatDateTime(modalOrder.createdAt)}</span>
                  </p>
                  <p>
                    Updated:{" "}
                    <span className="font-semibold">{formatDateTime(modalOrder.updatedAt)}</span>
                  </p>
                  <p>
                    Submitted:{" "}
                    <span className="font-semibold">{formatDateTime(modalOrder.submittedAt)}</span>
                  </p>
                  <p>
                    Submitted by:{" "}
                    <span className="font-semibold">{modalOrder.submittedBy || "N/A"}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText size={14} />
                  Description and notes
                </h4>
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {modalOrder.description || "No description provided."}
                </p>
                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {modalOrder.notes || "No internal notes."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Parts items</h4>
                <div className="card-list-scrollbar mt-3 max-h-[14rem] space-y-2 overflow-y-auto pr-1">
                  {modalParts.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                      No parts items.
                    </p>
                  ) : (
                    modalParts.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                        key={item.id}
                      >
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-slate-600">
                          Qty {item.qty} x {formatEuro(item.unitCost)}
                        </p>
                        <p className="font-semibold text-slate-900">{formatEuro(item.total)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Labour items</h4>
                <div className="card-list-scrollbar mt-3 max-h-[14rem] space-y-2 overflow-y-auto pr-1">
                  {modalLabour.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                      No labour items.
                    </p>
                  ) : (
                    modalLabour.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                        key={item.id}
                      >
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-slate-600">
                          {item.hours} hr x {formatEuro(item.rate)}
                        </p>
                        <p className="font-semibold text-slate-900">{formatEuro(item.total)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-900">Attachments</h4>
              <div className="card-list-scrollbar mt-3 max-h-[10rem] space-y-2 overflow-y-auto pr-1">
                {modalAttachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    No attachments added.
                  </p>
                ) : (
                  modalAttachments.map((file) => (
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                      key={`${file.name}-${file.size}`}
                    >
                      {file.name} ({Math.max(1, Math.round(Number(file.size || 0) / 1024))} KB)
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {detailsModal.source === "draft" ? (
                <Button onClick={loadDraftFromModal} type="button">
                  Edit
                </Button>
              ) : (
                <Button onClick={duplicateFromModal} type="button">
                  Duplicate as draft
                </Button>
              )}
              <Button onClick={closeOrderDetails} type="button" variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default POSOrderManagement;
