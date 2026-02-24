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
  deletePosOrderDraft,
  duplicateSubmittedPosOrder,
  getPosOrderState,
  savePosOrderDraft,
  submitPosOrder,
  subscribePosOrders,
} from "../data/posOrderStore";
import { createServiceRequest } from "../data/serviceOrderStore";

const createLineId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

function POSOrderManagement({ vehicles = [], selectedVehicle = null, session = null }) {
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
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [feedback, setFeedback] = useState("");

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

  const loadDraftIntoForm = (draft) => {
    if (!draft) {
      return;
    }
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
      attachments: Array.isArray(draft.attachments) ? draft.attachments : [],
      notes: draft.notes || "",
    });
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
    const attachments = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    }));
    setOrderForm((prev) => ({
      ...prev,
      attachments,
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
        estimatedCost: `$${submitted.total}`,
        location: "POS Center",
        notes: `Parts ${submitted.parts.length}, Labour ${submitted.labour.length}, Attachments ${submitted.attachments.length}`,
      },
    });

    setOrderForm(createInitialForm(selectedVehicle));
    setSelectedDraftId("");
    setFeedback(`Order ${submitted.id} submitted.`);
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
      setOrderForm(createInitialForm(selectedVehicle));
    }
    setFeedback("Draft removed.");
  };

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
              <div className="grid gap-2">
                <Label>Vehicle</Label>
                <Select onValueChange={handleVehicleChange} value={orderForm.vehicleId || "__none__"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.length === 0 ? (
                      <SelectItem value="__none__">No vehicles</SelectItem>
                    ) : (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate || vehicle.id} - {vehicle.model}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  onValueChange={(value) => setOrderForm((prev) => ({ ...prev, priority: value }))}
                  value={orderForm.priority}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="mt-3 space-y-2">
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
                          Qty {item.qty} x ${item.unitCost}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          ${Math.round(normalizeNumber(item.qty) * normalizeNumber(item.unitCost))}
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

              <div className="mt-3 space-y-2">
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
                          {item.hours} hr x ${item.rate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          ${Math.round(normalizeNumber(item.hours) * normalizeNumber(item.rate))}
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
            <div className="mt-3 grid gap-2">
              <Input accept="image/*,.pdf,.doc,.docx" multiple onChange={onFilesSelected} type="file" />
              <div className="space-y-1">
                {orderForm.attachments.length === 0 ? (
                  <p className="text-xs text-slate-500">No files attached.</p>
                ) : (
                  orderForm.attachments.map((file) => (
                    <p key={`${file.name}-${file.size}`} className="text-xs text-slate-700">
                      {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                    </p>
                  ))
                )}
              </div>
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
                <p className="mt-1 text-lg font-semibold text-slate-900">${totals.partsTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Labour total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${totals.labourTotal}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">Order total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${totals.total}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveDraft} type="button" variant="outline">
                Save draft
              </Button>
              <Button onClick={submitOrder} type="button">
                Submit order
              </Button>
              <Button
                onClick={() => {
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
            <div className="mt-4 space-y-2">
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
            <div className="mt-4 space-y-2">
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
                      {order.vehiclePlate || order.vehicleId || "Vehicle N/A"} | ${order.total}
                    </p>
                    <div className="mt-2">
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
    </section>
  );
}

export default POSOrderManagement;
