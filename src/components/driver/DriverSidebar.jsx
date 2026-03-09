import {
  CalendarClock,
  FileText,
  LogOut,
  MessageSquare,
  Truck,
  User,
  Wrench,
} from "lucide-react";
import Logo from "../../icons/Logo";
import { Button } from "../ui/button";

const menuItems = [
  { key: "overview", label: "Dashboard", Icon: Truck },
  { key: "service_request", label: "Service Request", Icon: Wrench },
  { key: "communication", label: "Communication", Icon: MessageSquare },
  { key: "booking_tracking", label: "Booking & Tracking", Icon: CalendarClock },
  { key: "documents_history", label: "Documents & History", Icon: FileText },
  { key: "profile", label: "Profile", Icon: User },
];

function DriverSidebar({ activeMenu, onMenuClick, onSignOut }) {
  return (
    <aside className="fixed inset-y-0 left-0 w-72">
      <div className="flex h-full flex-col bg-[#0D0F16] p-6 text-white shadow-xl">
        <div className="space-y-8">
          <Logo className="w-48 text-white" />

          <nav className="space-y-2 text-sm">
            {menuItems.map((item) => {
              const MenuIcon = item.Icon;
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                    activeMenu === item.key
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 transition hover:bg-white/10 hover:text-white"
                  }`}
                  key={item.key}
                  onClick={() => onMenuClick(item.key)}
                  type="button"
                >
                  <MenuIcon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto space-y-2">
          <Button
            className="w-full justify-start"
            onClick={onSignOut}
            type="button"
            variant="secondary"
          >
            <LogOut className="mr-2" size={16} />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default DriverSidebar;
