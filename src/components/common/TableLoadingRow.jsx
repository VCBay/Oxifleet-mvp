import { Loader2, Sparkles } from "lucide-react";

function TableLoadingRow({
  colSpan,
  title = "Refreshing records...",
  subtitle = "Please wait while we sync the latest data.",
}) {
  return (
    <tr>
      <td className="px-3 py-6" colSpan={colSpan}>
        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50/60">
          <div className="flex items-center gap-3 border-b border-violet-100/80 px-4 py-3">
            <div className="grid size-9 place-items-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-sm">
              <Loader2 className="animate-spin" size={15} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-violet-900">{title}</p>
              <p className="truncate text-xs text-violet-700/80">{subtitle}</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              <Sparkles size={11} />
              Loading
            </span>
          </div>

          <div className="space-y-2 px-4 py-4">
            {[1, 2, 3, 4].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <div className="size-4 shrink-0 animate-pulse rounded-md bg-violet-100" />
                <div className="h-3 w-[24%] animate-pulse rounded-full bg-violet-100/90" />
                <div className="h-3 w-[30%] animate-pulse rounded-full bg-violet-100/80" />
                <div className="h-3 w-[20%] animate-pulse rounded-full bg-violet-100/70" />
                <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-violet-100/80" />
              </div>
            ))}
          </div>

          <div className="h-1 w-full overflow-hidden bg-violet-100/70">
            <div className="h-full w-1/3 animate-[loaderSlide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-500" />
          </div>
        </div>
      </td>
    </tr>
  );
}

export default TableLoadingRow;
