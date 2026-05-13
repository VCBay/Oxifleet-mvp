import { adminTenantRows, getAdminStatusTone } from "../data/adminStore";

function AdminTenantManagementPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Tenant management</h2>
        <div className="inline-flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            Create tenant
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            Export tenant list
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Manage activation, onboarding completion, and operational health by tenant.
      </p>
      <div className="card-list-scrollbar mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {adminTenantRows.map((row) => (
          <div
            className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm sm:grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr_auto] sm:items-center"
            key={row.name}
          >
            <p className="font-semibold text-slate-900">{row.name}</p>
            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusTone(row.status)}`}>
              {row.status}
            </span>
            <p className="text-xs font-medium text-slate-600">Onboarding {row.onboarding}</p>
            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusTone(row.health)}`}>
              {row.health}
            </span>
            <p className="text-xs text-slate-500">{row.lastActive}</p>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Open
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AdminTenantManagementPage;
