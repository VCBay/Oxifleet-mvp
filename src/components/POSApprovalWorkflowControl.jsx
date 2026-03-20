import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  autoApproveServiceRequest,
  checkInServiceVehicle,
  getServiceOrderState,
  rejectServiceRequest,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseAmount = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
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

const formatOdometer = (reading, unit = "km") => {
  if (reading === null || reading === undefined || reading === "") {
    return "N/A";
  }
  const parsed = Number(reading);
  if (!Number.isFinite(parsed)) {
    return "N/A";
  }
  return `${parsed.toLocaleString()} ${unit}`;
};

const getDefaultAppointmentLocal = () => {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  return next.toISOString().slice(0, 16);
};

const toIsoFromLocalInput = (value) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
};

const getAutoApprovalSlot = (order) => {
  if (order?.appointment?.dateTime) {
    return order.appointment.dateTime;
  }
  const requestedAt = new Date(order?.requestedAt || Date.now());
  if (Number.isNaN(requestedAt.getTime())) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  const slot = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
  slot.setHours(9, 0, 0, 0);
  return slot.toISOString();
};

const REJECTION_REASONS = [
  {
    value: "Policy mismatch",
    description: "Selected service is outside policy or contract scope.",
  },
  {
    value: "Stock incomplete",
    description: "Required parts or tyres are not fully available.",
  },
  {
    value: "Capacity unavailable",
    description: "No workshop bay or technician slot is available.",
  },
  {
    value: "Unsupported service",
    description: "Station cannot perform this service type or vehicle class.",
  },
  {
    value: "Invalid odometer",
    description: "Submitted odometer needs correction or vehicle verification.",
  },
  {
    value: "Duplicate booking",
    description: "A matching booking already exists for this vehicle/request.",
  },
];

const getReviewFlags = (order) => {
  const status = normalize(order?.status);
  if (
    status.includes("rejected") ||
    status.includes("scheduled") ||
    status.includes("checked in") ||
    status.includes("progress") ||
    status.includes("completed") ||
    status.includes("invoice")
  ) {
    return [];
  }

  const flags = [];
  const serviceType = normalize(order?.serviceType);
  const notes = normalize(order?.orderDetails?.notes);
  const estimate = parseAmount(order?.orderDetails?.estimatedCost);

  if (order?.emergency) {
    flags.push("Emergency request should be reviewed by POS before slot confirmation.");
  }
  if (serviceType.includes("towing") || serviceType.includes("roadside")) {
    flags.push("Roadside or towing requests require manual dispatch review.");
  }
  if (estimate >= 2500) {
    flags.push("High-value request should be reviewed before booking.");
  }
  if (notes.includes("re-submission") || notes.includes("resubmit")) {
    flags.push("Re-submitted request should be validated before booking.");
  }

  return flags;
};

const getWorkflowStage = (order) => {
  const status = normalize(order?.status);
  if (status.includes("rejected")) {
    return "rejected";
  }
  if (status.includes("scheduled") && order?.appointment?.autoApproved) {
    return "auto_approved";
  }
  if (status.includes("checked in")) {
    return "checked_in";
  }
  if (status.includes("progress")) {
    return "in_service";
  }
  if (status.includes("scheduled")) {
    return "booked";
  }
  if (getReviewFlags(order).length > 0) {
    return "needs_review";
  }
  return "ready_auto";
};

const getStageLabel = (stage) => {
  if (stage === "ready_auto" || stage === "auto_approved") {
    return "Auto-approved";
  }
  if (stage === "needs_review") {
    return "Needs POS review";
  }
  if (stage === "booked") {
    return "Confirmed booking";
  }
  if (stage === "checked_in") {
    return "Checked in";
  }
  if (stage === "in_service") {
    return "In service";
  }
  if (stage === "rejected") {
    return "Rejected";
  }
  return "Open";
};

const stageBadgeClass = (stage) => {
  if (stage === "ready_auto" || stage === "auto_approved") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (stage === "needs_review") {
    return "bg-amber-100 text-amber-700";
  }
  if (stage === "booked") {
    return "bg-sky-100 text-sky-700";
  }
  if (stage === "checked_in") {
    return "bg-violet-100 text-violet-700";
  }
  if (stage === "in_service") {
    return "bg-indigo-100 text-indigo-700";
  }
  if (stage === "rejected") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
};

