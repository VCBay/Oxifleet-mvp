const normalize = (value) => String(value || "").trim().toLowerCase();

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

const formatDate = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return "N/A";
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export function buildDriverBookingNotifications({
  nextServiceDate,
  scopedOrders = [],
  vehicleId,
}) {
  const rows = [];

  rows.push({
    id: "NTF-SERVICE-DUE",
    type: "Service due reminders",
    iconKey: "service_due",
    title: `Next service due on ${formatDate(nextServiceDate)}`,
    detail: `${vehicleId || "Vehicle"} is approaching service milestone.`,
    levelClass: "bg-slate-800 text-slate-100",
    actionLabel: "View bookings",
    actionMenu: "booking_tracking",
  });

  scopedOrders.forEach((order) => {
    const approvalDecision = normalize(order?.approval?.decision);
    if (approvalDecision === "approved" || approvalDecision === "rejected") {
      rows.push({
        id: `NTF-APPROVAL-${order.id}`,
        type: "Approval granted/rejected alerts",
        iconKey: approvalDecision === "approved" ? "approval_ok" : "approval_rejected",
        title:
          approvalDecision === "approved"
            ? `Approval granted for ${order.id}`
            : `Approval rejected for ${order.id}`,
        detail: order?.approval?.note || `Order ${order.id} has a new approval decision.`,
        levelClass:
          approvalDecision === "approved"
            ? "bg-emerald-900 text-emerald-100"
            : "bg-rose-900 text-rose-100",
        actionLabel: "Open workflow",
        actionMenu: "booking_tracking",
        orderId: order.id,
      });
    }

    const status = normalize(order.status);
    if (
      status.includes("pending booking") ||
      status.includes("scheduled") ||
      status.includes("approved") ||
      status.includes("progress")
    ) {
      const appointmentText = order?.appointment?.dateTime
        ? ` Appointment: ${formatDateTime(order.appointment.dateTime)}.`
        : "";
      rows.push({
        id: `NTF-BOOKING-${order.id}`,
        type: "Booking confirmations",
        iconKey: "booking",
        title: `Booking update: ${order.id}`,
        detail: `${order.serviceType} is currently ${order.status}.${appointmentText}`,
        levelClass: "bg-sky-900 text-sky-100",
        actionLabel: "Track booking",
        actionMenu: "booking_tracking",
        orderId: order.id,
      });
    }

    if (status.includes("rejected")) {
      rows.push({
        id: `NTF-REJECT-${order.id}`,
        type: "Order rejection reasons",
        iconKey: "warning",
        title: `Order ${order.id} was rejected`,
        detail:
          order?.approval?.note ||
          order?.lifecycle?.[order.lifecycle.length - 1]?.note ||
          "Please review and re-submit with corrections.",
        levelClass: "bg-amber-900 text-amber-100",
        actionLabel: "Fix request",
        actionMenu: "service_request",
        orderId: order.id,
      });
    }

    if (order.emergency) {
      rows.push({
        id: `NTF-EMERGENCY-${order.id}`,
        type: "Emergency updates",
        iconKey: "emergency",
        title: `Emergency request ${order.id}`,
        detail: `${order.serviceType} marked as emergency. Track updates closely.`,
        levelClass: "bg-rose-900 text-rose-100",
        actionLabel: "Emergency help",
        actionMenu: "communication",
        orderId: order.id,
      });
    }
  });

  const unique = Array.from(new Map(rows.map((item) => [item.id, item])).values());
  return unique;
}
