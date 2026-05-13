import { adminRoleEvents } from "../data/adminStore";

function AdminUserAccessPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">User & access governance</h2>
      <p className="mt-2 text-sm text-slate-500">
        Review role updates, override actions, and session controls across all tenants.
      </p>
      <div className="card-list-scrollbar mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {adminRoleEvents.map((event) => (
          <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" key={`${event.actor}-${event.time}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400">{event.time}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{event.action}</p>
            <p className="mt-1 text-xs text-slate-600">
              By <span className="font-semibold">{event.actor}</span> for{" "}
              <span className="font-semibold">{event.target}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                View log
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                Revoke access
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                Force logout
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminUserAccessPage;
