import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LogOut, X } from "lucide-react";
import Logo from "../icons/Logo";
import OxifleetEmblemWhite from "../icons/Oxifleet-Emblem-White.svg";
import { clearSession, getSession, subscribeSession } from "../auth/session";
import {
  adminMenuIconByKey,
  adminMenuItems,
  adminNotifications,
  adminPageTitleByKey,
} from "../data/adminStore";
import AdminTopbar from "../components/admin/AdminTopbar";

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(adminNotifications);

  const activeMenu = useMemo(() => {
    const section = String(location.pathname || "").split("/")[3] || "dashboard";
    return adminPageTitleByKey[section] ? section : "dashboard";
  }, [location.pathname]);

  const pageTitle = adminPageTitleByKey[activeMenu] || "Overview";

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const clearAllNotifications = () => setNotifications([]);
  const clearNotification = (id) =>
    setNotifications((current) => current.filter((item) => item.id !== id));

  const handleNotificationAction = (notification) => {
    const path = notification?.actionPath || "/admin/dashboard/overview";
    navigate(path);
    setIsMobileSidebarOpen(false);
  };

  const handleSignOut = () => {
    clearSession();
    navigate("/admin/login", { replace: true });
  };

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full min-w-0">
        <div
          className={`fixed inset-0 z-40 bg-slate-900/45 transition-opacity duration-300 ease-in-out lg:hidden ${
            isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            aria-label="Close menu backdrop"
            className="h-full w-full"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
        </div>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            isDesktopSidebarCollapsed
              ? "lg:w-24 lg:transition-[width] lg:duration-300 lg:ease-in-out"
              : "lg:w-72 lg:transition-[width] lg:duration-300 lg:ease-in-out"
          } lg:translate-x-0`}
        >
          <div
            className={`flex h-full flex-col bg-[#0D0F16] text-white shadow-xl ${
              isDesktopSidebarCollapsed ? "p-3 lg:p-3" : "p-6"
            }`}
          >
            <button
              aria-label="Close menu"
              className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full bg-white/10 text-white lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <button
              aria-label={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute -right-3 top-3 z-[65] hidden size-6 place-items-center rounded-full border border-[#cec6df] bg-[#ddd6ea] text-[#3b276d] shadow-sm transition hover:bg-[#d1c7e4] lg:grid"
              onClick={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
              type="button"
            >
              {isDesktopSidebarCollapsed ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            </button>

            <div className="sidebar-scrollbar min-h-0 flex-1 space-y-8 overflow-y-auto pr-1">
              <div className="flex items-center gap-3">
                <div className={`${isDesktopSidebarCollapsed ? "lg:hidden" : ""}`}>
                  <Logo className="w-48 text-white" />
                </div>
                <div
                  className={`hidden rounded-2xl border-white/10 bg-white/5 p-2 shadow-inner ${
                    isDesktopSidebarCollapsed ? "lg:block" : ""
                  }`}
                >
                  <img
                    alt="Oxifleet emblem"
                    className="h-8 w-8 object-contain"
                    src={OxifleetEmblemWhite}
                  />
                </div>
              </div>

              <nav className="space-y-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] text-white/40 ${
                    isDesktopSidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  Menu
                </p>
                {adminMenuItems.map((item) => {
                  const Icon = adminMenuIconByKey[item.key];
                  return (
                    <NavLink
                      key={item.key}
                      className={({ isActive }) =>
                        `flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          isDesktopSidebarCollapsed
                            ? "lg:justify-center lg:gap-0 lg:px-0 lg:py-2.5"
                            : ""
                        } ${
                          isActive
                            ? isDesktopSidebarCollapsed
                              ? "border-[#5f47a8] bg-[#2A1656] text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                              : "border-[#5f47a8] bg-[#2A1656] text-white shadow-sm"
                            : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                        }`
                      }
                      title={isDesktopSidebarCollapsed ? item.label : undefined}
                      to={item.to}
                      onClick={() => setIsMobileSidebarOpen(false)}
                    >
                      {Icon ? <Icon size={16} /> : null}
                      <span className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="mt-auto space-y-2">
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white ${
                  isDesktopSidebarCollapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""
                }`}
                onClick={handleSignOut}
                title={isDesktopSidebarCollapsed ? "Sign out" : undefined}
                type="button"
              >
                <LogOut size={18} />
                <span className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0 sm:px-6 sm:pb-6 ${
            isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
          } lg:px-8 lg:pb-8`}
        >
          <div className="-mx-4 top-0 z-40 sm:-mx-6 lg:-mx-8">
            <AdminTopbar
              displayEmail={session?.email || "N/A"}
              displayName={session?.name || "Super Admin"}
              notifications={notifications}
              onClearAllNotifications={clearAllNotifications}
              onClearNotification={clearNotification}
              onNotificationAction={handleNotificationAction}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              pageTitle={pageTitle}
              profileInitials={(session?.name || "SA")
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || "")
                .join("")}
            />
          </div>

          <Outlet />
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
