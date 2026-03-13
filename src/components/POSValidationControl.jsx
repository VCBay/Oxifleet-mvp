import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle, CircleAlert, ShieldCheck } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SearchableSelect } from "./ui/searchable-select";
import { getPosOrderState, subscribePosOrders } from "../data/posOrderStore";

const kbPriceList = [
  { serviceType: "Oil change", min: 120, max: 350 },
  { serviceType: "Brake service", min: 300, max: 1200 },
  { serviceType: "Tyre rotation", min: 90, max: 280 },
  { serviceType: "Tyre replacement", min: 700, max: 2600 },
  { serviceType: "Engine diagnostics", min: 160, max: 900 },
  { serviceType: "Battery replacement", min: 250, max: 800 },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const includesNormalized = (list = [], value) => {
  const needle = normalize(value);
  if (!needle) {
    return false;
  }
  return list.some((item) => normalize(item) === needle);
};

const findKbEntry = (serviceType) =>
  kbPriceList.find((entry) => normalize(entry.serviceType) === normalize(serviceType)) || null;

const VALIDATION_MODE_OPTIONS = [
  { value: "manual", label: "Manual check" },
  { value: "draft", label: "Draft order check" },
];

const evaluateValidation = ({ candidate, policy }) => {
  const alerts = [];
  const estimatedCost = Math.max(0, toNumber(candidate?.estimatedCost));
  const serviceType = String(candidate?.serviceType || "").trim();
  const tyreBrand = String(candidate?.tyreBrand || "").trim();
  const hasPolicy = Boolean(policy);

  if (!hasPolicy) {
    alerts.push({
      severity: "error",
      message: "No active policy matched. Submission should be blocked until policy is assigned.",
    });
  }

  if (!serviceType) {
    alerts.push({
      severity: "error",
      message: "Service type is required for policy and KB validation.",
    });
  }

  if (estimatedCost <= 0) {
    alerts.push({
      severity: "warning",
      message: "Estimated cost is missing or zero. Approval and pricing checks may be inaccurate.",
    });
  }

  const policyServices = Array.isArray(policy?.allowedServiceTypes)
    ? policy.allowedServiceTypes
    : [];
  const policyTyreBrands = Array.isArray(policy?.allowedTyreBrands)
    ? policy.allowedTyreBrands
    : [];

  const serviceAllowed =
    hasPolicy && (policyServices.length === 0 || includesNormalized(policyServices, serviceType));
  if (hasPolicy && policyServices.length > 0 && !serviceAllowed) {
    alerts.push({
      severity: "error",
      message: `Service "${serviceType || "N/A"}" is not allowed by policy.`,
    });
  }

  const tyreBrandAllowed =
    hasPolicy && (policyTyreBrands.length === 0 || includesNormalized(policyTyreBrands, tyreBrand));
  if (hasPolicy && policyTyreBrands.length > 0 && tyreBrand && !tyreBrandAllowed) {
    alerts.push({
      severity: "warning",
      message: `Tyre brand "${tyreBrand}" is outside policy allowed brands.`,
    });
  }

  const kbEntry = findKbEntry(serviceType);
  let kbStatus = "not_found";
  if (kbEntry) {
    if (estimatedCost < kbEntry.min) {
      kbStatus = "below";
      alerts.push({
        severity: "warning",
        message: `Estimated cost is below KB range ($${kbEntry.min} - $${kbEntry.max}).`,
      });
    } else if (estimatedCost > kbEntry.max) {
      kbStatus = "above";
      alerts.push({
        severity: "warning",
        message: `Estimated cost is above KB range ($${kbEntry.min} - $${kbEntry.max}).`,
      });
    } else {
      kbStatus = "within";
    }
  } else if (serviceType) {
    alerts.push({
      severity: "warning",
      message: `No KB price benchmark found for "${serviceType}".`,
    });
  }

  const serviceLimit = policy?.servicePriceLimit;
  const overServiceLimit =
    serviceLimit != null && Number.isFinite(Number(serviceLimit))
      ? estimatedCost > Number(serviceLimit)
      : false;
  if (overServiceLimit) {
    alerts.push({
      severity: "error",
      message: `Estimated cost exceeds policy limit of $${serviceLimit}.`,
    });
  }

  const approvalThresholdPercent = policy?.approvalThreshold;
  const approvalTriggerAmount =
    serviceLimit != null && approvalThresholdPercent != null
      ? Math.round((Number(serviceLimit) * Number(approvalThresholdPercent)) / 100)
      : kbEntry
      ? kbEntry.max
      : null;

  const approvalRequired = Boolean(
    overServiceLimit ||
      (hasPolicy && !serviceAllowed) ||
      (approvalTriggerAmount != null && estimatedCost > approvalTriggerAmount)
  );

  if (approvalRequired) {
    alerts.push({
      severity: "warning",
      message: "Approval is required before submission.",
    });
  }

  const errorCount = alerts.filter((item) => item.severity === "error").length;
  const warningCount = alerts.filter((item) => item.severity === "warning").length;

  return {
    alerts,
    approvalRequired,
    approvalTriggerAmount,
    errorCount,
    kbEntry,
    kbStatus,
    policyCompliance: hasPolicy && errorCount === 0 && serviceAllowed,
    serviceAllowed,
    warningCount,
  };
};

function POSValidationControl({ vehicles = [], selectedVehicle = null, primaryPolicy = null }) {
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState
  );
  const [validationMode, setValidationMode] = useState("manual");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [manualForm, setManualForm] = useState(() => ({
    vehicleId: selectedVehicle?.id || vehicles[0]?.id || "",
    serviceType: "",
    estimatedCost: "",
    tyreBrand: selectedVehicle?.tyreSpecs?.brand || "",
  }));

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const effectiveDraftId = selectedDraftId || posOrderState.draftOrders[0]?.id || "";
  const selectedDraft = useMemo(
    () => posOrderState.draftOrders.find((item) => item.id === effectiveDraftId) || null,
    [effectiveDraftId, posOrderState.draftOrders]
  );

  const manualVehicle = useMemo(
    () => vehiclesById.get(manualForm.vehicleId) || selectedVehicle || null,
    [manualForm.vehicleId, selectedVehicle, vehiclesById]
  );

  const candidate = useMemo(() => {
    if (validationMode === "draft" && selectedDraft) {
      const draftVehicle = vehiclesById.get(selectedDraft.vehicleId) || null;
      return {
        serviceType: selectedDraft.serviceType,
        estimatedCost: selectedDraft.total,
        tyreBrand: draftVehicle?.tyreSpecs?.brand || "",
      };
    }
    return {
      serviceType: manualForm.serviceType,
      estimatedCost: manualForm.estimatedCost,
      tyreBrand: manualForm.tyreBrand || manualVehicle?.tyreSpecs?.brand || "",
    };
  }, [manualForm, manualVehicle?.tyreSpecs?.brand, selectedDraft, validationMode, vehiclesById]);

  const validation = useMemo(
    () => evaluateValidation({ candidate, policy: primaryPolicy }),
    [candidate, primaryPolicy]
  );

  const draftValidationRows = useMemo(
    () =>
      posOrderState.draftOrders.slice(0, 10).map((draft) => {
        const draftVehicle = vehiclesById.get(draft.vehicleId) || null;
        const result = evaluateValidation({
          candidate: {
            serviceType: draft.serviceType,
            estimatedCost: draft.total,
            tyreBrand: draftVehicle?.tyreSpecs?.brand || "",
          },
          policy: primaryPolicy,
        });
        return {
          id: draft.id,
          serviceType: draft.serviceType,
          total: draft.total,
          approvalRequired: result.approvalRequired,
          errorCount: result.errorCount,
          warningCount: result.warningCount,
        };
      }),
    [posOrderState.draftOrders, primaryPolicy, vehiclesById]
  );

  const kbStatusLabel =
    validation.kbStatus === "within"
      ? "Within KB range"
      : validation.kbStatus === "above"
      ? "Above KB range"
      : validation.kbStatus === "below"
      ? "Below KB range"
      : "No KB benchmark";

  const serviceTypeOptions = useMemo(() => {
    const list = new Set(kbPriceList.map((item) => item.serviceType));
    (primaryPolicy?.allowedServiceTypes || []).forEach((item) => list.add(item));
    return Array.from(list);
  }, [primaryPolicy?.allowedServiceTypes]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Policy compliance check</p>
          <p
            className={`mt-2 text-lg font-semibold ${
              validation.policyCompliance ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {validation.policyCompliance ? "Compliant" : "Not compliant"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Price validation (KB)</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{kbStatusLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Approval required indicator</p>
          <p
            className={`mt-2 text-lg font-semibold ${
              validation.approvalRequired ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {validation.approvalRequired ? "Required" : "Not required"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Error/warning alerts</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {validation.errorCount} error(s), {validation.warningCount} warning(s)
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Validation input</h2>
          <p className="mt-1 text-sm text-slate-500">
            Validate policy compliance, KB pricing, and approval rules before final submission.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Validation mode</Label>
              <SearchableSelect
                onValueChange={setValidationMode}
                options={VALIDATION_MODE_OPTIONS}
                value={validationMode || ""}
                placeholder="Select mode"
                searchPlaceholder="Search modes"
                emptyLabel="No modes available"
                noMatchLabel="No matching mode"
                triggerClassName="w-full"
              />
            </div>

            {validationMode === "draft" ? (
              <div className="grid gap-2">
                <Label>Draft order</Label>
                <SearchableSelect
                  onValueChange={setSelectedDraftId}
                  options={posOrderState.draftOrders.map((draft) => ({
                    value: draft.id,
                    label: `${draft.id} - ${draft.serviceType}`,
                    description: draft.orderDetails?.description,
                  }))}
                  value={effectiveDraftId || ""}
                  placeholder="Select draft"
                  searchPlaceholder="Search drafts"
                  emptyLabel="No drafts available"
                  noMatchLabel="No matching drafts"
                  triggerClassName="w-full"
                />
              </div>
            ) : null}
          </div>

          {validationMode === "manual" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Vehicle</Label>
                <SearchableSelect
                  onValueChange={(value) => {
                    const vehicle = vehiclesById.get(value);
                    setManualForm((prev) => ({
                      ...prev,
                      vehicleId: value,
                      tyreBrand: vehicle?.tyreSpecs?.brand || prev.tyreBrand,
                    }));
                  }}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.plate || vehicle.id} - ${vehicle.model}`,
                    description: vehicle.type,
                    meta: vehicle.status,
                  }))}
                  value={manualForm.vehicleId || ""}
                  placeholder="Select vehicle"
                  searchPlaceholder="Search vehicles"
                  emptyLabel="No vehicles available"
                  noMatchLabel="No matching vehicles"
                  triggerClassName="w-full min-w-0 max-w-full overflow-hidden"
                />
              </div>
              <div className="grid gap-2">
                <Label>Service type</Label>
                <SearchableSelect
                  onValueChange={(value) =>
                    setManualForm((prev) => ({
                      ...prev,
                      serviceType: value,
                    }))
                  }
                  options={serviceTypeOptions.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  value={manualForm.serviceType || ""}
                  placeholder="Select service type"
                  searchPlaceholder="Search service types"
                  emptyLabel="No service types"
                  noMatchLabel="No matching service types"
                  triggerClassName="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimated cost</Label>
                <Input
                  min="0"
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      estimatedCost: event.target.value,
                    }))
                  }
                  placeholder="0"
                  type="number"
                  value={manualForm.estimatedCost}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tyre brand</Label>
                <Input
                  onChange={(event) =>
                    setManualForm((prev) => ({
                      ...prev,
                      tyreBrand: event.target.value,
                    }))
                  }
                  placeholder="e.g. Michelin"
                  value={manualForm.tyreBrand}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              {selectedDraft ? (
                <>
                  <p className="font-semibold text-slate-900">
                    {selectedDraft.id} - {selectedDraft.serviceType}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Estimated total: ${selectedDraft.total} | Priority: {selectedDraft.priority}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">No draft selected for validation.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Validation results</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <ShieldCheck
                className={validation.policyCompliance ? "text-emerald-600" : "text-rose-600"}
                size={16}
              />
              <p className="text-slate-700">
                Policy compliance:{" "}
                <span className="font-semibold">
                  {validation.policyCompliance ? "Pass" : "Fail"}
                </span>
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <CircleAlert
                className={
                  validation.kbStatus === "within" ? "text-emerald-600" : "text-amber-600"
                }
                size={16}
              />
              <p className="text-slate-700">
                KB price validation: <span className="font-semibold">{kbStatusLabel}</span>
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <AlertTriangle
                className={validation.approvalRequired ? "text-amber-600" : "text-emerald-600"}
                size={16}
              />
              <p className="text-slate-700">
                Approval:{" "}
                <span className="font-semibold">
                  {validation.approvalRequired ? "Required" : "Not required"}
                </span>
                {validation.approvalTriggerAmount != null
                  ? ` (trigger > $${validation.approvalTriggerAmount})`
                  : ""}
              </p>
            </div>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[18rem] space-y-2 overflow-y-auto pr-1">
            {validation.alerts.length === 0 ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                No warnings or errors. Order is ready for submission.
              </p>
            ) : (
              validation.alerts.map((alert, index) => (
                <p
                  key={`${alert.message}-${index}`}
                  className={`rounded-xl border p-3 text-sm ${
                    alert.severity === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {alert.message}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pre-submission draft alerts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review draft orders for policy and pricing issues before final submission.
        </p>
        <div className="card-list-scrollbar mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {draftValidationRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No draft orders to validate.
            </p>
          ) : (
            draftValidationRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {row.id} - {row.serviceType}
                  </p>
                  <p className="text-slate-600">Estimated total: ${row.total}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      row.errorCount > 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {row.errorCount} error(s)
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                    {row.warningCount} warning(s)
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      row.approvalRequired
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {row.approvalRequired ? "Approval required" : "No approval"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default POSValidationControl;
