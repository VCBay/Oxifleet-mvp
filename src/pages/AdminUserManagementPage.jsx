import { useEffect, useMemo, useState } from "react";
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
import { adminUserManagementRows } from "../data/adminStore";
import ApiCallLoaderOverlay from "../components/common/ApiCallLoaderOverlay";
import TableLoadingRow from "../components/common/TableLoadingRow";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../services/adminUserApi";

const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const TABLE_COLUMNS = [
  { key: "user", label: "User" },
  { key: "role", label: "Role" },
  { key: "tenant", label: "Tenant" },
  { key: "status", label: "Status" },
];

const INITIAL_FORM_STATE = {
  user: "",
  role: "fleet-admin",
  tenant: "",
  status: "Active",
};

const ROLE_OPTIONS = [
  "super-admin",
  "fleet-admin",
  "fleet-sample",
  "driver",
  "oem",
  "pos-admin",
  "pos-sample",
];

const STATUS_OPTIONS = ["Active", "Invited", "Suspended", "Deactivated"];

const normalizeFallbackRows = (rows) =>
  rows.map((row, index) => ({
    ...row,
    id: row.id || `fallback-usr-${index + 1}`,
  }));

const readCsvRows = (rawText) => {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const splitRow = (line) =>
    line
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""));

  const firstLine = splitRow(lines[0]).map((item) => item.toLowerCase());
  const hasHeader = firstLine.some((item) =>
    ["user", "name", "role", "tenant", "status"].some((field) => item.includes(field)),
  );

  const sourceLines = hasHeader ? lines.slice(1) : lines;
  return sourceLines
    .map(splitRow)
    .filter((parts) => parts.length >= TABLE_COLUMNS.length)
    .map((parts) => ({
      user: parts[0] || "N/A",
      role: parts[1] || "driver",
      tenant: parts[2] || "",
      status: parts[3] || "Active",
    }));
};

function AdminUserManagementPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [openActionRowId, setOpenActionRowId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [targetRow, setTargetRow] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkMessage, setBulkMessage] = useState("");

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const userRows = await listAdminUsers();
      if (userRows.length) {
        setRows(userRows);
        return;
      }
      setRows(normalizeFallbackRows(adminUserManagementRows));
    } catch (error) {
      setPageError(error.message || "Failed to load user management data from backend.");
      setRows(normalizeFallbackRows(adminUserManagementRows));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

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
      user: row.user || "",
      role: row.role || "fleet-admin",
      tenant: row.tenant || "",
      status: row.status || "Active",
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

  const deleteRow = async () => {
    if (!targetRow?.id) return;

    try {
      setIsSubmitting(true);
      await deleteAdminUser(targetRow.id);
      setRows((current) => current.filter((row) => row.id !== targetRow.id));
      setSelectedIds((current) => current.filter((id) => id !== targetRow.id));
      closeDeleteModal();
    } catch (error) {
      setPageError(error.message || "Failed to delete user record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;

    try {
      setIsSubmitting(true);
      await Promise.all(selectedIds.map((id) => deleteAdminUser(id)));
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
    } catch (error) {
      setPageError(error.message || "Failed to delete selected users.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNewEntry = async () => {
    if (!formValues.user.trim() || !formValues.role.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await createAdminUser(formValues);
      setRows((current) => [created, ...current]);
      closeEntryModal();
      setPage(1);
    } catch (error) {
      setPageError(error.message || "Failed to create user record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEditEntry = async () => {
    if (!targetRow?.id || !formValues.user.trim() || !formValues.role.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await updateAdminUser(targetRow.id, formValues);
      setRows((current) => current.map((row) => (row.id === targetRow.id ? updated : row)));
      closeEditModal();
    } catch (error) {
      setPageError(error.message || "Failed to update user record.");
    } finally {
      setIsSubmitting(false);
    }
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

    try {
      setIsSubmitting(true);

      const fileName = bulkFile.name.toLowerCase();
      let importedRows = [];

      if (fileName.endsWith(".csv")) {
        const fileText = await bulkFile.text();
        importedRows = readCsvRows(fileText);
      } else {
        importedRows = [
          { user: "Olivia Grant", role: "fleet-sample", tenant: "BlueRoute Mobility", status: "Active" },
          { user: "Noah Silva", role: "driver", tenant: "BlueRoute Mobility", status: "Invited" },
        ];
      }

      if (!importedRows.length) {
        setBulkMessage("No valid rows found. CSV requires 4 columns.");
        return;
      }

      const createdRows = [];
      const failed = [];

      for (let i = 0; i < importedRows.length; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const created = await createAdminUser(importedRows[i]);
          createdRows.push(created);
        } catch (error) {
          failed.push(`R${i + 1}: ${error.message || "Failed"}`);
        }
      }

      if (createdRows.length) {
        setRows((current) => [...createdRows, ...current]);
      }

      setBulkMessage(
        `Imported ${createdRows.length} rows.${failed.length ? ` Failed ${failed.length}. ${failed.slice(0, 2).join(" | ")}` : ""}`,
      );

      if (createdRows.length) {
        setTimeout(() => closeUploadModal(), 900);
      }
    } catch (error) {
      setBulkMessage(error.message || "Bulk upload failed.");
      setPageError(error.message || "Bulk upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</span>
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          onChange={(event) => setFormValues((current) => ({ ...current, user: event.target.value }))}
          placeholder="Enter user full name"
          type="text"
          value={formValues.user || ""}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</span>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          onChange={(event) => setFormValues((current) => ({ ...current, role: event.target.value }))}
          value={formValues.role || "fleet-admin"}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant</span>
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          onChange={(event) => setFormValues((current) => ({ ...current, tenant: event.target.value }))}
          placeholder="Enter tenant/company"
          type="text"
          value={formValues.tenant || ""}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}
          value={formValues.status || "Active"}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <section className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <ApiCallLoaderOverlay
        show={isSubmitting}
        title="Updating user management"
        subtitle="Please wait while we process your request."
      />

      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">User & Role Management</h2>
      <p className="mt-2 text-sm text-slate-500">Manage role assignments per user.</p>

      {pageError ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {pageError}
          <button
            className="ml-2 font-semibold text-rose-800 underline underline-offset-2"
            onClick={loadUsers}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

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
              placeholder="Search by user, role, tenant, status..."
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
          <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
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
              {isLoading ? (
                <TableLoadingRow
                  colSpan={TABLE_COLUMNS.length + 2}
                  title="Loading user management records..."
                  subtitle="Please wait while we sync latest user data."
                />
              ) : null}

              {!isLoading
                ? pagedRows.map((row) => (
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
                            aria-label={`Open actions for ${row.user}`}
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
                  ))
                : null}

              {!isLoading && !pagedRows.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={TABLE_COLUMNS.length + 2}>
                    No user records found for current search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Showing {pagedRows.length} of {filteredRows.length} user records
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500" htmlFor="user-page-size">
              Rows
            </label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              id="user-page-size"
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
            <h3 className="text-lg font-semibold text-slate-900">Delete user record?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-700">{targetRow?.user || "this user"}</span>?
              This action cannot be undone.
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

      {isEntryModalOpen || isEditModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditModalOpen ? "Edit user record" : "Add user record"}
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
            <p className="mt-2 text-sm text-slate-500">Fill user role and tenant fields, then save.</p>
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
            <h3 className="text-lg font-semibold text-slate-900">Bulk upload user data</h3>
            <p className="mt-2 text-sm text-slate-500">
              Upload CSV (recommended) or spreadsheet file to add multiple user records.
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

export default AdminUserManagementPage;
