import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Trash2, Pencil, Check, X } from "lucide-react";

const withRowIds = (rows = []) =>
  rows.map((row, index) => ({
    ...row,
    _rowId: row.id || `${index}-${row.field || row.user || row.key || "row"}`,
  }));

function AdminFieldAccessTable({
  rows = [],
  columns = [],
  defaultAccess = [],
  accessToneByLabel = {},
  entityLabel = "entry",
}) {
  const [tableRows, setTableRows] = useState(withRowIds(rows));
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [editingRowId, setEditingRowId] = useState("");
  const [editDraft, setEditDraft] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({});

  const canEntry = defaultAccess.includes("Entry");
  const canEdit = defaultAccess.includes("Edit") || canEntry;
  const canDelete = defaultAccess.includes("Edit") || canEntry;

  useEffect(() => {
    setTableRows(withRowIds(rows));
    setSelectedIds([]);
    setPage(1);
    setEditingRowId("");
    setIsCreating(false);
  }, [rows]);

  const searchableKeys = useMemo(
    () => columns.filter((column) => column.searchable !== false).map((column) => column.key),
    [columns],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tableRows;
    }
    return tableRows.filter((row) =>
      searchableKeys.some((key) => String(row[key] || "").toLowerCase().includes(query)),
    );
  }, [search, searchableKeys, tableRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, safePage]);

  const allOnPageSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row._rowId));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIds = pagedRows.map((row) => row._rowId);
      setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)));
      return;
    }
    const pageIds = pagedRows.map((row) => row._rowId);
    setSelectedIds((current) => Array.from(new Set([...current, ...pageIds])));
  };

  const toggleRowSelection = (rowId) => {
    setSelectedIds((current) =>
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId],
    );
  };

  const deleteSelected = () => {
    if (!selectedIds.length) {
      return;
    }
    setTableRows((current) =>
      current.filter((row) => !selectedIds.includes(row._rowId)),
    );
    setSelectedIds([]);
  };

  const deleteRow = (rowId) => {
    setTableRows((current) => current.filter((row) => row._rowId !== rowId));
    setSelectedIds((current) => current.filter((id) => id !== rowId));
  };

  const beginCreate = () => {
    const initial = {};
    columns.forEach((column) => {
      initial[column.key] = "";
    });
    setCreateDraft(initial);
    setIsCreating(true);
    setEditingRowId("");
  };

  const saveCreate = () => {
    const firstKey = columns[0]?.key;
    if (!firstKey || !String(createDraft[firstKey] || "").trim()) {
      return;
    }
    setTableRows((current) => [
      {
        ...createDraft,
        _rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
      ...current,
    ]);
    setIsCreating(false);
    setCreateDraft({});
  };

  const beginEdit = (row) => {
    const draft = {};
    columns.forEach((column) => {
      draft[column.key] = String(row[column.key] || "");
    });
    setEditDraft(draft);
    setEditingRowId(row._rowId);
    setIsCreating(false);
  };

  const saveEdit = (rowId) => {
    const firstKey = columns[0]?.key;
    if (!firstKey || !String(editDraft[firstKey] || "").trim()) {
      return;
    }
    setTableRows((current) =>
      current.map((row) =>
        row._rowId === rowId ? { ...row, ...editDraft } : row,
      ),
    );
    setEditingRowId("");
    setEditDraft({});
  };

  const getAccessList = (row) =>
    Array.isArray(row.access) && row.access.length > 0 ? row.access : defaultAccess;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${entityLabel}...`}
            type="text"
            value={search}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEntry ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={beginCreate}
              type="button"
            >
              <Plus size={14} />
              Add entry
            </button>
          ) : null}
          {canDelete ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedIds.length}
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
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {canDelete ? (
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    checked={allOnPageSelected}
                    className="size-4 rounded border-slate-300"
                    onChange={toggleSelectAllOnPage}
                    type="checkbox"
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  key={column.key}
                >
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Access
              </th>
              {(canEdit || canDelete) ? (
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isCreating ? (
              <tr className="bg-violet-50/50">
                {canDelete ? <td className="px-3 py-2" /> : null}
                {columns.map((column) => (
                  <td className="px-3 py-2" key={`create-${column.key}`}>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-300"
                      onChange={(event) =>
                        setCreateDraft((current) => ({
                          ...current,
                          [column.key]: event.target.value,
                        }))
                      }
                      placeholder={column.label}
                      type="text"
                      value={createDraft[column.key] || ""}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {defaultAccess.map((access) => (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accessToneByLabel[access] || "bg-slate-100 text-slate-700"}`}
                        key={`create-access-${access}`}
                      >
                        {access}
                      </span>
                    ))}
                  </div>
                </td>
                {(canEdit || canDelete) ? (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        onClick={saveCreate}
                        type="button"
                      >
                        <Check size={12} />
                        Save
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        onClick={() => setIsCreating(false)}
                        type="button"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ) : null}

            {pagedRows.map((row) => {
              const isEditing = editingRowId === row._rowId;
              const accessList = getAccessList(row);
              return (
                <tr className="hover:bg-slate-50/70" key={row._rowId}>
                  {canDelete ? (
                    <td className="px-3 py-2">
                      <input
                        checked={selectedIds.includes(row._rowId)}
                        className="size-4 rounded border-slate-300"
                        onChange={() => toggleRowSelection(row._rowId)}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td className="px-3 py-2 text-slate-700" key={`${row._rowId}-${column.key}`}>
                      {isEditing ? (
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-300"
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              [column.key]: event.target.value,
                            }))
                          }
                          type="text"
                          value={editDraft[column.key] || ""}
                        />
                      ) : column.render ? (
                        column.render(row)
                      ) : (
                        String(row[column.key] || "N/A")
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {accessList.map((access) => (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accessToneByLabel[access] || "bg-slate-100 text-slate-700"}`}
                          key={`${row._rowId}-${access}`}
                        >
                          {access}
                        </span>
                      ))}
                    </div>
                  </td>
                  {(canEdit || canDelete) ? (
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => saveEdit(row._rowId)}
                            type="button"
                          >
                            <Check size={12} />
                            Save
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => setEditingRowId("")}
                            type="button"
                          >
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {canEdit ? (
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                              onClick={() => beginEdit(row)}
                              type="button"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                              onClick={() => deleteRow(row._rowId)}
                              type="button"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!pagedRows.length && !isCreating ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-sm text-slate-500"
                  colSpan={columns.length + (canDelete ? 1 : 0) + 1 + (canEdit || canDelete ? 1 : 0)}
                >
                  No records found for the current search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Showing {pagedRows.length} of {filteredRows.length} records
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500" htmlFor="admin-table-page-size">
            Rows
          </label>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            id="admin-table-page-size"
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <button
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-700">
            {safePage} / {totalPages}
          </span>
          <button
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminFieldAccessTable;
