function AdminSecurityAuditPage() {
  const cards = [
    { label: "MFA coverage", value: "96%", tone: "text-slate-900" },
    { label: "Suspicious logins", value: "4", tone: "text-rose-700" },
    { label: "Policy overrides", value: "9", tone: "text-amber-700" },
    { label: "Exports today", value: "18", tone: "text-slate-900" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Security & audit center</h2>
      <p className="mt-2 text-sm text-slate-500">
        Track suspicious sessions, policy drifts, and high-impact governance actions.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" key={card.label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-sm font-semibold text-slate-900">Recent audit note</p>
        <p className="mt-1 text-sm text-slate-600">
          3 export actions were blocked by policy due to missing `reports.export` permission.
        </p>
        <button className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          Open full audit timeline
        </button>
      </div>
    </section>
  );
}

export default AdminSecurityAuditPage;
