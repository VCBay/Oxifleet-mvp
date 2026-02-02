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
import { clearSession, getSession } from "../auth/session";

function Dashboard() {
  const navigate = useNavigate();
  const user = getSession();

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#e2e8f0_45%,#c7d2fe_100%)] px-6 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Fleet user dashboard
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                Welcome{user?.name ? `, ${user.name}` : ""}.
              </h1>
            </div>
            <button
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              onClick={handleSignOut}
              type="button"
            >
              Sign out
            </button>
          </div>
          <p className="text-sm text-slate-600">
            You are signed in{user?.email ? ` as ${user.email}` : ""}. Track
            service activity, invoices, and fleet utilization in one view.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              type="button"
            >
              Onboard driver
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              type="button"
            >
              Schedule service
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            { title: "Fleet health", value: "92% uptime" },
            { title: "Vehicles serviced", value: "18 in January" },
            { title: "Open work orders", value: "7 active" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md"
            >
              <p className="text-sm font-semibold text-slate-500">
                {card.title}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm"
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

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100/80 bg-amber-50 px-4 py-3 text-sm"
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
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">
              Service spend by week
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Rolling four-week spend for maintenance and parts.
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serviceSpend} margin={{ left: -16, right: 8 }}>
                  <defs>
                    <linearGradient
                      id="spendFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="10%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="90%" stopColor="#6366f1" stopOpacity={0.05} />
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
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#spendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">
              Utilization rate
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Percentage of vehicles active per day.
            </p>
            <div className="mt-4 h-64">
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
                  <Bar dataKey="rate" fill="#0f172a" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent invoices
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Vendor invoices and service dates.
              </p>
            </div>
            <Link
              className="inline-flex items-center text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
              to="/signup"
            >
              Create another user
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {invoice.id}
                  </p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {invoice.status}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">
                  {invoice.vendor}
                </p>
                <p className="mt-2 text-sm text-slate-500">{invoice.date}</p>
                <p className="mt-4 text-xl font-semibold text-slate-900">
                  {invoice.amount}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
