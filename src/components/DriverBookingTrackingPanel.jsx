import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Siren,
  XCircle,
} from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import { buildDriverBookingNotifications } from "../lib/driverBookingNotifications";
import { Input } from "./ui/input";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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
  const { t } = useTranslation();
  const [bookingSearch, setBookingSearch] = useState("");
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
          (toDate(a?.requestedAt)?.getTime() || 0),
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
    [scopedOrders],
  );

  const filteredUpcomingBookings = useMemo(() => {
    const query = normalize(bookingSearch);
    if (!query) {
      return upcomingBookings;
    }
    return upcomingBookings.filter((booking) =>
      [booking.id, booking.serviceType, booking.status].some((value) =>
        normalize(value).includes(query),
      ),
    );
  }, [bookingSearch, upcomingBookings]);

  const bookingHistory = useMemo(
    () =>
      scopedOrders.filter((order) => {
        const status = normalize(order.status);
        return status.includes("rejected") || status.includes("completed");
      }),
    [scopedOrders],
  );

  const filteredBookingHistory = useMemo(() => {
    const query = normalize(bookingSearch);
    if (!query) {
      return bookingHistory;
    }
    return bookingHistory.filter((booking) =>
      [booking.id, booking.serviceType, booking.status].some((value) =>
        normalize(value).includes(query),
      ),
    );
  }, [bookingHistory, bookingSearch]);

  const liveBooking = useMemo(
    () =>
      upcomingBookings.find((order) =>
        normalize(order.status).includes("progress"),
      ) ||
      upcomingBookings[0] ||
      null,
    [upcomingBookings],
  );

  const iconByNotificationKey = {
    service_due: CalendarClock,
    approval_ok: CheckCircle2,
    approval_rejected: XCircle,
    booking: Bell,
    warning: AlertTriangle,
    emergency: Siren,
  };

  const notifications = useMemo(
    () =>
      buildDriverBookingNotifications({
        nextServiceDate,
        scopedOrders,
        vehicleId: vehicle?.id,
      }),
    [nextServiceDate, scopedOrders, vehicle?.id],
  );
  const overviewCards = useMemo(() => {
    const liveStatus = liveBooking?.status || "No active bookings";
    const activeWorkflows = upcomingBookings.length;
    return [
      {
        key: "upcoming",
        title: "Upcoming bookings",
        icon: CalendarClock,
        value: upcomingBookings.length,
        valueType: "number",
      },
      {
        key: "history",
        title: "Booking history",
        icon: CheckCircle2,
        value: bookingHistory.length,
        valueType: "number",
      },
      {
        key: "live",
        title: "Live status",
        icon: Bell,
        value: liveStatus,
        valueType: "text",
      },
      {
        key: "workflows",
        title: "Active workflows",
        icon: AlertTriangle,
        value: activeWorkflows,
        valueType: "number",
      },
    ].map((card) => {
      const numericValue = Number(card.value) || 0;
      return {
        ...card,
        trendPercent: card.valueType === "number" ? 15 : 0,
        lastMonthValue:
          card.valueType === "number"
            ? Math.max(0, Math.round(numericValue * 0.85))
            : t("driver.tracking.monitoring", "Monitoring"),
      };
    });
  }, [bookingHistory.length, liveBooking?.status, upcomingBookings.length, t]);

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.tracking.upcomingBookings", "Upcoming bookings")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredUpcomingBookings.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.tracking.bookingHistory", "Booking history")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredBookingHistory.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.tracking.liveStatus", "Live status")}</p>
          <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
            {liveBooking?.status || t("driver.tracking.noActiveBookings", "No active bookings")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.tracking.activeWorkflows", "Active workflows")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {upcomingBookings.length}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {t("driver.tracking.findBookings", "Find bookings")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {t("driver.tracking.findBookingsDesc", "Search by booking code, service type, or status.")}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              onChange={(event) => setBookingSearch(event.target.value)}
              placeholder={t("driver.tracking.searchBookings", "Search bookings")}
              value={bookingSearch}
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-4 sm:gap-6 xl:grid-cols-2">
        <div className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 xl:h-[30rem]">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {t("driver.tracking.upcomingBookings", "Upcoming bookings")}
          </h2>
          <div className="sidebar-scrollbar mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 sm:pr-2">
            {filteredUpcomingBookings.length === 0 ? (
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("driver.tracking.noUpcomingBookings", "No upcoming bookings found.")}
              </p>
            ) : (
              filteredUpcomingBookings.map((booking) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  key={booking.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-xs font-semibold text-slate-900 sm:text-sm">
                      {booking.id} - {booking.serviceType}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold sm:text-xs ${badgeClassByStatus(
                        booking.status,
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                    {t("driver.tracking.requested", "Requested")}: {formatDateTime(booking.requestedAt)}
                  </p>
                  {booking?.appointment?.dateTime ? (
                    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                      {t("driver.tracking.appointment", "Appointment")}:{" "}
                      {formatDateTime(booking.appointment.dateTime)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6 xl:h-[30rem]">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {t("driver.tracking.bookingHistory", "Booking history")}
          </h2>
          <div className="sidebar-scrollbar mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 sm:pr-2">
            {filteredBookingHistory.length === 0 ? (
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("driver.tracking.noHistoricalBookings", "No historical bookings found.")}
              </p>
            ) : (
              filteredBookingHistory.map((booking) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  key={booking.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-xs font-semibold text-slate-900 sm:text-sm">
                      {booking.id} - {booking.serviceType}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold sm:text-xs ${badgeClassByStatus(
                        booking.status,
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                    {t("driver.tracking.updated", "Updated")}:{" "}
                    {formatDateTime(booking.updatedAt || booking.requestedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          {t("driver.tracking.liveBookingStatusTracking", "Live booking status tracking")}
        </h2>
        {!liveBooking ? (
          <p className="mt-4 text-xs text-slate-500 sm:text-sm">
            {t("driver.tracking.noLiveBooking", "No active booking available for live tracking.")}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="break-words text-xs font-semibold text-slate-900 sm:text-sm">
                {liveBooking.id} - {liveBooking.serviceType}
              </p>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                {t("driver.tracking.currentStatus", "Current status")}: {liveBooking.status}
              </p>
              {liveBooking?.appointment?.dateTime ? (
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  {t("driver.tracking.appointment", "Appointment")}:{" "}
                  {formatDateTime(liveBooking.appointment.dateTime)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                {(() => {
                  const entries = (liveBooking.lifecycle || [])
                    .slice()
                    .reverse()
                    .slice(0, 6);
                  return (
                    <div className="relative">
                      {entries.length > 1 ? (
                        <span className="absolute left-[9px] top-2 h-[calc(100%-1rem)] w-px bg-emerald-500/60" />
                      ) : null}
                      {entries.map((entry, index) => {
                        const isLast = index === entries.length - 1;
                        return (
                          <div
                            className={`relative pl-8 ${isLast ? "" : "pb-4 sm:pb-5"}`}
                            key={`${liveBooking.id}-lifecycle-${index}`}
                          >
                            <span className="absolute left-0 top-0.5 grid size-5 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-emerald-100">
                              <CheckCircle2 size={12} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                                {entry.stage},{" "}
                                <span className="font-medium text-slate-700">
                                  {formatDateTime(entry.time)}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 sm:text-xs">
                                {t("driver.request.by", "by")} {entry.actor}
                              </p>
                              {entry.note ? (
                                <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                                  {entry.note}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Notifications</h2>
        <div className="card-list-scrollbar mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1 sm:max-h-[340px] sm:pr-2">
          {notifications.map((item) => {
            const Icon = iconByNotificationKey[item.iconKey] || Bell;
            return (
              <div
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                key={item.id}
              >
                <span className={`mt-0.5 shrink-0 rounded-full p-1 ${item.levelClass}`}>
                  <Icon size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.type}
                  </p>
                  <p className="text-xs font-semibold text-slate-900 sm:text-sm">{item.title}</p>
                  <p className="text-[11px] text-slate-600 sm:text-xs">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div> */}
    </section>
  );
}

export default DriverBookingTrackingPanel;
