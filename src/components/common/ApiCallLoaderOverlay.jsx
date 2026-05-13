import { Loader2 } from "lucide-react";

function ApiCallLoaderOverlay({
  show,
  title = "Please wait",
  subtitle = "We are processing your request.",
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1.5px]">
      <div className="flex w-[92%] max-w-sm items-center gap-3 rounded-2xl border border-violet-100 bg-white/95 px-4 py-3 shadow-sm">
        <span className="grid size-9 place-items-center rounded-full border border-violet-200 bg-violet-50 text-violet-700">
          <Loader2 className="animate-spin" size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default ApiCallLoaderOverlay;
