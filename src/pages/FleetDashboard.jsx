import { useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  CircleDollarSign,
  FileUp,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  Settings,
  Truck,
  User,
  Users,
  Van,
} from "lucide-react";
import { clearSession, getSession } from "../auth/session";
import Logo from "../icons/Logo";
import VehicleManagement from "../components/VehicleManagement";
import VehiclePolicyManagement from "../components/VehiclePolicyManagement";
import ServiceOrderControl from "../components/ServiceOrderControl";
import BillingFinanceControl from "../components/BillingFinanceControl";
import ReportingAnalyticsControl from "../components/ReportingAnalyticsControl";
import CommunicationControl from "../components/CommunicationControl";
import TeamAccessControl from "../components/TeamAccessControl";
import SettingsProfileControl from "../components/SettingsProfileControl";
import FleetTopbar from "../components/fleet/FleetTopbar";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  addVehicle,
  getVehicleState,
  subscribeVehicles,
} from "../data/vehicleStore";
import {
  addDriver,
  getDriverState,
  removeDriver,
  subscribeDrivers,
  updateDriver,
} from "../data/driverStore";

const fleetMenuRouteMap = {
  dashboard: "overview",
  vehicles: "vehicles",
  drivers: "drivers",
  vehicle_policy: "vehicle-policy",
  service_order_control: "service-order-control",
  billing_finance: "billing-finance",
  reporting_analytics: "reporting-analytics",
  communication: "communication",
  team_access_control: "team-access-control",
  settings_profile: "settings-profile",
};

