import { useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession, subscribeSession } from "../auth/session";
import DriverSidebar from "../components/driver/DriverSidebar";
import DriverTopbar from "../components/driver/DriverTopbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  DRIVER_SERVICE_CATEGORIES as simpleIssueOptions,
  POINT_S_STATIONS as stationOptions,
} from "../data/driverBookingCatalog";

const driverMenuRouteMap = {
  overview: "overview",
  service_request: "service-request",
  booking_tracking: "booking-tracking",
  documents_history: "documents-history",
  communication: "communication",
  profile: "profile",
};

const slotTemplates = [
  { id: "08:30", label: "08:30 - 09:15" },
  { id: "09:30", label: "09:30 - 10:15" },
  { id: "10:30", label: "10:30 - 11:15" },
  { id: "11:30", label: "11:30 - 12:15" },
  { id: "13:30", label: "13:30 - 14:15" },
  { id: "14:30", label: "14:30 - 15:15" },
  { id: "15:30", label: "15:30 - 16:15" },
  { id: "16:30", label: "16:30 - 17:15" },
];

const hashText = (text) => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }
  return Math.abs(hash);
};

const buildSlotAvailability = ({ posId, date, problemType }) => {
  if (!posId || !date) {
    return [];
  }
  const keyBase = `${posId}|${date}|${problemType}`;
  return slotTemplates.map((slot, index) => {
    const slotHash = hashText(`${keyBase}|${slot.id}|${index}`);
    const busy = slotHash % 5 === 0 || slotHash % 7 === 0;
    return {
      id: `${date}-${slot.id}`,
      label: slot.label,
      status: busy ? "Busy" : "Free",
      queue: busy ? 2 + (slotHash % 4) : 0,
    };
  });
};

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
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

const getTomorrowDateInput = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
};

const requestStatusClass = (value) => {
  const status = String(value || "").toLowerCase();
  if (status.includes("rejected")) {
    return "bg-rose-900 text-rose-100 ring-1 ring-rose-700/60";
  }
  if (status.includes("completed")) {
    return "bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/60";
  }
  if (status.includes("progress")) {
    return "bg-sky-900 text-sky-100 ring-1 ring-sky-700/60";
  }
  if (status.includes("approved")) {
    return "bg-indigo-900 text-indigo-100 ring-1 ring-indigo-700/60";
  }
  return "bg-amber-900 text-amber-100 ring-1 ring-amber-700/60";
};

const getPolicyStatus = (problemType, emergency) => {
  if (emergency) {
    return {
      status: "Approval Required",
      note: "Emergency requests need fleet manager approval.",
    };
  }
  if (problemType === "Schadensmeldung" || problemType === "Accident damage") {
    return {
      status: "Not Covered",
      note: "Accident-related repairs require manual policy exception.",
    };
  }
  return {
    status: "Allowed",
    note: "Current policy allows direct booking for this service type.",
  };
};

const dummyRequests = [
  {
    id: "SR-4011",
    requestTitle: "Reifen request",
    serviceType: "Reifen",
    status: "Pending approval",
    requestedAt: "2026-03-05T08:30:00.000Z",
    priority: "Normal",
    emergency: false,
    orderDetails: {
      location: "Dallas, TX",
      description: "Left rear tyre pressure loss after route shift.",
      notes: "Photo shared from parking bay.",
    },
    lifecycle: [
      {
        stage: "Requested",
        time: "2026-03-05T08:30:00.000Z",
        actor: "Driver",
        note: "Issue raised from app.",
      },
    ],
  },
  {
    id: "SR-3987",
    requestTitle: "Technisches Problem request",
    serviceType: "Technisches Problem",
    status: "Approved",
    requestedAt: "2026-03-03T07:15:00.000Z",
    priority: "High",
    emergency: false,
    orderDetails: {
      location: "Austin, TX",
      description: "Brake warning light visible on dashboard.",
      notes: "Fleet approved with standard budget.",
    },
    lifecycle: [
      {
        stage: "Requested",
        time: "2026-03-03T07:15:00.000Z",
        actor: "Driver",
        note: "Issue raised from app.",
      },
      {
        stage: "Approved",
        time: "2026-03-03T10:10:00.000Z",
        actor: "Fleet Manager",
        note: "Approved for scheduled visit.",
      },
    ],
  },
];

