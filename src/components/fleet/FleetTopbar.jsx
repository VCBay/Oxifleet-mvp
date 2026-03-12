import { Bell, Menu } from "lucide-react";

function FleetTopbar({
  displayName,
  displayEmail,
  profileInitials,
  onOpenSidebar,
}) {
  return (
    <header className="w-full rounded-none border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenSidebar ? (
            <button
              aria-label="Open menu"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 lg:hidden"
              onClick={onOpenSidebar}
              type="button"
            >
              <Menu size={18} />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="relative grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
            type="button"
          >
            <Bell size={18} />
          </button>

          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white sm:hidden">
            {profileInitials}
          </div>

          <div className="hidden max-w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm sm:flex sm:text-sm">
            <div className="grid size-9 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white">
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

export default FleetTopbar;
