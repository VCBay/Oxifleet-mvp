import {
  CalendarClock,
  ClipboardList,
  FileText,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";

const normalize = (value) => String(value || "").trim().toLowerCase();

function DriverOverviewSection({
  analytics,
  driverServiceRequests,
  eligibilityClass,
  matchingPolicies,
  vehicle,
  serviceEligibility,
  nextService,
  seasonalReminder,
  warranty,
  formatDate,
  formatDateTime,
  licenseReminder,
}) {
  const { t } = useTranslation();
  const pendingRequests = driverServiceRequests.filter((request) => {
    const status = normalize(request.status);
    return !status.includes("completed") && !status.includes("rejected");
  });
  const nextBooking =
    pendingRequests.find((request) => request.appointment?.dateTime) ||
    pendingRequests[0] ||
    null;
  const recentRequests = driverServiceRequests.slice(0, 4);

  const summaryCards = [
    {
      title: t("driver.overview.nextServiceDue", "Next service due"),
      value:
        analytics.daysToNextService < 0
          ? t("driver.overview.overdue", "Overdue")
          : t("driver.overview.daysCount", "{{count}} days", {
              count: analytics.daysToNextService,
            }),
      helper: `${nextService.serviceType} on ${formatDate(nextService.date)}`,
      tone:
        analytics.daysToNextService <= 10
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700",
      icon: CalendarClock,
    },
    {
      title: t("driver.overview.pendingRequests", "Pending requests"),
      value: pendingRequests.length,
      helper: t("driver.overview.pendingRequestsHelper", "Approvals, booking, or in progress"),
      tone:
        pendingRequests.length > 0
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-700",
      icon: ClipboardList,
    },
    {
      title: t("driver.overview.licenseCheck", "License check"),
      value:
        licenseReminder.daysRemaining === null
          ? t("driver.overview.missing", "Missing")
          : licenseReminder.daysRemaining < 0
          ? t("driver.overview.expired", "Expired")
          : t("driver.overview.daysCount", "{{count}} days", {
              count: licenseReminder.daysRemaining,
            }),
      helper: licenseReminder.note,
      tone: licenseReminder.tone,
      icon: ShieldCheck,
    },
    {
      title: t("driver.overview.documentsDue", "Documents due"),
      value:
        licenseReminder.status === "Expired" || licenseReminder.status === "Due soon"
          ? 1
          : 0,
      helper: t("driver.overview.documentsDueHelper", "License reminder only"),
      tone:
        licenseReminder.status === "Expired" || licenseReminder.status === "Due soon"
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,#1f2937_0%,#0f172a_45%,#0b0d12_100%)] px-5 pb-24 pt-7 text-white shadow-xl sm:px-8 sm:pb-28">
        <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-tl-[120px] bg-white/15" />
        <div className="relative z-10">
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {t("driver.overview.driverOperationsOverview", "Driver operations overview")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {t("driver.overview.vehicle", "Vehicle")} {vehicle.id}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {t("driver.overview.type", "Type")} {vehicle.type || t("common.notAvailable", "N/A")}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {t("driver.overview.warranty", "Warranty")} {warranty.status}
            </span>
          </div>
        </div>
      </section>

      <section className="-mt-20 mx-auto grid w-[calc(100%-1.5rem)] grid-cols-2 gap-2.5 sm:-mt-24 sm:w-[calc(100%-2.5rem)] sm:gap-3 lg:w-[calc(100%-4.5rem)] xl:w-[calc(100%-6rem)] xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm"
              key={card.title}
            >
              <div className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-slate-100" />
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {card.helper}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Icon size={12} />
                </span>
              </div>
              <div className="mt-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${card.tone}`}
                >
                  {card.title === t("driver.overview.licenseCheck", "License check")
                    ? licenseReminder.status
                    : t("driver.overview.operational", "Operational")}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <CalendarClock size={16} />
            </span>
            {t("driver.overview.upcomingServiceAndBookings", "Upcoming service and bookings")}
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("driver.overview.nextService", "Next service")}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {nextService.serviceType}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {formatDate(nextService.date)} | {nextService.km.toLocaleString()} km
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {t("driver.overview.nextActiveRequest", "Next active request")}
              </p>
              {nextBooking ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {nextBooking.id} - {nextBooking.serviceType}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {nextBooking.appointment?.dateTime
                      ? `${t("driver.tracking.appointment", "Appointment")} ${formatDateTime(nextBooking.appointment.dateTime)}`
                      : `${t("driver.overview.status", "Status")} ${nextBooking.status}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-600">
                  {t("driver.overview.noActiveBookingOrRequest", "No active booking or request in progress.")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Truck size={16} />
            </span>
            {t("driver.overview.assignedVehicleStatus", "Assigned vehicle status")}
          </h2>
          <div className="mt-4 grid gap-3 text-xs min-[460px]:grid-cols-2 sm:text-sm">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">{t("driver.overview.vehicle", "Vehicle")}</p>
              <p className="mt-1 font-semibold text-slate-900">
                {vehicle.id} - {vehicle.model}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">{t("driver.overview.plateType", "Plate / Type")}</p>
              <p className="mt-1 font-semibold text-slate-900">
                {vehicle.plate || t("common.notAvailable", "N/A")} | {vehicle.type || t("common.notAvailable", "N/A")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">{t("driver.overview.serviceEligibility", "Service eligibility")}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${eligibilityClass(
                  serviceEligibility.status,
                )}`}
              >
                {serviceEligibility.status}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">{t("driver.overview.warranty", "Warranty")}</p>
              <p className="mt-1 font-semibold text-slate-900">
                {warranty.status}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {t("driver.overview.expires", "Expires")} {formatDate(warranty.expiryDate)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <ClipboardList size={16} />
            </span>
            {t("driver.overview.recentRequestActivity", "Recent request activity")}
          </h2>
          <div className="mt-4 space-y-3">
            {recentRequests.length === 0 ? (
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("driver.overview.noRecentRequests", "No recent service requests yet.")}
              </p>
            ) : (
              recentRequests.map((request) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  key={request.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {request.id}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    {request.serviceType}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDateTime(request.updatedAt || request.requestedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.45)] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Wrench size={16} />
            </span>
            {t("driver.overview.remindersAndCompliance", "Reminders and compliance")}
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {t("driver.overview.licenseCheckReminder", "License check reminder")}
                </p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${licenseReminder.tone}`}>
                  {licenseReminder.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {licenseReminder.note}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                {t("driver.overview.seasonalTyreChangeReminder", "Seasonal tyre change reminder")}
              </p>
              <p className="mt-2 text-xs text-slate-700">
                {t("driver.overview.reminderDate", "Reminder date")}:{" "}
                <span className="font-semibold">
                  {formatDate(seasonalReminder.dueDate)}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {seasonalReminder.note}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                {t("driver.overview.policyAndWarrantyContext", "Policy and warranty context")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-700">
                  {t("driver.overview.policiesMapped", "Policies mapped")} {matchingPolicies.length}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                  {t("driver.overview.warranty", "Warranty")} {warranty.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DriverOverviewSection;
