import { useMemo, useState } from "react";
import {
  BatteryCharging,
  CircleAlert,
  CircleDashed,
  Gauge,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const problemIconMap = {
  "Tyre damage": CircleDashed,
  "Brake issue": CircleAlert,
  "Engine diagnostics": Gauge,
  "Battery / electrical": BatteryCharging,
  "Accident damage": ShieldAlert,
  "General service": Wrench,
};

const previewCostByProblem = {
  "Tyre damage": 520,
  "Brake issue": 740,
  "Engine diagnostics": 680,
  "Battery / electrical": 460,
  "Accident damage": 980,
  "General service": 390,
};

const buildDateChips = (baseValue) => {
  const baseDate = new Date(baseValue);
  const safeBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  safeBase.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, offset) => {
    const next = new Date(safeBase);
    next.setDate(safeBase.getDate() + offset);
    return {
      id: next.toISOString().slice(0, 10),
      label: next.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    };
  });
};

function DriverServiceRequestSection({
  simpleIssueOptions,
  requestForm,
  setRequestForm,
  nearestPosOptions,
  selectedPos,
  slotAvailability,
  selectedSlot,
  onPhotoChange,
  policyValidation,
  eligibilityClass,
  handleSubmitSimpleRequest,
  wizardFeedback,
  driverServiceRequests,
  selectedRequest,
  setSelectedRequestId,
  requestStatusClass,
  formatDateTime,
}) {
  const [showAllStations, setShowAllStations] = useState(false);
  const [collapseToSelectedStation, setCollapseToSelectedStation] = useState(false);
  const [stationSearch, setStationSearch] = useState("");
  const inlineStationLimit = 6;
  const isCollapsedView = collapseToSelectedStation && Boolean(selectedPos);
  const inlineStations = useMemo(() => {
    if (isCollapsedView && selectedPos) {
      return [selectedPos];
    }
    return nearestPosOptions.slice(0, inlineStationLimit);
  }, [isCollapsedView, nearestPosOptions, selectedPos]);
  const hasMoreStations = nearestPosOptions.length > inlineStationLimit;
  const filteredStations = useMemo(() => {
    const query = stationSearch.trim().toLowerCase();
    if (!query) {
      return nearestPosOptions;
    }
    return nearestPosOptions.filter((pos) => {
      const tags = Array.isArray(pos.capabilities) ? pos.capabilities.join(" ") : "";
      return `${pos.name} ${pos.address} ${tags}`.toLowerCase().includes(query);
    });
  }, [nearestPosOptions, stationSearch]);
  const dateChips = useMemo(
    () => buildDateChips(requestForm.preferredDate || new Date().toISOString().slice(0, 10)),
    [requestForm.preferredDate]
  );
  const previewCost = previewCostByProblem[requestForm.problemType] || 420;

  const renderStationCard = (pos, { closeOnSelect = false, fromModal = false } = {}) => {
    const isSelected = requestForm.preferredPosId === pos.id;
    return (
      <button
        className={`rounded-xl border p-3 text-left transition ${
          isSelected
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
        }`}
        key={pos.id}
        onClick={() => {
          setRequestForm((prev) => ({
            ...prev,
            preferredPosId: pos.id,
            preferredSlotId: "",
          }));
          if (fromModal) {
            setCollapseToSelectedStation(true);
          } else {
            setCollapseToSelectedStation(false);
          }
          if (closeOnSelect) {
            setShowAllStations(false);
          }
        }}
        type="button"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold leading-5">{pos.name}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {pos.distanceKm} km
          </span>
        </div>
        <p className={`mt-1 text-xs ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
          {pos.address}
        </p>
        <p className={`mt-1 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
          ETA {pos.etaMin} mins
        </p>
        {Array.isArray(pos.capabilities) && pos.capabilities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {pos.capabilities.slice(0, 3).map((tag) => (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  isSelected ? "bg-white/20 text-slate-100" : "bg-slate-200 text-slate-700"
                }`}
                key={`${pos.id}-${tag}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <section className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Select problem type</h2>
            <p className="mt-1 text-sm text-slate-500">
              Simple visual options for quick request creation.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {simpleIssueOptions.map((option) => {
                const isSelected = requestForm.problemType === option.value;
                const Icon = problemIconMap[option.value] || Wrench;
                return (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={option.value}
                    onClick={() =>
                      setRequestForm((prev) => ({
                        ...prev,
                        problemType: option.value,
                      }))
                    }
                    type="button"
                  >
                    <Icon size={16} />
                    <p className="mt-2 text-sm font-semibold">{option.label}</p>
                    <p className={`mt-1 text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                      {option.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Choose nearest POS</h2>
                {/* <p className="mt-1 text-sm text-slate-500">
                  Compact station cards with quick "See all stations" modal.
                </p> */}
              </div>
              <div className="flex flex-wrap gap-2">
                {(hasMoreStations || isCollapsedView) ? (
                  <Button onClick={() => setShowAllStations(true)} type="button" variant="outline">
                    See all stations
                  </Button>
                ) : null}
                {isCollapsedView && selectedPos ? (
                  <Button
                    onClick={() => {
                      setRequestForm((prev) => ({
                        ...prev,
                        preferredPosId: "",
                        preferredSlotId: "",
                      }));
                      setCollapseToSelectedStation(false);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Unselect POS
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inlineStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No nearby stations found for selected problem type.
                </p>
              ) : (
                inlineStations.map((pos) => renderStationCard(pos))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Select date and slot</h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {dateChips.map((chip) => {
                const active = requestForm.preferredDate === chip.id;
                return (
                  <button
                    className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                    }`}
                    key={chip.id}
                    onClick={() =>
                      setRequestForm((prev) => ({
                        ...prev,
                        preferredDate: chip.id,
                        preferredSlotId: "",
                      }))
                    }
                    type="button"
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {slotAvailability.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  Select POS to see slot availability.
                </p>
              ) : (
                slotAvailability.map((slot) => {
                  const isSelected = requestForm.preferredSlotId === slot.id;
                  const isBusy = slot.status === "Busy";
                  return (
                    <button
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        isBusy
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/40"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                      }`}
                      disabled={isBusy}
                      key={slot.id}
                      onClick={() =>
                        setRequestForm((prev) => ({
                          ...prev,
                          preferredSlotId: slot.id,
                        }))
                      }
                      type="button"
                    >
                      <p className="text-sm font-semibold">{slot.label}</p>
                      <p className="mt-1 text-[11px]">
                        {isBusy ? `Busy (${slot.queue} in queue)` : "Free to book"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            {selectedSlot ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Selected slot: <span className="font-semibold">{selectedSlot.label}</span> on{" "}
                <span className="font-semibold">{requestForm.preferredDate}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Optional details</h2>
            <p className="mt-1 text-sm text-slate-500">Add short note or photos if available.</p>
            <div className="mt-4 space-y-3">
              <Textarea
                onChange={(event) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="What happened? (optional)"
                rows={4}
                value={requestForm.description}
              />
              <Input accept="image/*" multiple onChange={onPhotoChange} type="file" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                {requestForm.photos.length === 0 ? (
                  <p className="text-slate-500">No photos uploaded.</p>
                ) : (
                  <div className="space-y-1 text-slate-700">
                    {requestForm.photos.map((file) => (
                      <p key={file.name}>
                        {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  checked={requestForm.emergency}
                  className="size-4 accent-slate-900"
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      emergency: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Emergency breakdown
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Request summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                Problem: <span className="font-semibold text-slate-900">{requestForm.problemType}</span>
              </p>
              <p>
                Nearest POS:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedPos?.name || "Not selected"}
                </span>
              </p>
              <p>
                Date & slot:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedSlot ? `${requestForm.preferredDate}, ${selectedSlot.label}` : "Not selected"}
                </span>
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Policy validation</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${eligibilityClass(
                    policyValidation.status
                  )}`}
                >
                  {policyValidation.status}
                </span>
                <p className="mt-2 text-xs text-slate-600">{policyValidation.note}</p>
              </div>
              {/* <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated baseline</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">${previewCost}</p>
              </div> */}
              <Button className="w-full" onClick={handleSubmitSimpleRequest} type="button">
                Send request
              </Button>
            </div>
          </div>
        </aside>
      </section>

      {/* 
        Legacy UI (kept commented for future reuse)
        - Quick service request card
        - Nearest POS and slot booking card
        - Optional details + Request check two-column section
        To restore: re-enable previous JSX block from component history (current handlers still compatible).
      */}

      {wizardFeedback ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {wizardFeedback}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Your service request details</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {driverServiceRequests.length} requests
          </span>
        </div>

        {driverServiceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No requests yet. Submit one using the quick form above.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 xl:grid-cols-[340px_1fr]">
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
              {driverServiceRequests.map((order) => {
                const isActive = selectedRequest?.id === order.id;
                return (
                  <button
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={order.id}
                    onClick={() => setSelectedRequestId(order.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{order.id}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isActive ? "bg-white/20 text-white" : requestStatusClass(order.status)
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}>
                      {order.serviceType}
                    </p>
                    <p className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {formatDateTime(order.requestedAt)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {selectedRequest ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-slate-900">
                      {selectedRequest.id} - {selectedRequest.requestTitle}
                    </h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${requestStatusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p>
                      Service type:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.serviceType}
                      </span>
                    </p>
                    <p>
                      Requested at:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatDateTime(selectedRequest.requestedAt)}
                      </span>
                    </p>
                    <p>
                      Priority:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.priority || "Normal"}
                      </span>
                    </p>
                    <p>
                      Emergency:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.emergency ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Location:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.orderDetails?.location || "N/A"}
                      </span>
                    </p>
                    <p>
                      Appointment:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.appointment?.dateTime
                          ? formatDateTime(selectedRequest.appointment.dateTime)
                          : "Not scheduled"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedRequest.orderDetails?.description || "N/A"}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {selectedRequest.orderDetails?.notes || "N/A"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lifecycle
                    </p>
                    <div className="mt-2 space-y-2">
                      {(selectedRequest.lifecycle || [])
                        .slice()
                        .reverse()
                        .slice(0, 6)
                        .map((entry, index) => (
                          <div
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                            key={`${selectedRequest.id}-timeline-${index}`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{entry.stage}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(entry.time)} by {entry.actor || "System"}
                            </p>
                            {entry.note ? (
                              <p className="mt-1 text-xs text-slate-600">{entry.note}</p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {showAllStations ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">All nearby stations</p>
                <p className="text-sm text-slate-500">Select one station to continue</p>
              </div>
              <Button onClick={() => setShowAllStations(false)} type="button" variant="outline">
                Close
              </Button>
            </div>
            <div className="mt-4 max-w-sm">
              <Input
                onChange={(event) => setStationSearch(event.target.value)}
                placeholder="Search station, location or capability..."
                value={stationSearch}
              />
            </div>
            <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No stations found for this search.
                </p>
              ) : (
                filteredStations.map((pos) =>
                  renderStationCard(pos, { closeOnSelect: true, fromModal: true })
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DriverServiceRequestSection;
