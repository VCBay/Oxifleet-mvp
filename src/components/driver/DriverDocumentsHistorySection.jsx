import { Button } from "../ui/button";

function DriverDocumentsHistorySection({
  documentsHistoryRows,
  tyreReplacementHistory,
  selectedDocument,
  setSelectedDocumentId,
  formatDateTime,
  handleDownloadReceipt,
}) {
  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">Service history</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {documentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">Tyre replacement history</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {tyreReplacementHistory.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">Invoice/receipt download</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {documentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">Previous service details</p>
          <p className="mt-2 break-words text-xs font-semibold text-slate-900 sm:text-sm">
            {selectedDocument ? selectedDocument.documentNo : "No history found"}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[340px_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Service history</h3>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1 sm:max-h-[460px] sm:pr-2">
            {documentsHistoryRows.length === 0 ? (
              <p className="text-xs text-slate-500 sm:text-sm">No service history available.</p>
            ) : (
              documentsHistoryRows.map((row) => {
                const isActive = selectedDocument?.id === row.id;
                return (
                  <button
                    className={`w-full min-w-0 rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={`${row.id}-${row.documentNo}`}
                    onClick={() => setSelectedDocumentId(row.id)}
                    type="button"
                  >
                    <p className="break-words text-xs font-semibold sm:text-sm">{row.title}</p>
                    <p className={`mt-1 text-[11px] sm:text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}>
                      {formatDateTime(row.date)}
                    </p>
                    <p
                      className={`mt-1 break-all text-[11px] sm:text-xs ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {row.documentNo}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Previous service details</h3>
          {!selectedDocument ? (
            <p className="mt-4 text-xs text-slate-500 sm:text-sm">No details available.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-2.5 text-xs text-slate-700 sm:grid-cols-2 sm:text-sm">
                <p>
                  Service:{" "}
                  <span className="break-words font-semibold text-slate-900">{selectedDocument.title}</span>
                </p>
                <p>
                  Source:{" "}
                  <span className="break-words font-semibold text-slate-900">{selectedDocument.source}</span>
                </p>
                <p>
                  Date:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(selectedDocument.date)}
                  </span>
                </p>
                <p>
                  Cost:{" "}
                  <span className="font-semibold text-slate-900">{selectedDocument.cost}</span>
                </p>
                <p>
                  Location:{" "}
                  <span className="break-words font-semibold text-slate-900">{selectedDocument.location}</span>
                </p>
                <p>
                  Document:{" "}
                  <span className="break-all font-semibold text-slate-900">
                    {selectedDocument.documentNo}
                  </span>
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Details
                </p>
                <p className="mt-1 text-xs text-slate-700 sm:text-sm">{selectedDocument.details}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="w-full text-xs sm:w-auto sm:text-sm"
                  onClick={() => handleDownloadReceipt(selectedDocument)}
                  type="button"
                >
                  Download invoice/receipt
                </Button>
                {selectedDocument.isTyre ? (
                  <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    Tyre replacement history
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Tyre replacement history</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tyreReplacementHistory.length === 0 ? (
            <p className="text-xs text-slate-500 sm:text-sm">No tyre replacement records found.</p>
          ) : (
            tyreReplacementHistory.slice(0, 8).map((row) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                key={`tyre-${row.id}-${row.documentNo}`}
              >
                <p className="break-words text-xs font-semibold text-slate-900 sm:text-sm">{row.title}</p>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">{formatDateTime(row.date)}</p>
                <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">Cost: {row.cost}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default DriverDocumentsHistorySection;
