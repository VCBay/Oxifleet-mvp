import { useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  FileUp,
  FolderPlus,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  User,
  Users,
  Van,
} from "lucide-react";
import { clearSession, getSession } from "../auth/session";
import Logo from "../icons/Logo";
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
  subscribeDrivers,
} from "../data/driverStore";

function Dashboard() {
  const navigate = useNavigate();
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
  const [vehicleForm, setVehicleForm] = useState({
    id: "",
    model: "",
    plate: "",
    type: "Truck",
    status: "Active",
    notes: "",
  });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
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
  ];

  const utilization = [
    { day: "Mon", rate: 82 },
    { day: "Tue", rate: 74 },
    { day: "Wed", rate: 88 },
    { day: "Thu", rate: 79 },
    { day: "Fri", rate: 91 },
    { day: "Sat", rate: 67 },
    { day: "Sun", rate: 71 },
  ];

  const handleSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
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

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="flex h-full w-full">
        <aside className="fixed inset-y-0 left-0 w-72">
          <div className="flex h-full flex-col justify-between bg-[#0D0F16] p-6 text-white shadow-xl">
            <div className="space-y-10">
              <div className="flex items-center gap-3">
                <Logo className="w-48 text-white" />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Menu
                </p>
                <nav className="space-y-2 text-sm">
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 text-left font-semibold text-white"
                    type="button"
                  >
                    <LayoutGrid size={18} />
                    Dashboard
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Van size={18} />
                    Vehicles
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <User size={18} />
                    Drivers
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Users size={18} />
                    Team
                  </button>
                </nav>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  General
                </p>
                <nav className="space-y-2 text-sm">
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Settings size={18} />
                    Settings
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <HelpCircle size={18} />
                    Help
                  </button>
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

            <div className="mt-10 rounded-2xl bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0d12_60%)] p-4 text-sm">
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

        <section className="ml-72 flex-1 space-y-6 overflow-y-auto p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Fleet dashboard
                </p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Welcome{user?.name ? `, ${user.name}` : " John Doe"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
                  type="button"
                >
                  <Bell size={18} />
                </button>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="grid size-9 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "JD"}
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.name || "John Doe"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.email || "john@oxifleet.com"}
                    </p>
                  </div>
                </div>
              </div>
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
                    <div
                      key={vehicle.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm"
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
                    </div>
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
                    <div
                      key={vehicle.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100/80 bg-amber-50 px-4 py-3 text-sm"
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
                    </div>
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
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
