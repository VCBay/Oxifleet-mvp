import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  MessageSquare,
  Truck,
  User,
  Wrench,
} from "lucide-react";
import Logo from "../../icons/Logo";
import OxifleetEmblemWhite from "../../icons/Oxifleet-Emblem-White.svg";
import { Button } from "../ui/button";

const menuItems = [
  { key: "overview", label: "Dashboard", Icon: Truck },
  { key: "service_request", label: "Service Request", Icon: Wrench },
  { key: "communication", label: "Communication", Icon: MessageSquare },
  { key: "booking_tracking", label: "Booking & Tracking", Icon: CalendarClock },
  { key: "documents_history", label: "Documents & History", Icon: FileText },
  { key: "profile", label: "Profile", Icon: User },
];

function DriverSidebar({
  activeMenu,
  onMenuClick,
  onSignOut,
  isCollapsed = false,
  onToggleCollapse,
  showCollapseToggle = false,
  isMobile = false,
  className = "",
}) {
  const sidebarWidthClass = isMobile ? "w-72" : isCollapsed ? "w-24" : "w-72";

  return (
    <aside
      className={`inset-y-0 left-0 ${isMobile ? "absolute" : "fixed transition-[width] duration-300"} ${sidebarWidthClass} ${className} z-index-1000`}
    >
      <div
        className={`relative flex h-full flex-col bg-[#0D0F16] text-white shadow-xl ${isCollapsed ? "p-3" : "p-6"}`}
      >
        {showCollapseToggle ? (
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-3 z-[65] hidden size-6 place-items-center rounded-full border border-[#cec6df] bg-[#ddd6ea] text-[#3b276d] shadow-sm transition hover:bg-[#d1c7e4] lg:grid"
            onClick={onToggleCollapse}
            type="button"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        ) : null}

        <div className="space-y-8">
          <div className="space-y-3">

            {isCollapsed ? (
              <div className="mx-auto space-y-1">
                <div className="grid place-items-center rounded-2xl border-white/10 bg-white/5 p-2 shadow-inner">
                  <img
                    alt="Oxifleet emblem"
                    className="h-8 w-8 object-contain"
                    src={OxifleetEmblemWhite}
                  />
                </div>
                {/* <p className="text-center text-[9px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  Driver
                </p> */}
              </div>
            ) : (
              <Logo className="w-48 text-white" />
            )}
          </div>

          <nav className="space-y-2 text-sm">
            {menuItems.map((item) => {
              const MenuIcon = item.Icon;
              return (
                <button
                  className={`flex w-full items-center rounded-2xl border transition ${
                    isCollapsed
                      ? "justify-center px-0 py-2.5"
                      : "gap-3 px-3 py-2 text-left"
                  } ${
                    activeMenu === item.key
                      ? isCollapsed
                        ? "border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                        : "border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                      : "border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  key={item.key}
                  onClick={() => onMenuClick(item.key)}
                  title={isCollapsed ? item.label : undefined}
                  type="button"
                >
                  <MenuIcon size={18} />
                  {!isCollapsed ? item.label : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto space-y-2">
          <Button
            className={`w-full ${isCollapsed ? "justify-center px-0" : "justify-start"}`}
            onClick={onSignOut}
            title={isCollapsed ? "Sign out" : undefined}
            type="button"
            variant="secondary"
          >
            <LogOut className={isCollapsed ? "" : "mr-2"} size={16} />
            {!isCollapsed ? "Sign out" : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default DriverSidebar;