const parseFleetMenuFromPath = (pathname) => {
  const cleaned = String(pathname || "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  const section = parts[1] || fleetMenuRouteMap.dashboard;
  const matched = Object.entries(fleetMenuRouteMap).find(
    ([, route]) => route === section
  );
  return matched ? matched[0] : "dashboard";
};

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSession();
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState
  );
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const totalVehicles =
    vehicleState.baseVehicleCount + vehicleState.vehicles.length;
  const totalDrivers = driverState.baseDriverCount + driverState.drivers.length;
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    id: "",
    model: "",
    plate: "",
    type: "Truck",
    status: "Active",
    notes: "",
  });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const activeMenu = parseFleetMenuFromPath(location.pathname);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [driverForm, setDriverForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    license: "",
    status: "Active",
    notes: "",
  });
  const isVehicleReady =
    vehicleForm.model.trim().length > 0 && vehicleForm.plate.trim().length > 0;
  const isDriverReady =
    driverForm.name.trim().length > 0 && driverForm.email.trim().length > 0;

  const servicedVehicles = [
    { id: "VH-884", model: "Freightliner Cascadia", date: "Jan 29, 2026" },
    { id: "VH-241", model: "Volvo VNL 760", date: "Jan 27, 2026" },
    { id: "VH-553", model: "Kenworth T680", date: "Jan 24, 2026" },
    { id: "VH-102", model: "Peterbilt 579", date: "Jan 22, 2026" },
  ];

  const pendingVehicles = [
    { id: "VH-901", model: "Mack Anthem", date: "Feb 4, 2026" },
    { id: "VH-617", model: "International LT", date: "Feb 6, 2026" },
    { id: "VH-730", model: "Volvo VNR", date: "Feb 9, 2026" },
  ];

  const invoices = [
    {
      id: "INV-2049",
      vendor: "Metro Service Hub",
      amount: "$4,860",
      status: "Paid",
      date: "Jan 30, 2026",
    },
    {
      id: "INV-2050",
      vendor: "Westline Tire Care",
      amount: "$2,140",
      status: "Processing",
      date: "Jan 28, 2026",
    },
    {
      id: "INV-2051",
      vendor: "Northern Fleet Works",
      amount: "$6,720",
      status: "Due Feb 5",
      date: "Jan 26, 2026",
    },
  ];

  const serviceSpend = [
    { week: "Wk 1", spend: 12400 },
    { week: "Wk 2", spend: 9800 },
    { week: "Wk 3", spend: 15600 },
    { week: "Wk 4", spend: 11200 },
    { week: "Wk 5", spend: 14100 },
    { week: "Wk 6", spend: 13200 },
    { week: "Wk 7", spend: 16850 },
    { week: "Wk 8", spend: 14900 },
    { week: "Wk 9", spend: 17240 },
    { week: "Wk 10", spend: 15820 },
    { week: "Wk 11", spend: 18110 },
    { week: "Wk 12", spend: 16940 },
  ];

  const utilization = [
    { day: "Mon-1", rate: 82 },
    { day: "Tue-1", rate: 74 },
    { day: "Wed-1", rate: 88 },
    { day: "Thu-1", rate: 79 },
    { day: "Fri-1", rate: 91 },
    { day: "Sat-1", rate: 67 },
    { day: "Sun-1", rate: 71 },
    { day: "Mon-2", rate: 84 },
    { day: "Tue-2", rate: 78 },
    { day: "Wed-2", rate: 86 },
    { day: "Thu-2", rate: 80 },
    { day: "Fri-2", rate: 93 },
    { day: "Sat-2", rate: 69 },
    { day: "Sun-2", rate: 73 },
  ];

  const assignmentVehicles =
    vehicleState.vehicles.length > 0
      ? vehicleState.vehicles.map((vehicle) => ({
          id: vehicle.id,
          model: vehicle.model,
        }))
      : [...servicedVehicles, ...pendingVehicles].map((vehicle) => ({
          id: vehicle.id,
          model: vehicle.model,
        }));

  const filteredDrivers = driverState.drivers.filter((driver) => {
    if (!driverSearchQuery.trim()) {
      return true;
    }
    const assignedVehicle = assignmentVehicles.find(
      (vehicle) => vehicle.id === driver.assignedVehicleId
    );
    const searchBlob = [
      driver.id,
      driver.name,
      driver.email,
      driver.phone,
      driver.license,
      driver.status,
      driver.activityStatus,
      assignedVehicle?.id || "",
      assignedVehicle?.model || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchBlob.includes(driverSearchQuery.trim().toLowerCase());
  });

  const handleSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  const handleMenuNavigate = (menuKey) => {
    navigate(`/dashboard/${fleetMenuRouteMap[menuKey] || fleetMenuRouteMap.dashboard}`);
  };

  const handleVehicleChange = (field) => (event) => {
    const { value } = event.target;
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleSelectChange = (field) => (value) => {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVehicle = (event) => {
    event.preventDefault();
    addVehicle(vehicleForm);
    setVehicleForm({
      id: "",
      model: "",
      plate: "",
      type: "Truck",
      status: "Active",
      notes: "",
    });
    setVehicleDialogOpen(false);
  };

  const handleDriverChange = (field) => (event) => {
    const { value } = event.target;
    setDriverForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDriverSelectChange = (field) => (value) => {
    setDriverForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDriver = (event) => {
    event.preventDefault();
    addDriver(driverForm);
    setDriverForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      license: "",
      status: "Active",
      notes: "",
    });
    setDriverDialogOpen(false);
  };

  const handleDriverAssignmentChange = (driverId) => (vehicleId) => {
    updateDriver(driverId, {
      assignedVehicleId: vehicleId === "unassigned" ? "" : vehicleId,
    });
  };

  const handleDriverActivityChange = (driverId) => (activityStatus) => {
    updateDriver(driverId, {
      activityStatus,
      status: activityStatus,
    });
  };

  const handleDriverAccessChange = (driverId) => (accessLevel) => {
    updateDriver(driverId, { accessLevel });
  };

  const handleRemoveDriver = (driverId) => () => {
    removeDriver(driverId);
  };

  const getActivityClassName = (activityStatus) => {
    if (activityStatus === "Driving") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (activityStatus === "Idle") {
      return "bg-amber-100 text-amber-700";
    }
    if (activityStatus === "On leave") {
      return "bg-slate-200 text-slate-700";
    }
    if (activityStatus === "Inactive") {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-sky-100 text-sky-700";
  };

  const getComplianceClassName = (score) => {
    if (score >= 90) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (score >= 75) {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-rose-100 text-rose-700";
  };

  const handleVehicleDetailsOpenChange = (open) => {
    setVehicleDetailsOpen(open);
    if (!open) {
      setSelectedVehicle(null);
    }
  };

  const handleVehicleCardClick = (vehicle, serviceStage) => () => {
    setSelectedVehicle({ ...vehicle, serviceStage });
    setVehicleDetailsOpen(true);
  };

  const selectedVehicleFromStore = selectedVehicle
    ? vehicleState.vehicles.find((vehicle) => vehicle.id === selectedVehicle.id)
    : null;

  const selectedVehicleModel =
    selectedVehicleFromStore?.model || selectedVehicle?.model || "Vehicle";

  const selectedVehicleIdNumber = selectedVehicle?.id
    ? Number(selectedVehicle.id.replace(/\D/g, "")) || 0
    : 0;

  const vehicleDetails = selectedVehicle
    ? {
        id: selectedVehicle.id,
        model: selectedVehicleModel,
        plate:
          selectedVehicleFromStore?.plate || `TX-${9800 + selectedVehicleIdNumber}`,
        type: selectedVehicleFromStore?.type || "Truck",
        status: selectedVehicleFromStore?.status || "Active",
        vin: `1FUJGLDR${String(100000 + selectedVehicleIdNumber).slice(-6)}5`,
        year: 2020 + (selectedVehicleIdNumber % 6),
        color: ["White", "Black", "Silver", "Blue"][selectedVehicleIdNumber % 4],
        odometer: `${(120_000 + selectedVehicleIdNumber * 37).toLocaleString()} mi`,
        engineHours: `${(3_200 + selectedVehicleIdNumber * 3).toLocaleString()} hrs`,
        fuelLevel: `${55 + (selectedVehicleIdNumber % 40)}%`,
        lastKnownLocation: [
          "Dallas, TX",
          "Austin, TX",
          "Houston, TX",
          "San Antonio, TX",
        ][selectedVehicleIdNumber % 4],
        route: ["I-35 Corridor", "Gulf Loop", "Metro Express", "Westline"][
          selectedVehicleIdNumber % 4
        ],
        driver: ["Jamie Stewart", "Avery Chen", "Morgan Patel", "Taylor Reed"][
          selectedVehicleIdNumber % 4
        ],
        driverId: `DR-${300 + (selectedVehicleIdNumber % 80)}`,
        depot: ["North Yard", "Central Yard", "South Yard"][
          selectedVehicleIdNumber % 3
        ],
        serviceStage: selectedVehicle.serviceStage || "-",
        serviceDate: selectedVehicle.date || "-",
        nextServiceDue: ["Mar 6, 2026", "Mar 14, 2026", "Mar 22, 2026"][
          selectedVehicleIdNumber % 3
        ],
        serviceCenter: [
          "Metro Service Hub",
          "Northern Fleet Works",
          "Westline Tire Care",
        ][selectedVehicleIdNumber % 3],
        invoiceId: `INV-${2040 + (selectedVehicleIdNumber % 40)}`,
        estimatedCost: `$${(1800 + (selectedVehicleIdNumber % 9) * 420).toLocaleString()}`,
        issues: [
          "Oil + filter change",
          "Brake inspection",
          "Tire rotation",
          "Coolant top-up",
        ].slice(0, 2 + (selectedVehicleIdNumber % 2)),
        inspectionDue: ["Apr 15, 2026", "May 2, 2026", "May 18, 2026"][
          selectedVehicleIdNumber % 3
        ],
        registrationExpiry: ["Jun 30, 2026", "Jul 15, 2026", "Aug 1, 2026"][
          selectedVehicleIdNumber % 3
        ],
        insuranceExpiry: ["Sep 10, 2026", "Oct 1, 2026", "Oct 20, 2026"][
          selectedVehicleIdNumber % 3
        ],
        notes:
          selectedVehicleFromStore?.notes ||
          "No additional notes. Vehicle is assigned to a standard regional route and follows the regular maintenance cycle.",
        createdAt: selectedVehicleFromStore?.createdAt || null,
      }
    : null;

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="flex h-full w-full">
        <aside className="fixed inset-y-0 left-0 w-72">
          <div className="flex h-full flex-col bg-[#0D0F16] p-6 text-white shadow-xl">
            <div className="sidebar-scrollbar min-h-0 flex-1 space-y-10 overflow-y-auto pr-1">
              <div className="flex items-center gap-3">
                <Logo className="w-48 text-white" />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Menu
                </p>
                <nav className="space-y-2 text-sm">
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "dashboard"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("dashboard")}
                    type="button"
                  >
                    <LayoutGrid size={18} />
                    Dashboard
                  </button>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "vehicles"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("vehicles")}
                    type="button"
                  >
                    <Van size={18} />
                    Vehicles
                  </button>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "drivers"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("drivers")}
                    type="button"
                  >
                    <User size={18} />
                    Drivers
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "vehicle_policy"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("vehicle_policy")}
                    type="button"
                  >
                    <User size={18} />
                    Vehicle Policy
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "service_order_control"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("service_order_control")}
                    type="button"
                  >
                    <FileUp size={18} />
                    Service &amp; Order Control
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "billing_finance"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("billing_finance")}
                    type="button"
                  >
                    <CircleDollarSign size={18} />
                    Billing &amp; Finance
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "reporting_analytics"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("reporting_analytics")}
                    type="button"
                  >
                    <Search size={18} />
                    Reporting &amp; Analytics
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "communication"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("communication")}
                    type="button"
                  >
                    <Bell size={18} />
                    Communication
                  </button>

                  {/* <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "team_access_control"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("team_access_control")}
                    type="button"
                  >
                    <Users size={18} />
                    Team &amp; Access Control
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "settings_profile"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("settings_profile")}
                    type="button"
                  >
                    <Settings size={18} />
                    Settings &amp; Profile
                  </button> */}
                </nav>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  General
                </p>
                <nav className="space-y-2 text-sm">
                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    onClick={() => navigate("/driver-dashboard")}
                    type="button"
                  >
                    <Truck size={18} />
                    Driver Dashboard
                  </button> */}

                <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "team_access_control"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("team_access_control")}
                    type="button"
                  >
                    <Users size={18} />
                    Team &amp; Access Control
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "settings_profile"
                        ? "bg-white/10 font-semibold text-white"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("settings_profile")}
                    type="button"
                  >
                    <Settings size={18} />
                    Settings &amp; Profile
                  </button>

                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Settings size={18} />
                    Settings
                  </button> */}
                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <HelpCircle size={18} />
                    Help
                  </button> */}
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    onClick={handleSignOut}
                    type="button"
                  >
                    <LogOut size={18} />
                    Sign out
                  </button>
                </nav>
              </div>
            </div>

            <div className="mt-6 shrink-0 rounded-2xl bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0d12_60%)] p-4 text-sm">
              <p className="font-semibold">Mobile Ops</p>
              <p className="mt-2 text-white/60">
                Monitor vehicles and alerts on the go.
              </p>
              <button
                className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                type="button"
              >
                Download app
              </button>
            </div>
          </div>
        </aside>

        <section className="ml-72 flex-1 space-y-6 overflow-y-auto px-8 pb-8 pt-0">
          <Dialog
            open={vehicleDetailsOpen}
            onOpenChange={handleVehicleDetailsOpenChange}
          >
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedVehicleModel}</DialogTitle>
                <DialogDescription>
                  {selectedVehicle?.id ? `Vehicle ID: ${selectedVehicle.id}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid flex-1 gap-4 overflow-y-auto pr-1 text-sm">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Overview
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedVehicleModel}
                      </p>
                    </div>
                    {vehicleDetails?.serviceStage && vehicleDetails.serviceStage !== "-" ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {vehicleDetails.serviceStage}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Vehicle ID
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.id || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Service date
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.serviceDate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Plate
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.plate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Type
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.type || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Status
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.status || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Added
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.createdAt
                          ? new Date(
                              vehicleDetails.createdAt
                            ).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assignment
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Driver
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.driver || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicleDetails?.driverId || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Depot
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.depot || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Route
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.route || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Last known location
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.lastKnownLocation || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Specs
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">VIN</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.vin || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Year / color
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails
                          ? `${vehicleDetails.year} • ${vehicleDetails.color}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Odometer
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.odometer || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Engine hours
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.engineHours || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Fuel level
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.fuelLevel || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service & costs
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Service center
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.serviceCenter || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Invoice
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.invoiceId || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Estimated cost
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.estimatedCost || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Next service due
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.nextServiceDue || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Work items
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(vehicleDetails?.issues || []).map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Compliance
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Inspection due
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.inspectionDue || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Registration expiry
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.registrationExpiry || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Insurance expiry
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.insuranceExpiry || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {vehicleDetails?.notes || "—"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="-mx-8 sticky top-0 z-40 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] pb-4">
            <FleetTopbar
              displayEmail={user?.email || "john@oxifleet.com"}
              displayName={user?.name || "John Doe"}
              profileInitials={user?.name ? user.name.slice(0, 2).toUpperCase() : "JD"}
            />
          </div>

          {activeMenu === "dashboard" ? (
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg">
              <div>
                {/* <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Fleet dashboard
                </p> */}
                <h1 className="text-3xl font-semibold text-slate-900">
                  Welcome{user?.name ? `, ${user.name}` : " John Doe"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className={"cursor-pointer"}>
                      <Plus size={16} />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add vehicle</DialogTitle>
                      <DialogDescription>
                        Capture details to keep your fleet inventory accurate.
                      </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={handleAddVehicle}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="vehicle-id">Vehicle ID</Label>
                          <Input
                            id="vehicle-id"
                            value={vehicleForm.id}
                            onChange={handleVehicleChange("id")}
                            placeholder="VH-482"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="vehicle-plate">Plate number</Label>
                          <Input
                            id="vehicle-plate"
                            value={vehicleForm.plate}
                            onChange={handleVehicleChange("plate")}
                            placeholder="TX-9842"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="vehicle-model">Vehicle model</Label>
                          <Input
                            id="vehicle-model"
                            value={vehicleForm.model}
                            onChange={handleVehicleChange("model")}
                            placeholder="Freightliner Cascadia"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Vehicle type</Label>
                          <Select
                            value={vehicleForm.type}
                            onValueChange={handleVehicleSelectChange("type")}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Truck">Truck</SelectItem>
                              <SelectItem value="Van">Van</SelectItem>
                              <SelectItem value="Trailer">Trailer</SelectItem>
                              <SelectItem value="Utility">Utility</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <Select
                            value={vehicleForm.status}
                            onValueChange={handleVehicleSelectChange("status")}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="In service">In service</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="vehicle-notes">Notes</Label>
                        <Textarea
                          id="vehicle-notes"
                          value={vehicleForm.notes}
                          onChange={handleVehicleChange("notes")}
                          placeholder="Add maintenance history or assignments."
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline">
                          <FileUp /> Import from Excel
                        </Button>
                        <Button type="submit" disabled={!isVehicleReady}>
                          Add vehicle
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className={"cursor-pointer"}>
                      <Plus size={16} />
                      Add Drivers
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add driver</DialogTitle>
                      <DialogDescription>
                        Add driver details to keep staffing up to date.
                      </DialogDescription>
                    </DialogHeader>
                    <form className="grid gap-4" onSubmit={handleAddDriver}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="driver-id">Driver ID</Label>
                          <Input
                            id="driver-id"
                            value={driverForm.id}
                            onChange={handleDriverChange("id")}
                            placeholder="DR-317"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="driver-name">Full name</Label>
                          <Input
                            id="driver-name"
                            value={driverForm.name}
                            onChange={handleDriverChange("name")}
                            placeholder="Jamie Stewart"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="driver-email">Email address</Label>
                          <Input
                            id="driver-email"
                            type="email"
                            value={driverForm.email}
                            onChange={handleDriverChange("email")}
                            placeholder="jamie@oxifleet.com"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="driver-phone">Phone number</Label>
                          <Input
                            id="driver-phone"
                            value={driverForm.phone}
                            onChange={handleDriverChange("phone")}
                            placeholder="+1 (555) 284-3392"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="driver-license">License</Label>
                          <Input
                            id="driver-license"
                            value={driverForm.license}
                            onChange={handleDriverChange("license")}
                            placeholder="CDL-A"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <Select
                            value={driverForm.status}
                            onValueChange={handleDriverSelectChange("status")}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="On leave">On leave</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="driver-notes">Notes</Label>
                        <Textarea
                          id="driver-notes"
                          value={driverForm.notes}
                          onChange={handleDriverChange("notes")}
                          placeholder="Add certifications or route assignments."
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline">
                          Import from Excel
                        </Button>
                        <Button type="submit" disabled={!isDriverReady}>
                          Add driver
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </header>
          ) : null}

          {activeMenu === "vehicles" ? (
            <VehicleManagement vehicles={vehicleState.vehicles} />
          ) : null}

          {activeMenu === "vehicle_policy" ? (
            <VehiclePolicyManagement vehicles={vehicleState.vehicles} />
          ) : null}

          {activeMenu === "service_order_control" ? (
            <ServiceOrderControl />
          ) : null}

          {activeMenu === "billing_finance" ? (
            <BillingFinanceControl />
          ) : null}

          {activeMenu === "reporting_analytics" ? (
            <ReportingAnalyticsControl />
          ) : null}

          {activeMenu === "communication" ? <CommunicationControl /> : null}

          {activeMenu === "team_access_control" ? <TeamAccessControl /> : null}

          {activeMenu === "settings_profile" ? <SettingsProfileControl /> : null}

          {activeMenu === "drivers" ? (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Driver list & search
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Assign/unassign vehicles, track activity, review service history,
                      monitor compliance score, and manage access control.
                    </p>
                  </div>
                  <div className="relative w-full lg:w-96">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <Input
                      className="pl-9"
                      value={driverSearchQuery}
                      onChange={(event) => setDriverSearchQuery(event.target.value)}
                      placeholder="Search by driver, ID, email, license, or vehicle"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {filteredDrivers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No drivers found. Add a driver or adjust search filters.
                    </div>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const activityStatus =
                        driver.activityStatus || driver.status || "Active";
                      const complianceScore =
                        Number(driver.complianceScore) || 0;
                      const assignedVehicle = assignmentVehicles.find(
                        (vehicle) => vehicle.id === driver.assignedVehicleId
                      );
                      const history = Array.isArray(driver.serviceHistory)
                        ? driver.serviceHistory.slice(0, 3)
                        : [];
                      const complianceBarClassName =
                        complianceScore >= 90
                          ? "bg-emerald-500"
                          : complianceScore >= 75
                          ? "bg-amber-500"
                          : "bg-rose-500";

                      return (
                        <article
                          key={driver.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {driver.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {driver.id} - {driver.email}
                              </p>
                            </div>
                            <Button
                              onClick={handleRemoveDriver(driver.id)}
                              type="button"
                              variant="destructive"
                            >
                              Remove driver
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Assign/unassign vehicle
                              </p>
                              <Select
                                value={driver.assignedVehicleId || "unassigned"}
                                onValueChange={handleDriverAssignmentChange(
                                  driver.id
                                )}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    Unassigned
                                  </SelectItem>
                                  {assignmentVehicles.map((vehicle) => (
                                    <SelectItem key={vehicle.id} value={vehicle.id}>
                                      {vehicle.id} - {vehicle.model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-500">
                                {assignedVehicle
                                  ? `Current: ${assignedVehicle.id}`
                                  : "Current: Unassigned"}
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Driver activity status
                              </p>
                              <Select
                                value={activityStatus}
                                onValueChange={handleDriverActivityChange(driver.id)}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Active">Active</SelectItem>
                                  <SelectItem value="Driving">Driving</SelectItem>
                                  <SelectItem value="Idle">Idle</SelectItem>
                                  <SelectItem value="On leave">On leave</SelectItem>
                                  <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <span
                                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getActivityClassName(
                                  activityStatus
                                )}`}
                              >
                                {activityStatus}
                              </span>
                            </div>

                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Driver compliance score
                              </p>
                              <span
                                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getComplianceClassName(
                                  complianceScore
                                )}`}
                              >
                                {complianceScore}%
                              </span>
                              <div className="h-2 rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${complianceBarClassName}`}
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(100, complianceScore)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Driver access control
                              </p>
                              <Select
                                value={driver.accessLevel || "Standard"}
                                onValueChange={handleDriverAccessChange(driver.id)}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue placeholder="Select access level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Full">Full</SelectItem>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="Read only">Read only</SelectItem>
                                  <SelectItem value="Suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Driver service history
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {history.length > 0 ? (
                                history.map((entry, index) => (
                                  <div
                                    key={`${driver.id}-${entry.date}-${index}`}
                                    className="rounded-xl border border-slate-200/70 bg-white p-3 text-xs text-slate-600"
                                  >
                                    <p className="font-semibold text-slate-800">
                                      {entry.event}
                                    </p>
                                    <p className="mt-1">
                                      {entry.date}
                                      {entry.vehicleId ? ` - ${entry.vehicleId}` : ""}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                                  No service history available.
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeMenu === "dashboard" ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Total vehicles",
                value: `${totalVehicles}`,
                helper: "Up from last month",
                highlight: true,
              },
              {
                title: "Total drivers",
                value: `${totalDrivers}`,
                helper: "Stable quarter-to-date",
              },
              {
                title: "Vehicle services",
                value: `${servicedVehicles.length}`,
                helper: "Up 3 from last month",
              },
              {
                title: "Pending vehicle services",
                value: `${pendingVehicles.length}`,
                helper: "Awaiting client input",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ${
                  card.highlight
                    ? "bg-[linear-gradient(135deg,#0f172a_0%,#0b1220_65%,#183153_100%)] text-white"
                    : ""
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    card.highlight ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {card.title}
                </p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                <p
                  className={`mt-3 text-xs ${
                    card.highlight ? "text-white/60" : "text-slate-500"
                  }`}
                >
                  {card.helper}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Service spend
                </h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  +12%
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Rolling four-week spend for maintenance and parts.
              </p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={serviceSpend}
                    margin={{ left: -16, right: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="spendFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="10%"
                          stopColor="#0f172a"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="90%"
                          stopColor="#0f172a"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value) => [`$${value}`, "Spend"]}
                      contentStyle={{
                        borderRadius: "12px",
                        borderColor: "#e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#0f172a"
                      strokeWidth={3}
                      fill="url(#spendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Utilization rate
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  88% avg
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Percentage of vehicles active per day.
              </p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilization} margin={{ left: -12, right: 8 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Utilization"]}
                      contentStyle={{
                        borderRadius: "12px",
                        borderColor: "#e2e8f0",
                      }}
                    />
                    <Bar
                      dataKey="rate"
                      fill="#0D0F16"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Serviced vehicles
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Completed
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {servicedVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                      onClick={handleVehicleCardClick(vehicle, "Serviced")}
                      type="button"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {vehicle.model}
                        </p>
                        <p className="text-xs text-slate-500">{vehicle.id}</p>
                      </div>
                      <p className="font-semibold text-slate-700">
                        {vehicle.date}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Pending service
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Upcoming
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {pendingVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100/80 bg-amber-50 px-4 py-3 text-left text-sm transition hover:bg-amber-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
                      onClick={handleVehicleCardClick(vehicle, "Pending service")}
                      type="button"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {vehicle.model}
                        </p>
                        <p className="text-xs text-slate-500">{vehicle.id}</p>
                      </div>
                      <p className="font-semibold text-slate-700">
                        {vehicle.date}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Recent invoices
                  </h2>
                  <Link
                    className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                    to="/signup"
                  >
                    Create user
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {invoice.id}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                          {invoice.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {invoice.vendor}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {invoice.date}
                      </p>
                      <p className="mt-3 text-base font-semibold text-slate-900">
                        {invoice.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-[radial-gradient(circle_at_top,#0b1220_0%,#0d0f16_55%,#050608_100%)] p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Team focus</p>
                    <p className="mt-1 text-xs text-white/60">
                      Active initiatives this week
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    04 tasks
                  </span>
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold">Service desk refresh</p>
                      <p className="text-xs text-white/50">Due Feb 8</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-300">
                      On track
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold">Driver onboarding</p>
                      <p className="text-xs text-white/50">Due Feb 10</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-300">
                      Review
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold">Parts inventory</p>
                      <p className="text-xs text-white/50">Due Feb 12</p>
                    </div>
                    <span className="text-xs font-semibold text-rose-300">
                      At risk
                    </span>
                  </div>
                </div>
                <button
                  className="mt-6 w-full rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  type="button"
                >
                  Review all tasks
                </button>
              </div>
            </div>
              </section>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;

