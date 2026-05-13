import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  adminAccessBySection,
  adminAccessToneByLabel,
  adminContractRows,
} from "../data/adminStore";

const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const TABLE_COLUMNS = [
  { key: "fleetCompany", label: "Fleet Company" },
  { key: "contractualAgreement", label: "Contractual Agreement" },
  { key: "gdprAgreement", label: "GDPR Agreement" },
  { key: "dataProcessingAgreement", label: "Data Processing Agreement" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "billingPeriod", label: "Billing Period" },
  { key: "contractStatus", label: "Contract Status" },
];

const INITIAL_FORM_STATE = {
  fleetCompany: "",
  contractualAgreement: "",
  gdprAgreement: "",
  dataProcessingAgreement: "",
  paymentMethod: "",
  billingPeriod: "",
  contractStatus: "",
};

const readCsvRows = (rawText) => {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const splitRow = (line) =>
    line
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""));

  const firstLine = splitRow(lines[0]).map((item) => item.toLowerCase());
  const hasHeader = firstLine.some((item) =>
    ["fleet", "contract", "gdpr", "data", "payment", "billing", "status"].some((field) =>
      item.includes(field),
    ),
  );

  const sourceLines = hasHeader ? lines.slice(1) : lines;
  return sourceLines
    .map(splitRow)
    .filter((parts) => parts.length >= TABLE_COLUMNS.length)
    .map((parts, index) => ({
      id: `CTR-UP-${Date.now()}-${index + 1}`,
      fleetCompany: parts[0] || "N/A",
      contractualAgreement: parts[1] || "N/A",
      gdprAgreement: parts[2] || "N/A",
      dataProcessingAgreement: parts[3] || "N/A",
      paymentMethod: parts[4] || "N/A",
      billingPeriod: parts[5] || "N/A",
      contractStatus: parts[6] || "N/A",
    }));
};

