import { adminAlerts, getAdminStatusTone } from "../data/adminStore";

function AdminAlertCenterPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Alert center</h2>
      <p className="mt-2 text-sm text-slate-500">
        Critical events with direct operational actions for fast incident handling.
      </p>
      <div className="mt-4 space-y-3">
        {adminAlerts.map((item) => (
          <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" key={item.title}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusTone(item.severity)}`}>
                {item.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg bg-[linear-gradient(180deg,#2c4fa3_0%,#1f3a7d_58%,#12244d_100%)] px-3 py-1.5 text-xs font-semibold text-white">
                {item.ctaPrimary}
              </button>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                {item.ctaSecondary}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminAlertCenterPage;