function POSApprovalWorkflowControl({
  vehicles = [],
  session = null,
  initialApprovalRequestId = "",
  initialQueueOrderId = "",
  initialFocus = "",
}) {
  const navigate = useNavigate();
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState,
  );

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const workflowOrders = useMemo(
    () =>
      [...serviceOrderState.orders]
        .filter((order) => {
          const status = normalize(order.status);
          return !status.includes("completed") && !status.includes("invoice");
        })
        .sort((a, b) => {
          const ta = new Date(a.updatedAt || a.requestedAt).getTime() || 0;
          const tb = new Date(b.updatedAt || b.requestedAt).getTime() || 0;
          return tb - ta;
        }),
    [serviceOrderState.orders],
  );

  const [queueFilter, setQueueFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [appointmentAtLocal, setAppointmentAtLocal] = useState(getDefaultAppointmentLocal);
  const [appointmentNote, setAppointmentNote] = useState("");
  const [calendarChecked, setCalendarChecked] = useState(true);
  const [stockChecked, setStockChecked] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0].value);
  const [rejectionNote, setRejectionNote] = useState("");
  const [checkInOdometer, setCheckInOdometer] = useState("");
  const [checkInUnit, setCheckInUnit] = useState("km");
  const [checkInNote, setCheckInNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionPopup, setActionPopup] = useState({
    open: false,
    title: "",
    detail: "",
  });

  const queueSectionRef = useRef(null);
  const actionSectionRef = useRef(null);
  const historySectionRef = useRef(null);
  const actionLoaderTimeoutRef = useRef(null);
  const actionPopupTimeoutRef = useRef(null);

  const queueCounts = useMemo(
    () =>
      workflowOrders.reduce(
        (acc, order) => {
          const stage = getWorkflowStage(order);
          acc.all += 1;
          acc[stage] += 1;
          return acc;
        },
        {
          all: 0,
          auto_approved: 0,
          ready_auto: 0,
          needs_review: 0,
          booked: 0,
          checked_in: 0,
          in_service: 0,
          rejected: 0,
        },
      ),
    [workflowOrders],
  );

  const filteredOrders = useMemo(() => {
    const query = normalize(searchQuery);
    return workflowOrders.filter((order) => {
      const stage = getWorkflowStage(order);
      if (queueFilter !== "all" && stage !== queueFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = normalize([
        order.id,
        order.vehicleId,
        order.vehicleModel,
        order.requestTitle,
        order.serviceType,
        order.requestedBy,
        order.status,
      ].join(" "));
      return haystack.includes(query);
    });
  }, [queueFilter, searchQuery, workflowOrders]);

  const selectedOrder =
    workflowOrders.find(
      (order) =>
        order.id ===
        (selectedOrderId || initialQueueOrderId || initialApprovalRequestId || filteredOrders[0]?.id || ""),
    ) || null;

  const selectedVehicle = selectedOrder
    ? vehiclesById.get(selectedOrder.vehicleId) || null
    : null;
  const selectedStage = selectedOrder ? getWorkflowStage(selectedOrder) : "";
  const selectedReviewFlags = selectedOrder ? getReviewFlags(selectedOrder) : [];

  const checkInError = useMemo(() => {
    if (!checkInOdometer) {
      return "";
    }
    const current = Number(String(checkInOdometer).replace(/[^0-9]/g, ""));
    if (!Number.isFinite(current) || current < 0) {
      return "Enter a valid odometer reading.";
    }
    const submitted = Number(selectedOrder?.orderDetails?.odometerReading);
    if (Number.isFinite(submitted) && current < submitted) {
      return `Verified odometer cannot be less than the submitted reading of ${submitted.toLocaleString()} ${selectedOrder?.orderDetails?.odometerUnit || "km"}.`;
    }
    return "";
  }, [checkInOdometer, selectedOrder]);

  const showActionSuccess = ({ title, detail }) => {
    if (actionLoaderTimeoutRef.current) {
      window.clearTimeout(actionLoaderTimeoutRef.current);
    }
    if (actionPopupTimeoutRef.current) {
      window.clearTimeout(actionPopupTimeoutRef.current);
    }

    setIsActionLoading(true);
    actionLoaderTimeoutRef.current = window.setTimeout(() => {
      setIsActionLoading(false);
      setActionPopup({
        open: true,
        title,
        detail,
      });
      toast.success(title, {
        description: detail,
        duration: 2600,
      });
      actionPopupTimeoutRef.current = window.setTimeout(() => {
        setActionPopup((prev) => ({ ...prev, open: false }));
      }, 1800);
    }, 650);
  };

  const handleApproveBooking = () => {
    if (!selectedOrder) {
      setFeedback("Select a request first.");
      return;
    }
    if (!calendarChecked || !stockChecked) {
      setFeedback("Calendar and stock checks must be completed before auto-approval.");
      return;
    }
    const appointmentAt = toIsoFromLocalInput(appointmentAtLocal);
    if (!appointmentAt) {
      setFeedback("Choose a valid booking slot.");
      return;
    }
    const updated = autoApproveServiceRequest(selectedOrder.id, {
      appointmentAt,
      actor: session?.name || "POS Desk",
      note: appointmentNote,
      calendarChecked,
      stockChecked,
    });
    if (!updated) {
      setFeedback("Unable to auto-approve the selected request.");
      return;
    }
    const detail =
      selectedStage === "needs_review"
        ? `${updated.id} approved by POS and moved to confirmed booking.`
        : `${updated.id} moved to confirmed booking on the shared calendar.`;
    setFeedback(detail);
    showActionSuccess({
      title: selectedStage === "needs_review" ? "Booking approved" : "Booking auto-approved",
      detail,
    });
  };

  const handleReject = () => {
    if (!selectedOrder) {
      setFeedback("Select a request first.");
      return;
    }
    if (!rejectionReason) {
      setFeedback("Select a rejection reason.");
      return;
    }
    const updated = rejectServiceRequest(selectedOrder.id, {
      actor: session?.name || "POS Desk",
      reasonCode: rejectionReason,
      note: rejectionNote.trim(),
    });
    if (!updated) {
      setFeedback("Unable to reject the selected request.");
      return;
    }
    const detail = `${updated.id} rejected due to ${rejectionReason.toLowerCase()}.`;
    setFeedback(detail);
    setShowRejectForm(false);
    showActionSuccess({
      title: "Booking rejected",
      detail,
    });
  };

  const handleCheckIn = () => {
    if (!selectedOrder) {
      setFeedback("Select a booking first.");
      return;
    }
    if (!checkInOdometer.trim()) {
      setFeedback("Enter the verified odometer at check-in.");
      return;
    }
    if (checkInError) {
      setFeedback(checkInError);
      return;
    }
    const updated = checkInServiceVehicle(selectedOrder.id, {
      actor: session?.name || "POS Desk",
      odometerReading: checkInOdometer,
      odometerUnit: checkInUnit,
      note: checkInNote,
    });
    if (!updated) {
      setFeedback("Unable to check in the vehicle.");
      return;
    }
    const detail = `${updated.id} checked in and odometer synced to Oxifleet vehicle data.`;
    setFeedback(detail);
    showActionSuccess({
      title: "Vehicle checked in",
      detail,
    });
  };

  const handleContinueToOrderManagement = () => {
    if (!selectedOrder) {
      return;
    }
    const params = new URLSearchParams({
      mode: "completion-invoice",
      requestId: selectedOrder.id,
      vehicleId: selectedOrder.vehicleId || "",
      serviceType: selectedOrder.serviceType || "",
    });
    navigate(`/pos-dashboard/order-management?${params.toString()}`);
  };

  useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrderId("");
      return;
    }
    const existsInFiltered = filteredOrders.some((order) => order.id === selectedOrderId);
    if (!existsInFiltered) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }
    const appointmentValue = selectedOrder.appointment?.dateTime
      ? new Date(selectedOrder.appointment.dateTime).toISOString().slice(0, 16)
      : getDefaultAppointmentLocal();
    setAppointmentAtLocal(appointmentValue);
    setAppointmentNote(selectedOrder.appointment?.note || "");
    setCalendarChecked(
      selectedOrder.appointment?.calendarChecked !== undefined
        ? Boolean(selectedOrder.appointment.calendarChecked)
        : true,
    );
    setStockChecked(
      selectedOrder.appointment?.stockChecked !== undefined
        ? Boolean(selectedOrder.appointment.stockChecked)
        : true,
    );
    setCheckInOdometer(
      selectedOrder.checkIn?.odometerReading?.toString() ||
        selectedOrder.orderDetails?.odometerReading?.toString() ||
        selectedVehicle?.odometerReading?.toString() ||
        "",
    );
    setCheckInUnit(
      selectedOrder.checkIn?.odometerUnit ||
        selectedOrder.orderDetails?.odometerUnit ||
        selectedVehicle?.odometerUnit ||
        "km",
    );
    setCheckInNote(selectedOrder.checkIn?.note || "");
    setShowRejectForm(false);
  }, [selectedOrder, selectedVehicle]);

  useEffect(() => {
    workflowOrders.forEach((order) => {
      if (getWorkflowStage(order) !== "ready_auto") {
        return;
      }
      autoApproveServiceRequest(order.id, {
        appointmentAt: getAutoApprovalSlot(order),
        actor: "Shared Calendar",
        note: "Auto-approved through shared calendar availability.",
        calendarChecked: true,
        stockChecked: true,
      });
    });
  }, [workflowOrders]);

  useEffect(() => {
    if (!initialFocus) {
      return;
    }
    const focusMap = {
      queue: queueSectionRef,
      actions: actionSectionRef,
      status: historySectionRef,
      history: historySectionRef,
    };
    const targetRef = focusMap[String(initialFocus).toLowerCase()];
    if (!targetRef?.current) {
      return;
    }
    window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [initialFocus]);

  useEffect(
    () => () => {
      if (actionLoaderTimeoutRef.current) {
        window.clearTimeout(actionLoaderTimeoutRef.current);
      }
      if (actionPopupTimeoutRef.current) {
        window.clearTimeout(actionPopupTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <section className="space-y-6">
      <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#1d3148_0%,#0f1b33_45%,#070b14_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
              Approval Workflow
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/50 sm:text-sm">
              Manage and track approval requests for POS orders, coordinate with
              fleet service team, and oversee driver-to-completion workflow for
              approved requests - all from one centralized dashboard.
            </p>
          </div>
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            key: "auto_approved",
            title: "Auto-approved",
            value: queueCounts.auto_approved + queueCounts.ready_auto,
            icon: CalendarClock,
            valueClassName: "text-emerald-600",
          },
          {
            key: "needs_review",
            title: "Needs review",
            value: queueCounts.needs_review,
            icon: ShieldAlert,
            valueClassName: "text-amber-600",
          },
          {
            key: "booked",
            title: "Confirmed bookings",
            value: queueCounts.booked,
            icon: Clock3,
            valueClassName: "text-sky-600",
          },
          {
            key: "checked_in",
            title: "Checked in",
            value: queueCounts.checked_in,
            icon: CheckCircle2,
            valueClassName: "text-violet-600",
          },
          {
            key: "rejected",
            title: "Rejected",
            value: queueCounts.rejected,
            icon: XCircle,
            valueClassName: "text-rose-600",
          },
        ].map(({ icon: Icon, ...card }) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-700 sm:text-sm">
                <Icon className="text-slate-700" size={14} />
                {card.title}
              </p>
            </div>
            <p className={`mt-3 text-4xl font-semibold leading-none ${card.valueClassName}`}>
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div
          className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm"
          ref={queueSectionRef}
        >
          <h2 className="text-lg font-semibold text-slate-900">Approval queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Shared-calendar bookings can be auto-approved. POS only intervenes for exceptions,
            rejection, and check-in.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["all", `All (${queueCounts.all})`],
              ["auto_approved", `Auto (${queueCounts.auto_approved + queueCounts.ready_auto})`],
              ["needs_review", `Review (${queueCounts.needs_review})`],
              ["booked", `Booked (${queueCounts.booked})`],
              ["checked_in", `Checked-in (${queueCounts.checked_in})`],
              ["rejected", `Rejected (${queueCounts.rejected})`],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  queueFilter === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setQueueFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by request, vehicle, driver"
              value={searchQuery}
            />
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[38rem] space-y-2 overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No requests match the current queue filter.
              </p>
            ) : (
              filteredOrders.map((order) => {
                const stage = getWorkflowStage(order);
                return (
                  <button
                    key={order.id}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedOrder?.id === order.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {order.id} - {order.serviceType}
                        </p>
                        <p className="mt-1 truncate text-xs opacity-80">
                          {order.vehicleId} | {order.requestedBy}
                        </p>
                        <p className="mt-1 text-[11px] opacity-75">
                          {formatDateTime(order.updatedAt || order.requestedAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          selectedOrder?.id === order.id
                            ? "bg-white/15 text-white"
                            : stageBadgeClass(stage)
                        }`}
                      >
                        {getStageLabel(stage)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm"
            ref={actionSectionRef}
          >
            {!selectedOrder ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Select a request to manage approval, rejection, and check-in.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      POS Approval Workflow
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedOrder.id} - {selectedOrder.requestTitle}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedOrder.vehicleId} | {selectedOrder.vehicleModel} | Requested by{" "}
                      {selectedOrder.requestedBy}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${stageBadgeClass(selectedStage)}`}>
                    {getStageLabel(selectedStage)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="text-slate-500">Submitted odometer</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatOdometer(
                        selectedOrder.orderDetails?.odometerReading,
                        selectedOrder.orderDetails?.odometerUnit || "km",
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="text-slate-500">Verified at check-in</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatOdometer(
                        selectedOrder.checkIn?.odometerReading,
                        selectedOrder.checkIn?.odometerUnit || "km",
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="text-slate-500">Requested at</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDateTime(selectedOrder.requestedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="text-slate-500">Booking slot</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.appointment?.dateTime
                        ? formatDateTime(selectedOrder.appointment.dateTime)
                        : "Not booked"}
                    </p>
                  </div>
                </div>

                {selectedReviewFlags.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <ShieldAlert className="size-4" />
                      Manual review required
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-amber-800">
                      {selectedReviewFlags.map((flag) => (
                        <p key={flag}>{flag}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedStage === "needs_review"
                        ? "POS approval"
                        : "Shared calendar status"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedStage === "needs_review"
                        ? "This booking needs POS review before it can be confirmed."
                        : "This booking is auto-approved by the shared calendar when slot and stock rules pass."}
                    </p>
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="appointment-datetime">Confirmed slot</Label>
                        <Input
                          id="appointment-datetime"
                          onChange={(event) => setAppointmentAtLocal(event.target.value)}
                          type="datetime-local"
                          value={appointmentAtLocal}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="appointment-note">Booking note</Label>
                        <Textarea
                          id="appointment-note"
                          onChange={(event) => setAppointmentNote(event.target.value)}
                          placeholder="Shared calendar confirmation or booking context"
                          rows={3}
                          value={appointmentNote}
                        />
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            checked={calendarChecked}
                            className="size-4 accent-slate-900"
                            onChange={(event) => setCalendarChecked(event.target.checked)}
                            type="checkbox"
                          />
                          Calendar checked
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            checked={stockChecked}
                            className="size-4 accent-slate-900"
                            onChange={(event) => setStockChecked(event.target.checked)}
                            type="checkbox"
                          />
                          Stock checked
                        </label>
                      </div>
                      {selectedStage === "needs_review" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                            disabled={!selectedOrder || isActionLoading}
                            onClick={handleApproveBooking}
                            type="button"
                          >
                            <CalendarClock className="mr-2 size-4" />
                            Approve booking
                          </Button>
                          <Button
                            className="bg-rose-600 text-white hover:bg-rose-500"
                            disabled={!selectedOrder || isActionLoading || selectedStage === "rejected"}
                            onClick={() => setShowRejectForm((prev) => !prev)}
                            type="button"
                          >
                            <XCircle className="mr-2 size-4" />
                            Reject
                          </Button>
                        </div>
                      ) : selectedStage === "auto_approved" || selectedStage === "ready_auto" ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                          Auto-approved through shared calendar rules. No manual approval action is required.
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                          Booking is already in workflow. POS can continue with check-in and service execution.
                        </div>
                      )}
                      {showRejectForm && selectedStage === "needs_review" ? (
                        <div className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                          <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">Rejection reason</Label>
                            <select
                              className="h-10 rounded-md border border-rose-200 bg-white px-3 text-sm text-slate-900"
                              id="rejection-reason"
                              onChange={(event) => setRejectionReason(event.target.value)}
                              value={rejectionReason}
                            >
                              {REJECTION_REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.value}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-rose-700">
                              {REJECTION_REASONS.find((reason) => reason.value === rejectionReason)
                                ?.description || ""}
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="rejection-note">Reason note</Label>
                            <Textarea
                              id="rejection-note"
                              onChange={(event) => setRejectionNote(event.target.value)}
                              placeholder="Optional context for driver and fleet"
                              rows={3}
                              value={rejectionNote}
                            />
                          </div>
                          <Button
                            className="bg-rose-600 text-white hover:bg-rose-500"
                            disabled={!selectedOrder || isActionLoading}
                            onClick={handleReject}
                            type="button"
                          >
                            Confirm rejection
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">POS vehicle check-in</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Only POS can check in the vehicle. Verified odometer is stored as the latest
                      Oxifleet vehicle reading.
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                      <div className="grid gap-2">
                        <Label htmlFor="checkin-odometer">Verified odometer</Label>
                        <Input
                          id="checkin-odometer"
                          inputMode="numeric"
                          onChange={(event) => setCheckInOdometer(event.target.value)}
                          placeholder="Enter verified odometer"
                          value={checkInOdometer}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="checkin-unit">Unit</Label>
                        <select
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                          id="checkin-unit"
                          onChange={(event) =>
                            setCheckInUnit(event.target.value === "miles" ? "miles" : "km")
                          }
                          value={checkInUnit}
                        >
                          <option value="km">km</option>
                          <option value="miles">miles</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Label htmlFor="checkin-note">Check-in note</Label>
                      <Textarea
                        id="checkin-note"
                        onChange={(event) => setCheckInNote(event.target.value)}
                        placeholder="Arrival condition, late arrival, mismatch note"
                        rows={3}
                        value={checkInNote}
                      />
                    </div>
                    {checkInError ? (
                      <p className="mt-2 text-xs font-medium text-rose-600">{checkInError}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="bg-violet-600 text-white hover:bg-violet-500"
                        disabled={
                          !selectedOrder ||
                          isActionLoading ||
                          (selectedStage !== "booked" && selectedStage !== "auto_approved")
                        }
                        onClick={handleCheckIn}
                        type="button"
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Check in vehicle
                      </Button>
                      <Button
                        className="bg-sky-600 text-white hover:bg-sky-500"
                        disabled={
                          !selectedOrder ||
                          isActionLoading ||
                          (selectedStage !== "checked_in" && selectedStage !== "in_service")
                        }
                        onClick={handleContinueToOrderManagement}
                        type="button"
                      >
                        Create Order
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Vehicle context</h3>
                    <div className="mt-3 space-y-2 text-xs text-slate-700">
                      <p>
                        Plate:{" "}
                        <span className="font-semibold text-slate-900">
                          {selectedVehicle?.plate || "N/A"}
                        </span>
                      </p>
                      <p>
                        Type:{" "}
                        <span className="font-semibold text-slate-900">
                          {selectedVehicle?.type || "N/A"}
                        </span>
                      </p>
                      <p>
                        Latest vehicle odometer:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatOdometer(
                            selectedVehicle?.odometerReading,
                            selectedVehicle?.odometerUnit || "km",
                          )}
                        </span>
                      </p>
                      <p>
                        Request status:{" "}
                        <span className="font-semibold text-slate-900">{selectedOrder.status}</span>
                      </p>
                      <p>
                        Approval note:{" "}
                        <span className="font-semibold text-slate-900">
                          {selectedOrder.approval?.note || "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm"
            ref={historySectionRef}
          >
            <h2 className="text-lg font-semibold text-slate-900">Workflow history</h2>
            <p className="mt-1 text-sm text-slate-500">
              Every approval, rejection, booking, and check-in event is recorded here.
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {!selectedOrder ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  Select a request to view workflow history.
                </p>
              ) : (
                selectedOrder.lifecycle
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${selectedOrder.id}-${entry.time}-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{entry.stage}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(entry.time)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Actor: {entry.actor}</p>
                      {entry.note ? (
                        <p className="mt-2 text-xs text-slate-700">{entry.note}</p>
                      ) : null}
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      {isActionLoading ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-2xl">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">Processing workflow action...</p>
            <p className="mt-1 text-xs text-slate-500">
              Updating booking state and syncing related operational data.
            </p>
          </div>
        </div>
      ) : null}

      {actionPopup.open ? (
        <div className="fixed inset-x-3 top-24 z-[71] flex justify-center sm:top-20">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{actionPopup.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{actionPopup.detail}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default POSApprovalWorkflowControl;
