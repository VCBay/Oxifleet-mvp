import { useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Siren,
  XCircle,
} from "lucide-react";

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

const badgeClassByStatus = (status) => {
  const normalized = normalize(status);
  if (normalized.includes("rejected")) {
    return "bg-rose-900 text-rose-100 ring-1 ring-rose-700/60";
  }
  if (normalized.includes("completed") || normalized.includes("closed")) {
    return "bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/60";
  }
  if (normalized.includes("progress")) {
    return "bg-sky-900 text-sky-100 ring-1 ring-sky-700/60";
  }
  if (normalized.includes("approved")) {
    return "bg-indigo-900 text-indigo-100 ring-1 ring-indigo-700/60";
  }
  return "bg-amber-900 text-amber-100 ring-1 ring-amber-700/60";
};

function DriverBookingTrackingPanel({
  displayName,
  vehicle,
  nextServiceDate,
  orders = [],
}) {
  const scopedOrders = useMemo(() => {
    const vehicleId = normalize(vehicle?.id);
    const driverName = normalize(displayName);
    const rows = orders
      .filter((order) => {
        const matchesVehicle = normalize(order?.vehicleId) === vehicleId;
        const matchesDriver = normalize(order?.requestedBy) === driverName;
        return matchesVehicle || matchesDriver;
      })
      .sort(
        (a, b) =>
          (toDate(b?.requestedAt)?.getTime() || 0) -
          (toDate(a?.requestedAt)?.getTime() || 0)
      );

    if (rows.length > 0) {
      return rows;
    }

    return [
      {
        id: "SR-DRV-001",
        vehicleId: vehicle?.id || "N/A",
        serviceType: "General service",
        status: "Pending approval",
        requestedAt: new Date().toISOString(),
        requestedBy: displayName || "Driver",
        emergency: false,
        approval: {},
        lifecycle: [
          {
            stage: "Requested",
            actor: displayName || "Driver",
            time: new Date().toISOString(),
            note: "Auto-created sample booking for tracking view.",
          },
        ],
      },
    ];
  }, [displayName, orders, vehicle?.id]);

  const upcomingBookings = useMemo(
    () =>
      scopedOrders.filter((order) => {
        const status = normalize(order.status);
        return !status.includes("rejected") && !status.includes("completed");
      }),
    [scopedOrders]
  );

  const bookingHistory = useMemo(
    () =>
      scopedOrders.filter((order) => {
        const status = normalize(order.status);
        return status.includes("rejected") || status.includes("completed");
      }),
    [scopedOrders]
  );

  const liveBooking = useMemo(
    () =>
      upcomingBookings.find((order) => normalize(order.status).includes("progress")) ||
      upcomingBookings[0] ||
      null,
    [upcomingBookings]
  );

  const notifications = useMemo(() => {
    const rows = [];
    rows.push({
      id: "NTF-SERVICE-DUE",
      type: "Service due reminders",
      icon: CalendarClock,
      title: `Next service due on ${formatDate(nextServiceDate)}`,
      detail: `${vehicle?.id || "Vehicle"} is approaching service milestone.`,
      levelClass: "bg-slate-800 text-slate-100",
    });

    scopedOrders.forEach((order) => {
      const approvalDecision = normalize(order?.approval?.decision);
      if (approvalDecision === "approved" || approvalDecision === "rejected") {
        rows.push({
          id: `NTF-APPROVAL-${order.id}`,
          type: "Approval granted/rejected alerts",
          icon: approvalDecision === "approved" ? CheckCircle2 : XCircle,
          title:
            approvalDecision === "approved"
              ? `Approval granted for ${order.id}`
              : `Approval rejected for ${order.id}`,
          detail:
            order?.approval?.note ||
            `Order ${order.id} has a new approval decision.`,
          levelClass:
            approvalDecision === "approved"
              ? "bg-emerald-900 text-emerald-100"
              : "bg-rose-900 text-rose-100",
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
          icon: Bell,
          title: `Booking update: ${order.id}`,
          detail: `${order.serviceType} is currently ${order.status}.${appointmentText}`,
          levelClass: "bg-sky-900 text-sky-100",
        });
      }

      if (status.includes("rejected")) {
        rows.push({
          id: `NTF-REJECT-${order.id}`,
          type: "Order rejection reasons",
          icon: AlertTriangle,
          title: `Order ${order.id} was rejected`,
          detail:
            order?.approval?.note ||
            order?.lifecycle?.[order.lifecycle.length - 1]?.note ||
            "Please review and re-submit with corrections.",
          levelClass: "bg-amber-900 text-amber-100",
        });
      }

      if (order.emergency) {
        rows.push({
          id: `NTF-EMERGENCY-${order.id}`,
          type: "Emergency updates",
          icon: Siren,
          title: `Emergency request ${order.id}`,
          detail: `${order.serviceType} marked as emergency. Track updates closely.`,
          levelClass: "bg-rose-900 text-rose-100",
        });
      }
    });

    const unique = Array.from(new Map(rows.map((item) => [item.id, item])).values());
    return unique.slice(0, 20);
  }, [nextServiceDate, scopedOrders, vehicle?.id]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Upcoming bookings</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {upcomingBookings.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Booking history</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {bookingHistory.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Live status</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {liveBooking?.status || "No active bookings"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Active workflows</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {upcomingBookings.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
          <div className="mt-4 space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming bookings.</p>
            ) : (
              upcomingBookings.slice(0, 6).map((booking) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  key={booking.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {booking.id} - {booking.serviceType}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClassByStatus(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Requested: {formatDateTime(booking.requestedAt)}
                  </p>
                  {booking?.appointment?.dateTime ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Appointment: {formatDateTime(booking.appointment.dateTime)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Booking history</h2>
          <div className="mt-4 space-y-3">
            {bookingHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No historical bookings yet.</p>
            ) : (
              bookingHistory.slice(0, 6).map((booking) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  key={booking.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {booking.id} - {booking.serviceType}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClassByStatus(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Updated: {formatDateTime(booking.updatedAt || booking.requestedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Live booking status tracking
          </h2>
          {!liveBooking ? (
            <p className="mt-4 text-sm text-slate-500">
              No active booking available for live tracking.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {liveBooking.id} - {liveBooking.serviceType}
                </p>
                <p className="text-xs text-slate-500">
                  Current status: {liveBooking.status}
                </p>
                {liveBooking?.appointment?.dateTime ? (
                  <p className="text-xs text-slate-500">
                    Appointment: {formatDateTime(liveBooking.appointment.dateTime)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                {(liveBooking.lifecycle || [])
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((entry, index) => (
                    <div
                      className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                      key={`${liveBooking.id}-lifecycle-${index}`}
                    >
                      <Clock3 className="mt-0.5 text-slate-500" size={16} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.stage}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(entry.time)} by {entry.actor}
                        </p>
                        {entry.note ? (
                          <p className="mt-1 text-xs text-slate-600">{entry.note}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-2">
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                key={item.id}
              >
                <span className={`mt-0.5 rounded-full p-1 ${item.levelClass}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.type}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default DriverBookingTrackingPanel;