function DriverServiceRequestPreviewPage() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const navigate = useNavigate();
  const [requestForm, setRequestForm] = useState({
    problemType: simpleIssueOptions[0]?.value || "Reifen",
    description: "",
    emergency: false,
    photos: [],
    preferredPosId: "",
    preferredDate: getTomorrowDateInput(),
    preferredSlotId: "",
  });
  const [selectedRequestId, setSelectedRequestId] = useState(dummyRequests[0].id);
  const [showAllStations, setShowAllStations] = useState(false);
  const [collapseToSelectedStation, setCollapseToSelectedStation] = useState(false);
  const [wizardFeedback, setWizardFeedback] = useState("");

  const displayName = session?.driverName || session?.name || "Driver";
  const displayEmail = session?.email || "driver@oxifleet.com";
  const profileInitials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "DR";

  const selectedPos = useMemo(
    () => stationOptions.find((station) => station.id === requestForm.preferredPosId) || null,
    [requestForm.preferredPosId]
  );
  const isCollapsedView = collapseToSelectedStation && Boolean(selectedPos);
  const inlineStations = useMemo(() => {
    if (isCollapsedView && selectedPos) {
      return [selectedPos];
    }
    return stationOptions.slice(0, 6);
  }, [isCollapsedView, selectedPos]);
  const slotAvailability = useMemo(
    () =>
      buildSlotAvailability({
        posId: requestForm.preferredPosId,
        date: requestForm.preferredDate,
        problemType: requestForm.problemType,
      }),
    [requestForm.preferredDate, requestForm.preferredPosId, requestForm.problemType]
  );
  const selectedSlot = useMemo(
    () =>
      slotAvailability.find(
        (slot) => slot.id === requestForm.preferredSlotId && slot.status === "Free"
      ) || null,
    [requestForm.preferredSlotId, slotAvailability]
  );
  const policyValidation = useMemo(
    () => getPolicyStatus(requestForm.problemType, requestForm.emergency),
    [requestForm.emergency, requestForm.problemType]
  );
  const policyStatusLabel = "Covered";
  const policyStatusClass = eligibilityClass("Allowed");
  const selectedRequest = useMemo(
    () => dummyRequests.find((item) => item.id === selectedRequestId) || dummyRequests[0],
    [selectedRequestId]
  );

  const onSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  const onPhotoChange = (event) => {
    const files = Array.from(event.target.files || []);
    setRequestForm((prev) => ({ ...prev, photos: files.slice(0, 6) }));
  };

  const handleSubmitPreview = () => {
    if (!requestForm.preferredPosId) {
      setWizardFeedback("Select a nearby Point S station first.");
      return;
    }
    if (!selectedSlot) {
      setWizardFeedback("Select a free slot to continue.");
      return;
    }
    setWizardFeedback("Preview submitted (legacy UI view). Live flow remains unchanged.");
  };

  const eligibilityClass = (value) => {
    if (value === "Allowed") {
      return "bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/60";
    }
    if (value === "Approval Required") {
      return "bg-amber-900 text-amber-100 ring-1 ring-amber-700/60";
    }
    return "bg-rose-900 text-rose-100 ring-1 ring-rose-700/60";
  };

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full">
        <DriverSidebar
          activeMenu="service_request"
          onMenuClick={(menuKey) =>
            navigate(`/driver-dashboard/${driverMenuRouteMap[menuKey] || driverMenuRouteMap.overview}`)
          }
          onSignOut={onSignOut}
        />

        <section className="ml-72 flex-1 space-y-6 overflow-y-auto p-8">
          <DriverTopbar
            activeMenu="service_request"
            displayEmail={displayEmail}
            displayName={displayName}
            driverNotificationCount={2}
            profileInitials={profileInitials}
          />

          <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Legacy UI Preview
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                  Previous Driver Service Request UI
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  This route is only for comparing old UI style.
                </p>
              </div>
              <Button onClick={() => navigate("/driver-dashboard/service-request")} type="button" variant="outline">
                Back to Live Flow
              </Button>
            </div>
          </section>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quick service request</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tap the service category, add a note or photo if possible, then send.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {simpleIssueOptions.map((option) => {
                const isSelected = requestForm.problemType === option.value;
                return (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"
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
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className={`mt-1 text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                      {option.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Nearest Point S station and slot booking
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Pick nearby workshop and choose a free time slot.
                </p>
              </div>
              <div className="w-full max-w-[220px]">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="legacy-preview-date">
                  Preferred date
                </label>
                <Input
                  id="legacy-preview-date"
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      preferredDate: event.target.value,
                      preferredSlotId: "",
                    }))
                  }
                  type="date"
                  value={requestForm.preferredDate}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inlineStations.map((pos) => {
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
                      setCollapseToSelectedStation(false);
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
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button onClick={() => setShowAllStations(true)} type="button" variant="outline">
                See all stations
              </Button>
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
                  Unselect station
                </Button>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedPos ? `Available slots at ${selectedPos.name}` : "Available slots"}
                </p>
                <p className="text-xs text-slate-500">
                  Free slots are selectable, busy slots are blocked.
                </p>
              </div>
              {slotAvailability.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Select a Point S station and date to load slots.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {slotAvailability.map((slot) => {
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
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Optional details</h3>
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

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Request check</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>
                  Problem: <span className="font-semibold text-slate-900">{requestForm.problemType}</span>
                </p>
                <p>
                  Nearest Point S:{" "}
                  <span className="font-semibold text-slate-900">{selectedPos?.name || "Not selected"}</span>
                </p>
                <p>
                  Date & slot:{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedSlot ? `${requestForm.preferredDate}, ${selectedSlot.label}` : "Not selected"}
                  </span>
                </p>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${policyStatusClass}`}
                  >
                    {policyStatusLabel}
                  </span>
                  <p className="mt-2 text-sm text-slate-600">{policyValidation.note}</p>
                </div>
                <Button className="w-full" onClick={handleSubmitPreview} type="button">
                  Send request
                </Button>
              </div>
            </div>
          </div>

          {wizardFeedback ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {wizardFeedback}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Your service request details</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {dummyRequests.length} requests
              </span>
            </div>
            <div className="mt-4 grid gap-6 xl:grid-cols-[340px_1fr]">
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
                {dummyRequests.map((order) => {
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
                    Service type: <span className="font-semibold text-slate-900">{selectedRequest.serviceType}</span>
                  </p>
                  <p>
                    Requested at:{" "}
                    <span className="font-semibold text-slate-900">{formatDateTime(selectedRequest.requestedAt)}</span>
                  </p>
                  <p>
                    Priority: <span className="font-semibold text-slate-900">{selectedRequest.priority}</span>
                  </p>
                  <p>
                    Emergency:{" "}
                    <span className="font-semibold text-slate-900">{selectedRequest.emergency ? "Yes" : "No"}</span>
                  </p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedRequest.orderDetails.description}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{selectedRequest.orderDetails.notes}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showAllStations ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">All nearby Point S stations</p>
                <p className="text-sm text-slate-500">Legacy UI preview modal</p>
              </div>
              <Button onClick={() => setShowAllStations(false)} type="button" variant="outline">
                Close
              </Button>
            </div>
            <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {stationOptions.map((pos) => {
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
                      setCollapseToSelectedStation(true);
                      setShowAllStations(false);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{pos.name}</p>
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default DriverServiceRequestPreviewPage;
