function SectionLoadingCardStack({
  title = "Loading section...",
  subtitle = "Fetching latest data from server.",
  rows = 4,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50/60">
      <div className="border-b border-violet-100/80 px-4 py-3">
        <p className="text-sm font-semibold text-violet-900">{title}</p>
        <p className="mt-0.5 text-xs text-violet-700/80">{subtitle}</p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {[...Array(rows)].map((_, index) => (
          <div className="rounded-xl border border-violet-100/80 bg-white/90 p-3" key={index}>
            <div className="mb-2 h-3 w-40 animate-pulse rounded-full bg-violet-100" />
            <div className="mb-2 h-2.5 w-full animate-pulse rounded-full bg-violet-100/80" />
            <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-violet-100/70" />
          </div>
        ))}
      </div>

      <div className="h-1 w-full overflow-hidden bg-violet-100/70">
        <div className="h-full w-1/3 animate-[loaderSlide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-500" />
      </div>
    </div>
  );
}

export default SectionLoadingCardStack;
