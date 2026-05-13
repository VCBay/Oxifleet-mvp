import { adminIntegrationRows, getAdminStatusTone } from "../data/adminStore";

function AdminIntegrationsPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Integration control</h2>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          Connector settings
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Monitor partner API health, webhook success rate, queue depth, and retry actions.
      </p>
      <div className="mt-4 space-y-3">
        {adminIntegrationRows.map((item) => (
          <div
            className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm sm:grid-cols-[1.1fr_.7fr_.7fr_.7fr_auto] sm:items-center"
            key={item.partner}
          >
            <p className="font-semibold text-slate-900">{item.partner}</p>
            <p className="text-xs text-slate-600">{item.region}</p>
            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusTone(item.status)}`}>
              {item.status}
            </span>
            <p className="text-xs text-slate-600">
              Webhooks {item.webhooks} | {item.queue}
            </p>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Retry failed jobs
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AdminIntegrationsPage;
