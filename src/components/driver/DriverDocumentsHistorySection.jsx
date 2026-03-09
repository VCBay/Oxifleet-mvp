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
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Service history</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {documentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tyre replacement history</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {tyreReplacementHistory.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Invoice/receipt download</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {documentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Previous service details</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {selectedDocument ? selectedDocument.documentNo : "No history found"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Service history</h3>
          <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-2">
            {documentsHistoryRows.length === 0 ? (
              <p className="text-sm text-slate-500">No service history available.</p>
            ) : (
              documentsHistoryRows.map((row) => {
                const isActive = selectedDocument?.id === row.id;
                return (
                  <button
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={`${row.id}-${row.documentNo}`}
                    onClick={() => setSelectedDocumentId(row.id)}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{row.title}</p>
                    <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}>
                      {formatDateTime(row.date)}
                    </p>
                    <p className={`mt-1 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {row.documentNo}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Previous service details</h3>
          {!selectedDocument ? (
            <p className="mt-4 text-sm text-slate-500">No details available.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  Service:{" "}
                  <span className="font-semibold text-slate-900">{selectedDocument.title}</span>
                </p>
                <p>
                  Source:{" "}
                  <span className="font-semibold text-slate-900">{selectedDocument.source}</span>
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
                  <span className="font-semibold text-slate-900">{selectedDocument.location}</span>
                </p>
                <p>
                  Document:{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedDocument.documentNo}
                  </span>
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Details
                </p>
                <p className="mt-1 text-sm text-slate-700">{selectedDocument.details}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => handleDownloadReceipt(selectedDocument)} type="button">
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

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Tyre replacement history</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tyreReplacementHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No tyre replacement records found.</p>
          ) : (
            tyreReplacementHistory.slice(0, 8).map((row) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                key={`tyre-${row.id}-${row.documentNo}`}
              >
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.date)}</p>
                <p className="mt-1 text-xs text-slate-600">Cost: {row.cost}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default DriverDocumentsHistorySection;