function AdminContractPage() {
  const accessList = adminAccessBySection.contract || [];
  const [rows, setRows] = useState(adminContractRows);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [openActionRowId, setOpenActionRowId] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkMessage, setBulkMessage] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      TABLE_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const allRowsOnPageSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));

  const openCreateModal = () => {
    setFormValues(INITIAL_FORM_STATE);
    setIsEntryModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormValues({
      fleetCompany: row.fleetCompany || "",
      contractualAgreement: row.contractualAgreement || "",
      gdprAgreement: row.gdprAgreement || "",
      dataProcessingAgreement: row.dataProcessingAgreement || "",
      paymentMethod: row.paymentMethod || "",
      billingPeriod: row.billingPeriod || "",
      contractStatus: row.contractStatus || "",
    });
    setTargetRow(row);
    setIsEditModalOpen(true);
    setOpenActionRowId("");
  };

  const openDeleteModal = (row) => {
    setTargetRow(row);
    setIsDeleteModalOpen(true);
    setOpenActionRowId("");
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTargetRow(null);
  };

  const closeEntryModal = () => {
    setIsEntryModalOpen(false);
    setFormValues(INITIAL_FORM_STATE);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setTargetRow(null);
    setFormValues(INITIAL_FORM_STATE);
  };

  const deleteRow = () => {
    if (!targetRow?.id) {
      return;
    }
    setRows((current) => current.filter((row) => row.id !== targetRow.id));
    setSelectedIds((current) => current.filter((id) => id !== targetRow.id));
    closeDeleteModal();
  };

  const deleteSelected = () => {
    if (!selectedIds.length) {
      return;
    }
    setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
    setSelectedIds([]);
  };

  const saveNewEntry = () => {
    if (!formValues.fleetCompany.trim() || !formValues.contractualAgreement.trim()) {
      return;
    }
    setRows((current) => [
      {
        id: `CTR-${Date.now()}`,
        ...formValues,
      },
      ...current,
    ]);
    closeEntryModal();
    setPage(1);
  };

  const saveEditEntry = () => {
    if (!targetRow?.id || !formValues.fleetCompany.trim() || !formValues.contractualAgreement.trim()) {
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === targetRow.id ? { ...row, ...formValues } : row)),
    );
    closeEditModal();
  };

  const toggleRowSelect = (rowId) => {
    setSelectedIds((current) =>
      current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId],
    );
  };

  const toggleSelectAllOnPage = () => {
    if (allRowsOnPageSelected) {
      const pageIds = pagedRows.map((row) => row.id);
      setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)));
      return;
    }
    const pageIds = pagedRows.map((row) => row.id);
    setSelectedIds((current) => Array.from(new Set([...current, ...pageIds])));
  };

  const onPageSizeChange = (value) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setBulkFile(null);
    setBulkMessage("");
  };

  const importBulkData = async () => {
    if (!bulkFile) {
      setBulkMessage("Select a file first.");
      return;
    }

    const fileName = bulkFile.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      const fileText = await bulkFile.text();
      const importedRows = readCsvRows(fileText);
      if (!importedRows.length) {
        setBulkMessage("No valid rows found. CSV requires 7 columns.");
        return;
      }
      setRows((current) => [...importedRows, ...current]);
      setBulkMessage(`Imported ${importedRows.length} contract rows from CSV.`);
      setTimeout(() => closeUploadModal(), 700);
      return;
    }

    const fallbackRows = [
      {
        id: `CTR-UP-${Date.now()}-A`,
        fleetCompany: "Alpine Transport SA",
        contractualAgreement: "Uploaded | ALP_Contract_2026.pdf",
        gdprAgreement: "Uploaded | ALP_GDPR.pdf",
        dataProcessingAgreement: "Uploaded | DPA_Oxifleet_ALP.pdf",
        paymentMethod: "SEPA Direct Debit",
        billingPeriod: "Monthly consolidated billing",
        contractStatus: "Active",
      },
      {
        id: `CTR-UP-${Date.now()}-B`,
        fleetCompany: "Metro Fleet Services Ltd",
        contractualAgreement: "Uploaded | MFS_Enterprise_2026.pdf",
        gdprAgreement: "Uploaded | MFS_GDPR_2026.pdf",
        dataProcessingAgreement: "Uploaded | DPA_Oxifleet_MFS_v2.pdf",
        paymentMethod: "Bank Transfer",
        billingPeriod: "Per order",
        contractStatus: "Pending legal review",
      },
    ];
    setRows((current) => [...fallbackRows, ...current]);
    setBulkMessage("Demo import complete. For structured import, use CSV.");
    setTimeout(() => closeUploadModal(), 700);
  };

  const renderForm = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {TABLE_COLUMNS.map((column) => (
        <label className="space-y-1.5" key={column.key}>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {column.label}
          </span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            onChange={(event) =>
              setFormValues((current) => ({ ...current, [column.key]: event.target.value }))
            }
            placeholder={`Enter ${column.label.toLowerCase()}`}
            type="text"
            value={formValues[column.key] || ""}
          />
        </label>
      ))}
    </div>
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Contracts</h2>
      <p className="mt-2 text-sm text-slate-500">
        Manage contractual documents.
      </p>

      {/* <div className="mt-4 flex flex-wrap gap-2">
        {accessList.map((access) => (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${adminAccessToneByLabel[access] || "bg-slate-100 text-slate-700"}`}
            key={access}
          >
            {access}
          </span>
        ))}
      </div> */}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="w-half rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by fleet, payment method, billing period, status..."
              type="text"
              value={search}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
            >
              <Upload size={14} />
              Bulk upload
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={openCreateModal}
              type="button"
            >
              <Plus size={14} />
              Add entry
            </button>
            {selectedIds.length ? (
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={deleteSelected}
                type="button"
              >
                <Trash2 size={14} />
                Delete selected ({selectedIds.length})
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1300px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    checked={allRowsOnPageSelected}
                    className="size-4 rounded border-slate-300"
                    onChange={toggleSelectAllOnPage}
                    type="checkbox"
                  />
                </th>
                {TABLE_COLUMNS.map((column) => (
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {pagedRows.map((row) => (
                <tr className="hover:bg-slate-50/70" key={row.id}>
                  <td className="px-3 py-2">
                    <input
                      checked={selectedIds.includes(row.id)}
                      className="size-4 rounded border-slate-300"
                      onChange={() => toggleRowSelect(row.id)}
                      type="checkbox"
                    />
                  </td>
                  {TABLE_COLUMNS.map((column) => (
                    <td className="px-3 py-2 text-slate-700" key={`${row.id}-${column.key}`}>
                      {String(row[column.key] || "N/A")}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <button
                        aria-label={`Open actions for ${row.fleetCompany}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
                        onClick={() =>
                          setOpenActionRowId((current) => (current === row.id ? "" : row.id))
                        }
                        type="button"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openActionRowId === row.id ? (
                        <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            onClick={() => openEditModal(row)}
                            type="button"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                            onClick={() => openDeleteModal(row)}
                            type="button"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!pagedRows.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={TABLE_COLUMNS.length + 2}>
                    No contract records found for current search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Showing {pagedRows.length} of {filteredRows.length} contract records
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500" htmlFor="contract-page-size">
              Rows
            </label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              id="contract-page-size"
              onChange={(event) => onPageSizeChange(event.target.value)}
              value={pageSize}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={13} />
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-700">
              {safePage} / {totalPages}
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete contract record?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700">
                {targetRow?.fleetCompany || "this contract"}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={closeDeleteModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                onClick={deleteRow}
                type="button"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(isEntryModalOpen || isEditModalOpen) ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditModalOpen ? "Edit contract record" : "Add contract record"}
              </h3>
              <button
                aria-label="Close modal"
                className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={isEditModalOpen ? closeEditModal : closeEntryModal}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Fill contract fields and save.
            </p>
            <div className="mt-4">{renderForm()}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={isEditModalOpen ? closeEditModal : closeEntryModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                onClick={isEditModalOpen ? saveEditEntry : saveNewEntry}
                type="button"
              >
                <Check size={13} />
                {isEditModalOpen ? "Save changes" : "Add entry"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isUploadModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Bulk upload contract data</h3>
            <p className="mt-2 text-sm text-slate-500">
              Upload CSV (recommended) or spreadsheet file to add multiple contract rows.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <input
                accept=".csv,.xlsx,.xls"
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
                onChange={(event) => {
                  setBulkFile(event.target.files?.[0] || null);
                  setBulkMessage("");
                }}
                type="file"
              />
              {bulkFile ? (
                <p className="mt-2 text-xs text-slate-600">
                  Selected file: <span className="font-semibold">{bulkFile.name}</span>
                </p>
              ) : null}
              {bulkMessage ? <p className="mt-2 text-xs text-slate-600">{bulkMessage}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={closeUploadModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                onClick={importBulkData}
                type="button"
              >
                <Upload size={13} />
                Upload data
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AdminContractPage;
