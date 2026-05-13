import { adminGlobalSettings, getAdminStatusTone } from "../data/adminStore";

function AdminGlobalSettingsPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Global settings</h2>
      <p className="mt-2 text-sm text-slate-500">
        Platform-level controls applied by default across all tenants.
      </p>
      <div className="card-list-scrollbar mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {adminGlobalSettings.map((setting) => (
          <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" key={setting.key}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{setting.key}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusTone(setting.enabled ? "enabled" : "disabled")}`}>
                {setting.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-700">{setting.value}</p>
            <p className="mt-1 text-xs text-slate-500">{setting.note}</p>
            <button className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Configure
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminGlobalSettingsPage;
