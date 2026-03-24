import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function DriverDocumentsHistorySection({
  documentsHistoryRows,
  tyreReplacementHistory,
  selectedDocument,
  setSelectedDocumentId,
  formatDateTime,
  handleDownloadServiceDetails,
}) {
  const { t } = useTranslation();
  const [serviceSearch, setServiceSearch] = useState("");

  const filteredDocumentsHistoryRows = useMemo(() => {
    const query = normalize(serviceSearch);
    if (!query) {
      return documentsHistoryRows;
    }
    return documentsHistoryRows.filter((row) =>
      [row.documentNo, row.id, row.title].some((value) =>
        normalize(value).includes(query),
      ),
    );
  }, [documentsHistoryRows, serviceSearch]);

  const filteredTyreReplacementHistory = useMemo(
    () =>
      tyreReplacementHistory.filter((row) =>
        filteredDocumentsHistoryRows.some((item) => item.id === row.id),
      ),
    [filteredDocumentsHistoryRows, tyreReplacementHistory],
  );

  const activeSelectedDocument = useMemo(() => {
    if (!selectedDocument) {
      return null;
    }
    return (
      filteredDocumentsHistoryRows.find(
        (row) => row.id === selectedDocument.id,
      ) ||
      filteredDocumentsHistoryRows[0] ||
      null
    );
  }, [filteredDocumentsHistoryRows, selectedDocument]);

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.history.serviceHistory", "Service history")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredDocumentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.history.tyreReplacementHistory", "Tyre replacement history")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredTyreReplacementHistory.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.history.serviceRecords", "Service records")}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredDocumentsHistoryRows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500">{t("driver.history.previousServiceDetails", "Previous service details")}</p>
          <p className="mt-2 break-words text-xs font-semibold text-slate-900 sm:text-sm">
            {activeSelectedDocument
              ? activeSelectedDocument.documentNo
              : t("driver.history.noHistoryFound", "No history found")}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[340px_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              {t("driver.history.serviceHistory", "Service history")}
            </h3>
            <div className="w-full sm:w-56">
              <Input
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder={t("driver.history.searchByServiceCode", "Search by service code")}
                value={serviceSearch}
              />
            </div>
          </div>
          <div className="card-list-scrollbar mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1 sm:max-h-[460px] sm:pr-2">
            {filteredDocumentsHistoryRows.length === 0 ? (
              <p className="text-xs text-slate-500 sm:text-sm">
                {t("driver.history.noServiceHistoryFound", "No service history found.")}
              </p>
            ) : (
              filteredDocumentsHistoryRows.map((row) => {
                const isActive = activeSelectedDocument?.id === row.id;
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
                    <p className="break-words text-xs font-semibold sm:text-sm">
                      {row.title}
                    </p>
                    <p
                      className={`mt-1 text-[11px] sm:text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}
                    >
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
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            {t("driver.history.previousServiceDetails", "Previous service details")}
          </h3>
          {!activeSelectedDocument ? (
            <p className="mt-4 text-xs text-slate-500 sm:text-sm">
              {t("driver.history.noDetailsAvailable", "No details available.")}
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-2.5 text-xs text-slate-700 sm:grid-cols-2 sm:text-sm">
                <p>
                  {t("driver.history.service", "Service")}:{" "}
                  <span className="break-words font-semibold text-slate-900">
                    {activeSelectedDocument.title}
                  </span>
                </p>
                <p>
                  {t("driver.history.source", "Source")}:{" "}
                  <span className="break-words font-semibold text-slate-900">
                    {activeSelectedDocument.source}
                  </span>
                </p>
                <p>
                  {t("driver.history.date", "Date")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(activeSelectedDocument.date)}
                  </span>
                </p>
                <p>
                  {t("driver.history.location", "Location")}:{" "}
                  <span className="break-words font-semibold text-slate-900">
                    {activeSelectedDocument.location}
                  </span>
                </p>
                <p>
                  {t("driver.history.document", "Document")}:{" "}
                  <span className="break-all font-semibold text-slate-900">
                    {activeSelectedDocument.documentNo}
                  </span>
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("driver.history.details", "Details")}
                </p>
                <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                  {activeSelectedDocument.details}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="w-full text-xs sm:w-auto sm:text-sm"
                  onClick={() =>
                    handleDownloadServiceDetails(activeSelectedDocument)
                  }
                  type="button"
                  variant="outline"
                >
                  {t("driver.history.downloadServiceDetails", "Download service details (PDF)")}
                </Button>
                {activeSelectedDocument.isTyre ? (
                  <span className="inline-flex items-center justify-center self-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    {t("driver.history.tyreReplacementHistory", "Tyre replacement history")}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          {t("driver.history.tyreReplacementHistory", "Tyre replacement history")}
        </h3>
        <div className="card-list-scrollbar mt-4 grid max-h-[20rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
          {filteredTyreReplacementHistory.length === 0 ? (
            <p className="text-xs text-slate-500 sm:text-sm">
              {t("driver.history.noTyreRecordsFound", "No tyre replacement records found.")}
            </p>
          ) : (
            filteredTyreReplacementHistory.slice(0, 8).map((row) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                key={`tyre-${row.id}-${row.documentNo}`}
              >
                <p className="break-words text-xs font-semibold text-slate-900 sm:text-sm">
                  {row.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                  {formatDateTime(row.date)}
                </p>
                <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                  {t("driver.history.cost", "Cost")}: {row.cost}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default DriverDocumentsHistorySection;
