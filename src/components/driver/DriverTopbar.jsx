import { Bell } from "lucide-react";

function DriverTopbar({
  activeMenu,
  displayName,
  displayEmail,
  profileInitials,
  driverNotificationCount,
}) {
  return (
    <header
      className={`rounded-3xl border border-slate-200/70 bg-white shadow-sm ${
        activeMenu === "overview" ? "p-6" : "p-4"
      }`}
    >
      <div
        className={`flex gap-4 ${
          activeMenu === "overview"
            ? "flex-col lg:flex-row lg:items-center lg:justify-between"
            : "items-center justify-end"
        }`}
      >
        {activeMenu === "overview" ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Driver dashboard
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Welcome
              {displayName ? `, ${displayName}` : " John Doe"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vehicle and policy visibility for your assigned operations.
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
            type="button"
          >
            <Bell size={18} />
            {driverNotificationCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 min-w-[1rem] rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {driverNotificationCount}
              </span>
            ) : null}
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <div className="grid size-9 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white">
              {profileInitials}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-500">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DriverTopbar;
