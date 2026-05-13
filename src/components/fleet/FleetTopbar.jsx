import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Menu,
  MessageSquare,
  Siren,
  X,
  XCircle,
} from "lucide-react";
import LanguageSwitch from "../LanguageSwitch";
import { useTranslation } from "../../i18n/useTranslation";

function FleetTopbar({
  displayName,
  displayEmail,
  profileInitials,
  pageTitle = "Dashboard",
  notifications,
  onClearNotification,
  onClearAllNotifications,
  onNotificationAction,
  onOpenSidebar,
  onToggleSidebarCollapse,
  isSidebarCollapsed = false,
}) {
  const { t } = useTranslation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);
  const notificationItems = Array.isArray(notifications) ? notifications : [];
  const notificationCount = notificationItems.length;

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!notificationRef.current) {
        return;
      }
      if (!notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const iconByKey = {
    service_due: CalendarClock,
    approval_ok: CheckCircle2,
    approval_rejected: XCircle,
    booking: Bell,
    warning: AlertTriangle,
    emergency: Siren,
    message: MessageSquare,
    billing: CircleDollarSign,
  };

  return (
    <header className="w-full border-slate-200/70 px-3 py-3 sm:px-4 sm:py-3.5 bg-white">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {onOpenSidebar ? (
              <button
                aria-label={t("actions.openMenu", "Open menu")}
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 lg:hidden"
                onClick={onOpenSidebar}
                type="button"
              >
                <Menu size={17} />
              </button>
            ) : null}
            {onToggleSidebarCollapse ? (
              <button
                aria-label={
                  isSidebarCollapsed
                    ? t("actions.expandSidebar", "Expand sidebar")
                    : t("actions.collapseSidebar", "Collapse sidebar")
                }
                className="mt-0.5 hidden size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 lg:grid"
                onClick={onToggleSidebarCollapse}
                type="button"
              >
                <Menu size={17} />
              </button>
            ) : null}
            <div className="min-w-0 pl-4">
              <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs">
                {pageTitle}
              </p>
              <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {t("fleet.topbar.welcome", "Welcome")} {displayName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative" ref={notificationRef}>
              <button
                aria-expanded={isNotificationOpen}
                aria-label={t("common.notifications", "Notifications")}
                className="relative grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                type="button"
              >
                <Bell size={17} />
                {notificationCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 min-w-[1rem] rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {notificationCount}
                  </span>
                ) : null}
              </button>

              {isNotificationOpen ? (
                <div className="fixed inset-x-3 top-24 z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[min(92vw,24rem)]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {t("common.notifications", "Notifications")}
                    </p>
                    <button
                      className="rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={notificationCount === 0}
                      onClick={() => onClearAllNotifications?.()}
                      type="button"
                    >
                      {t("actions.clearAll", "Clear all")}
                    </button>
                  </div>

                  <div className="sidebar-scrollbar mt-3 max-h-[min(62vh,24rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[22rem]">
                    {notificationCount === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                        {t(
                          "common.noNewNotifications",
                          "No new notifications.",
                        )}
                      </p>
                    ) : (
                      notificationItems.map((item) => {
                        const Icon = iconByKey[item.iconKey] || Bell;
                        return (
                          <article
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                            key={item.id}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 shrink-0 rounded-full p-1 ${item.levelClass || "bg-slate-200 text-slate-700"}`}
                              >
                                <Icon size={12} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {item.type}
                                </p>
                                <p className="text-xs font-semibold text-slate-900">
                                  {item.title}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-600">
                                  {item.detail}
                                </p>
                              </div>
                              <button
                                aria-label={`${t("actions.clear", "Clear")} ${item.title}`}
                                className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
                                onClick={() => onClearNotification?.(item.id)}
                                type="button"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                className="max-w-full rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-700"
                                onClick={() => {
                                  onNotificationAction?.(item);
                                  setIsNotificationOpen(false);
                                }}
                                type="button"
                              >
                                {item.actionLabel || t("actions.open", "Open")}
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <LanguageSwitch />

            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#3A246F] text-[11px] font-semibold text-white sm:hidden">
              {profileInitials}
            </div>

            <div className="hidden max-w-full items-center gap-2.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm sm:flex sm:text-sm">
              <div className="grid size-8 place-items-center rounded-full bg-[#3A246F] text-[11px] font-semibold text-white">
                {profileInitials}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {displayEmail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default FleetTopbar;
