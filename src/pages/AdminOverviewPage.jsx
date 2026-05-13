import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CircleAlert,
  ClipboardCheck,
  FileClock,
  Gauge,
  Globe2,
  Link2,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Siren,
  Users,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminAccessBySection,
  adminAccessToneByLabel,
  adminDashboardShareRows,
} from "../data/adminStore";

const formatEur = (value) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const kpiCards = [
  {
    title: "Active fleets",
    value: "42",
    helper: "5 onboarding this month",
    icon: Building2,
    tone: "text-sky-700 bg-sky-100",
  },
  {
    title: "Managed vehicles",
    value: "1,248",
    helper: "97% policy-linked",
    icon: Wrench,
    tone: "text-violet-700 bg-violet-100",
  },
  {
    title: "Active drivers",
    value: "2,960",
    helper: "88 pending profile checks",
    icon: Users,
    tone: "text-emerald-700 bg-emerald-100",
  },
  {
    title: "Connected POS",
    value: "318",
    helper: "12 networks integrated",
    icon: Link2,
    tone: "text-amber-700 bg-amber-100",
  },
  {
    title: "Platform GMV",
    value: formatEur(2840000),
    helper: "+14.2% vs last month",
    icon: Banknote,
    tone: "text-fuchsia-700 bg-fuchsia-100",
  },
  {
    title: "Approval SLA",
    value: "97.2%",
    helper: "Median 2.4 hrs turnaround",
    icon: ClipboardCheck,
    tone: "text-cyan-700 bg-cyan-100",
  },
  {
    title: "API uptime",
    value: "99.92%",
    helper: "7 degraded endpoints",
    icon: ServerCog,
    tone: "text-indigo-700 bg-indigo-100",
  },
  {
    title: "Critical alerts",
    value: "9",
    helper: "3 require action now",
    icon: Siren,
    tone: "text-rose-700 bg-rose-100",
  },
];

const chunks = [kpiCards.slice(0, 4), kpiCards.slice(4, 8)];

const tenantGrowthData = [
  { month: "Oct", fleets: 33, vehicles: 940, gmv: 1980000 },
  { month: "Nov", fleets: 35, vehicles: 1010, gmv: 2140000 },
  { month: "Dec", fleets: 36, vehicles: 1078, gmv: 2230000 },
  { month: "Jan", fleets: 38, vehicles: 1152, gmv: 2380000 },
  { month: "Feb", fleets: 40, vehicles: 1211, gmv: 2610000 },
  { month: "Mar", fleets: 42, vehicles: 1248, gmv: 2840000 },
];

const approvalOpsData = [
  { week: "Wk 1", approved: 142, pending: 41, rejected: 8 },
  { week: "Wk 2", approved: 156, pending: 37, rejected: 11 },
  { week: "Wk 3", approved: 169, pending: 33, rejected: 7 },
  { week: "Wk 4", approved: 174, pending: 29, rejected: 6 },
];

const integrationStatusRows = [
  { network: "Point S API", region: "EU", status: "Healthy", uptime: "99.97%", p95: "212ms", incidents: "0 open" },
  { network: "Mercedes ServiceNet", region: "DE/AT", status: "Degraded", uptime: "98.84%", p95: "711ms", incidents: "2 open" },
  { network: "Michelin Partner Link", region: "EU", status: "Healthy", uptime: "99.61%", p95: "304ms", incidents: "1 open" },
  { network: "Bridgestone Connect", region: "EU", status: "Healthy", uptime: "99.74%", p95: "288ms", incidents: "0 open" },
  { network: "Goodyear Fleet Hub", region: "EU/UK", status: "Risk", uptime: "97.92%", p95: "830ms", incidents: "3 open" },
];

const securityAuditRows = [
  { title: "Suspicious login burst blocked", detail: "43 attempts blocked for one tenant admin account", time: "7 mins ago", severity: "High" },
  { title: "Role elevation requires review", detail: "Manager -> Admin request pending verification", time: "24 mins ago", severity: "Medium" },
  { title: "GDPR export completed", detail: "Data access package generated for Metro Fleet", time: "42 mins ago", severity: "Info" },
  { title: "Contract nearing expiry", detail: "BlueRoute Mobility contract ends in 12 days", time: "1 hr ago", severity: "Medium" },
  { title: "MFA disabled on 3 users", detail: "Security policy mismatch in User Management", time: "2 hrs ago", severity: "High" },
];

const priorityQueueRows = [
  {
    task: "Resolve Mercedes API degradation",
    owner: "Platform Ops",
    due: "Today, 18:30",
    status: "In progress",
  },
  {
    task: "Approve 3 pending car-policy exceptions",
    owner: "Compliance Admin",
    due: "Today, 20:00",
    status: "Pending",
  },
  {
    task: "Renew BlueRoute legal contract",
    owner: "Contract Admin",
    due: "In 2 days",
    status: "At risk",
  },
  {
    task: "Complete MFA rollout for all managers",
    owner: "Security Team",
    due: "In 3 days",
    status: "Planned",
  },
];

const renderGrowthTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const fleets = Number(payload.find((entry) => entry.dataKey === "fleets")?.value || 0);
  const gmv = Number(payload.find((entry) => entry.dataKey === "gmv")?.payload?.gmv || 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-600">Fleets: {fleets}</p>
      <p className="text-xs text-slate-600">GMV: {formatEur(gmv)}</p>
    </div>
  );
};

const renderOpsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-800">{label}</p>
      {payload.map((row) => (
        <p className="mt-1 text-xs text-slate-600" key={row.dataKey}>
          {row.name}: {row.value}
        </p>
      ))}
    </div>
  );
};

function getSeverityTone(severity) {
  const value = String(severity || "").toLowerCase();
  if (value.includes("high")) {
    return "bg-rose-100 text-rose-700";
  }
  if (value.includes("medium") || value.includes("risk")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-sky-100 text-sky-700";
}

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("healthy")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value.includes("degraded") || value.includes("risk")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

function getTaskTone(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("in progress")) {
    return "bg-sky-100 text-sky-700";
  }
  if (value.includes("pending")) {
    return "bg-amber-100 text-amber-700";
  }
  if (value.includes("at risk")) {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
}

function AdminOverviewPage() {
  const accessList = adminAccessBySection.dashboard || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-[radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.2),transparent_36%),linear-gradient(160deg,#130825_0%,#1d0d3a_40%,#24114d_100%)] px-5 py-6 text-white shadow-xl sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">
              Super Admin Console
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Global platform command center
            </h2>
            {/* <p className="mt-3 max-w-3xl text-sm text-white/80">
              Monitor tenants, operations, integrations, security posture, contracts, and revenue from one place.
            </p> */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100/20 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                99.92% Platform uptime
              </span>
              <span className="rounded-full bg-amber-100/20 px-2.5 py-1 text-xs font-semibold text-amber-100">
                3 critical tasks pending
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
              Environment
            </p>
            <p className="mt-1 text-sm font-semibold">Production EU Cluster</p>
            <p className="mt-1 text-xs text-white/75">
              Last sync: Apr 20, 2026, 11:20 AM
            </p>
          </div>
        </div>
      </section>

      {/* <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={card.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
                </div>
                <span className={`inline-flex size-9 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
            </article>
          );
        })}
      </section> */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {chunks.map((group, idx) => (
          <section
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {/* 👇 Change happens here */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          {card.title}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {card.value}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {card.helper}
                        </p>
                      </div>
                      <span
                        className={`inline-flex size-8 items-center justify-center rounded-lg ${card.tone}`}
                      >
                        <Icon size={16} />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Tenant growth and GMV
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fleet onboarding trend and monthly gross volume.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              +27% 6M
            </span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={tenantGrowthData}
                margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="adminFleetsFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip content={renderGrowthTooltip} />
                <Area
                  dataKey="fleets"
                  fill="url(#adminFleetsFill)"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Approval operations pulse
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Weekly approval throughput across all tenants.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
              Median 2.4h
            </span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart barCategoryGap="28%" barGap={4} data={approvalOpsData}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip content={renderOpsTooltip} />
                <Legend />
                <Bar
                  barSize={14}
                  dataKey="approved"
                  fill="#10b981"
                  name="Approved"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  barSize={14}
                  dataKey="pending"
                  fill="#f59e0b"
                  name="Pending"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  barSize={14}
                  dataKey="rejected"
                  fill="#ef4444"
                  name="Rejected"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
              <Globe2 size={18} />
              Live integration health
            </h3>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              12 connected networks
            </span>
          </div>
          <div className="card-list-scrollbar mt-4 max-h-[19rem] space-y-3 overflow-y-auto pr-1">
            {integrationStatusRows.map((row) => (
              <article
                className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-[1.3fr_.6fr_.7fr_.7fr_.6fr_.5fr]"
                key={`${row.network}-${row.region}`}
              >
                <p className="text-slate-700">{row.network}</p>
                <p className="text-xs text-slate-600">{row.region}</p>
                <span
                  className={`inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusTone(row.status)}`}
                >
                  {row.status}
                </span>
                <p className="text-xs text-slate-600">Uptime {row.uptime}</p>
                <p className="text-xs text-slate-600">p95 {row.p95}</p>
                <p className="text-xs text-slate-600">{row.incidents}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
            <LockKeyhole size={18} />
            Security and audit watch
          </h3>
          <div className="card-list-scrollbar mt-4 max-h-[19rem] space-y-3 overflow-y-auto pr-1">
            {securityAuditRows.map((row) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                key={`${row.title}-${row.time}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getSeverityTone(row.severity)}`}
                  >
                    {row.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{row.detail}</p>
                <p className="mt-2 text-[11px] text-slate-500">{row.time}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
              <Gauge size={18} />
              Top fleets by OEM share
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Revenue weighted
            </span>
          </div>
          <div className="card-list-scrollbar mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {adminDashboardShareRows.map((row) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                key={`${row.fleet}-${row.oem}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.fleet}
                  </p>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    {row.share}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Leading OEM: {row.oem}
                </p>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#6d28d9_0%,#8b5cf6_100%)]"
                    style={{ width: row.share }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{row.revenue}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
              <Activity size={18} />
              Priority action queue
            </h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              4 open tasks
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {priorityQueueRows.map((row) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                key={row.task}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {row.task}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTaskTone(row.status)}`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Owner: {row.owner}
                </p>
                <p className="mt-1 text-xs text-slate-500">Due: {row.due}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
            >
              <AlertTriangle size={14} />
              Open Incident Center
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              type="button"
            >
              <BadgeCheck size={14} />
              Review Pending Approvals
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
            >
              <FileClock size={14} />
              Contract Renewals
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
            >
              <ShieldCheck size={14} />
              Security Policy Review
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminOverviewPage;
