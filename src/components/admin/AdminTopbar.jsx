import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import LanguageSwitch from "../LanguageSwitch";

function AdminTopbar({
  displayName,
  displayEmail,
  profileInitials,
  pageTitle = "Overview",
  notifications,
  onClearNotification,
  onClearAllNotifications,
  onNotificationAction,
  onOpenSidebar,
}) {
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

  return (
    <header className="w-full border-slate-200/70 bg-white px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {onOpenSidebar ? (
            <button
              aria-label="Open sidebar"
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 lg:hidden"
              onClick={onOpenSidebar}
              type="button"
            >
              <Menu size={17} />
            </button>
          ) : null}
          <div className="min-w-0 pl-1 sm:pl-4">
            <p className="truncate text-[11px] font-medium text-slate-400 sm:text-xs">
              {pageTitle}
            </p>
            <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              Welcome {displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative" ref={notificationRef}>
            <button
              aria-expanded={isNotificationOpen}
              aria-label="Notifications"
              className="relative grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300"
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
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <button
                    className="rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={notificationCount === 0}
                    onClick={() => onClearAllNotifications?.()}
                    type="button"
                  >
                    Clear all
                  </button>
                </div>

                <div className="sidebar-scrollbar mt-3 max-h-[min(62vh,24rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[22rem]">
                  {notificationCount === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                      No new notifications.
                    </p>
                  ) : (
                    notificationItems.map((item) => (
                      <article
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                        key={item.id}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 rounded-full bg-slate-200 p-1 text-slate-600">
                            <Bell size={12} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-600">{item.detail}</p>
                            <p className="mt-1 text-[10px] text-slate-500">{item.time}</p>
                          </div>
                          <button
                            aria-label={`Clear ${item.title}`}
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
                            {item.actionLabel || "Open"}
                          </button>
                        </div>
                      </article>
                    ))
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
              <p className="truncate text-xs text-slate-500">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
