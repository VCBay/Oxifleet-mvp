import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileBadge2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { adminFleetDataRows } from "../data/adminStore";
import TableLoadingRow from "../components/common/TableLoadingRow";
import ApiCallLoaderOverlay from "../components/common/ApiCallLoaderOverlay";
import {
  addAdminFleetDriver,
  addAdminFleetVehicle,
  bulkUploadAdminFleets,
  createAdminFleet,
  deleteAdminFleet,
  listAdminFleets,
  setAdminFleetStatus,
  updateAdminFleet,
} from "../services/adminFleetApi";
const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const INITIAL_FORM_STATE = {
  companyName: "",
  street: "",
  postcode: "",
  city: "",
  registrationNumber: "",
  vatNumber: "",
  managingDirector: "",
};

const TABLE_COLUMNS = [
  { key: "companyName", label: "Company Name" },
  { key: "street", label: "Street" },
  { key: "postcode", label: "Postcode" },
  { key: "city", label: "City" },
  { key: "registrationNumber", label: "Registration Number" },
  { key: "vatNumber", label: "VAT Number" },
  { key: "managingDirector", label: "Managing Director" },
];

const normalizeFallbackFleets = (rows) =>
  rows.map((row, index) => ({
    id: `fallback-${index + 1}`,
    fleetCode: `FL-FB-${index + 1}`,
    companyName: row.companyName,
    street: row.street,
    postcode: row.postcode,
    city: row.city,
    registrationNumber: row.registrationNumber,
    vatNumber: row.vatNumber,
    managingDirector: row.managingDirector,
    isActive: true,
    vehicles: [],
    drivers: [],
  }));

function AdminFleetDataPage() {
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [targetRow, setTargetRow] = useState(null);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [vehicleInput, setVehicleInput] = useState({ plate: "", model: "" });
  const [driverInput, setDriverInput] = useState({ name: "", email: "", phone: "" });

  const loadFleets = async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const fleetRows = await listAdminFleets();
      if (fleetRows.length) {
        setRows(fleetRows);
        return;
      }
      setRows(normalizeFallbackFleets(adminFleetDataRows));
    } catch (error) {
      setPageError(error.message || "Failed to load fleet data from backend.");
      setRows(normalizeFallbackFleets(adminFleetDataRows));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFleets();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const base = TABLE_COLUMNS.some((column) => String(row[column.key] || "").toLowerCase().includes(query));
      const status = row.isActive ? "active" : "deactivated";
      return base || status.includes(query);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const allRowsOnPageSelected = pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));

  const refreshSelectedFleet = (fleetId, fleetRows) => {
    if (!fleetId) return;
    const current = fleetRows.find((row) => row.id === fleetId) || null;
    setSelectedFleet(current);
  };

  const openCreateModal = () => {
    setFormValues(INITIAL_FORM_STATE);
    setIsEntryModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormValues({
      companyName: row.companyName || "",
      street: row.street || "",
      postcode: row.postcode || "",
      city: row.city || "",
      registrationNumber: row.registrationNumber || "",
      vatNumber: row.vatNumber || "",
      managingDirector: row.managingDirector || "",
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

  const openFleetProfile = (row) => {
    setSelectedFleet(row);
    setVehicleInput({ plate: "", model: "" });
    setDriverInput({ name: "", email: "", phone: "" });
    setIsProfileModalOpen(true);
  };

  const closeFleetProfile = () => {
    setSelectedFleet(null);
    setIsProfileModalOpen(false);
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
      await deleteAdminFleet(targetRow.id);
      const nextRows = rows.filter((row) => row.id !== targetRow.id);
      setRows(nextRows);
      setSelectedIds((current) => current.filter((id) => id !== targetRow.id));
      if (selectedFleet?.id === targetRow.id) closeFleetProfile();
      closeDeleteModal();
    } catch (error) {
      setPageError(error.message || "Failed to delete fleet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;

    try {
      setIsSubmitting(true);
      await Promise.all(selectedIds.map((id) => deleteAdminFleet(id)));
      const nextRows = rows.filter((row) => !selectedIds.includes(row.id));
      setRows(nextRows);
      if (selectedFleet?.id && selectedIds.includes(selectedFleet.id)) {
        closeFleetProfile();
      }
      setSelectedIds([]);
    } catch (error) {
      setPageError(error.message || "Failed to delete selected fleets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNewEntry = async () => {
    if (!formValues.companyName.trim() || !formValues.city.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await createAdminFleet(formValues);
      const nextRows = [created, ...rows];
      setRows(nextRows);
      closeEntryModal();
      loadFleets();
      setPage(1);
    } catch (error) {
      setPageError(error.message || "Failed to create fleet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEditEntry = async () => {
    if (!targetRow?.id || !formValues.companyName.trim() || !formValues.city.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await updateAdminFleet(targetRow.id, formValues);
      const nextRows = rows.map((row) => (row.id === targetRow.id ? updated : row));
      setRows(nextRows);
      refreshSelectedFleet(targetRow.id, nextRows);
      closeEditModal();
    } catch (error) {
      setPageError(error.message || "Failed to update fleet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFleetActive = async (fleetId, currentStatus) => {
    try {
      setIsSubmitting(true);
      const updated = await setAdminFleetStatus(fleetId, !currentStatus);
      const nextRows = rows.map((row) => (row.id === fleetId ? updated : row));
      setRows(nextRows);
      refreshSelectedFleet(fleetId, nextRows);
    } catch (error) {
      setPageError(error.message || "Failed to update fleet status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVehicleInFleet = async () => {
    if (!selectedFleet?.id || !vehicleInput.plate.trim() || !vehicleInput.model.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await addAdminFleetVehicle(selectedFleet.id, {
        plate: vehicleInput.plate.trim(),
        model: vehicleInput.model.trim(),
      });
      const nextRows = rows.map((row) => (row.id === selectedFleet.id ? updated : row));
      setRows(nextRows);
      refreshSelectedFleet(selectedFleet.id, nextRows);
      setVehicleInput({ plate: "", model: "" });
    } catch (error) {
      setPageError(error.message || "Failed to add vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDriverInFleet = async () => {
    if (!selectedFleet?.id || !driverInput.name.trim() || !driverInput.email.trim()) return;

    try {
      setIsSubmitting(true);
      const updated = await addAdminFleetDriver(selectedFleet.id, {
        name: driverInput.name.trim(),
        email: driverInput.email.trim(),
        phone: driverInput.phone.trim() || "N/A",
      });
      const nextRows = rows.map((row) => (row.id === selectedFleet.id ? updated : row));
      setRows(nextRows);
      refreshSelectedFleet(selectedFleet.id, nextRows);
      setDriverInput({ name: "", email: "", phone: "" });
    } catch (error) {
      setPageError(error.message || "Failed to add driver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRowSelect = (rowId) => {
    setSelectedIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
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
      const result = await bulkUploadAdminFleets(bulkFile);
      const importedRows = Array.isArray(result.imported) ? result.imported : [];

      if (importedRows.length) {
        setRows((current) => [...importedRows, ...current]);
      }

      const skippedPreview = Array.isArray(result.skipped)
        ? result.skipped
            .slice(0, 2)
            .map((item) => `L${item.lineNumber}: ${item.reason}`)
            .join(" | ")
        : "";

      setBulkMessage(
        `Imported ${result.importedCount} fleets. Skipped ${result.skippedCount}.${
          skippedPreview ? ` ${skippedPreview}` : ""
        }`,
      );
      setTimeout(() => closeUploadModal(), 900);
    } catch (error) {
      setPageError(error.message || "Failed to import fleet file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {TABLE_COLUMNS.map((column) => (
        <label className="space-y-1.5" key={column.key}>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            onChange={(event) => setFormValues((current) => ({ ...current, [column.key]: event.target.value }))}
            placeholder={`Enter ${column.label.toLowerCase()}`}
            type="text"
            value={formValues[column.key] || ""}
          />
        </label>
      ))}
    </div>
  );

  const fleetInitials = useMemo(() => {
    const name = String(selectedFleet?.companyName || "FL").trim();
    return name
      .split(/s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2);
  }, [selectedFleet?.companyName]);

  return (
    <section className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Fleet Companies</h2>
      <p className="text-sm text-slate-500">
        Manage fleet company records.
      </p>

      <ApiCallLoaderOverlay
        show={isSubmitting}
        title="Processing API request"
        subtitle="Please wait until we receive response from server."
      />

      {pageError ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">{pageError}</p> : null}

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
              placeholder="Search by company, city, registration, VAT..."
              type="text"
              value={search}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" disabled={isLoading} onClick={() => loadFleets()}><RotateCcw size={14} /></button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" disabled={isSubmitting} onClick={() => setIsUploadModalOpen(true)} type="button"><Upload size={14} />Bulk upload</button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" disabled={isSubmitting} onClick={openCreateModal} type="button"><Plus size={14} />Add fleet</button>
            {selectedIds.length > 0 && <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60" disabled={isSubmitting} onClick={deleteSelected} type="button"><Trash2 size={14} />Delete selected ({selectedIds.length})</button>}
          </div>
        </div>

        {/* <p className="mb-2 text-xs font-medium text-violet-700/80">Tip: Click any row to open Fleet Full Profile.</p> */}
        <div className="mt-3 w-full overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed divide-y divide-slate-200 text-xs sm:text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-9 px-2 py-2 text-left sm:w-10 sm:px-3"><input checked={allRowsOnPageSelected} className="size-4 rounded border-slate-300" onChange={toggleSelectAllOnPage} type="checkbox" /></th>
                {TABLE_COLUMNS.map((column) => (<th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-3 sm:text-xs" key={column.key}><span className="block truncate">{column.label}</span></th>))}
                <th className="w-20 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-3 sm:text-xs">Status</th>
                <th className="w-16 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:w-20 sm:px-3 sm:text-xs">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <TableLoadingRow
                  colSpan={TABLE_COLUMNS.length + 3}
                  title="Refreshing fleet records..."
                  subtitle="Please wait while we sync the latest fleets."
                />
              ) : (
                <>
                  {pagedRows.map((row) => {
                    const isActive = Boolean(row.isActive);
                    return (
                      <tr className="group cursor-pointer transition-all duration-150 hover:bg-violet-50/70 hover:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.18)]" key={row.id} onClick={() => openFleetProfile(row)}>
                        <td className="px-2 py-2 sm:px-3" onClick={(event) => event.stopPropagation()}><input checked={selectedIds.includes(row.id)} className="size-4 rounded border-slate-300" onChange={() => toggleRowSelect(row.id)} type="checkbox" /></td>
                        {TABLE_COLUMNS.map((column) => (<td className="px-2 py-2 text-slate-700 sm:px-3" key={`${row.id}-${column.key}`}><span className="block truncate" title={String(row[column.key] || "N/A")}>{String(row[column.key] || "N/A")}</span></td>))}
                        <td className="px-2 py-2 sm:px-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{isActive ? "Active" : "Deactivated"}</span></td>
                        <td className="px-2 py-2 sm:px-3" onClick={(event) => event.stopPropagation()}>
                          <div className="relative flex items-center justify-end gap-2">
                            <button aria-label={`Open actions for ${row.companyName}`} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50" onClick={() => setOpenActionRowId((current) => (current === row.id ? "" : row.id))} type="button"><MoreVertical size={14} /></button>
                            {openActionRowId === row.id ? (
                              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => { openFleetProfile(row); setOpenActionRowId(""); }} type="button"><Eye size={13} />Open profile</button>
                                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100" onClick={() => openEditModal(row)} type="button"><Pencil size={13} />Edit</button>
                                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50" onClick={() => { toggleFleetActive(row.id, isActive); setOpenActionRowId(""); }} type="button"><X size={13} />{isActive ? "Deactivate" : "Activate"}</button>
                                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50" onClick={() => openDeleteModal(row)} type="button"><Trash2 size={13} />Delete</button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!pagedRows.length ? (
                    <tr><td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={TABLE_COLUMNS.length + 3}>No fleet company records found for current search.</td></tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{isLoading ? "Loading fleets..." : `Showing ${pagedRows.length} of ${filteredRows.length} company records`}</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500" htmlFor="fleet-page-size">Rows</label>
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700" id="fleet-page-size" onChange={(event) => onPageSizeChange(event.target.value)} value={pageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button"><ChevronLeft size={13} />Prev</button>
            <span className="text-xs font-semibold text-slate-700">{safePage} / {totalPages}</span>
            <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next<ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {isProfileModalOpen && selectedFleet ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-3xl border border-violet-100 bg-slate-50 shadow-2xl">
            <header className="rounded-t-3xl border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-3 text-white sm:px-6 sm:py-3.5">
              <div className="flex flex-col gap-2.5 lg:gap-3">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/15 text-xs font-semibold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md sm:size-11 sm:text-sm">
                      {fleetInitials}
                    </div>

                    <div className="min-w-0">
                      <span className="inline-flex items-center rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-100">
                        Fleet Full Profile
                      </span>
                      <h3 className="mt-1.5 truncate text-lg font-semibold leading-tight text-white sm:text-xl">
                        {selectedFleet.companyName}
                      </h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-indigo-100/90">
                        <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-medium text-indigo-50">
                          {selectedFleet.fleetCode || selectedFleet.id}
                        </span>
                        <span className="text-indigo-200/80">•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-indigo-200/90" />
                          {selectedFleet.city || "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center">
                    <button
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/12 px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/20 disabled:opacity-60 sm:w-auto"
                      disabled={isSubmitting}
                      onClick={() => toggleFleetActive(selectedFleet.id, selectedFleet.isActive)}
                      type="button"
                    >
                      <ShieldCheck size={13} />
                      {selectedFleet.isActive ? "Deactivate Fleet" : "Activate Fleet"}
                    </button>
                    <button
                      aria-label="Close profile"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-white/25 bg-white/12 px-2.5 py-1.5 text-white transition-all duration-200 hover:border-white/40 hover:bg-white/20 sm:w-9 sm:px-0"
                      onClick={closeFleetProfile}
                      type="button"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-3">
                  <div className="group rounded-xl border border-white/18 bg-white/10 p-2.5 backdrop-blur-md transition-all duration-200 hover:border-white/28 hover:bg-white/15">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-100/90">Status</p>
                        <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${selectedFleet.isActive ? "bg-emerald-600 text-emerald-50" : "bg-rose-600 text-rose-50"}`}>
                          <span className={`size-1.5 rounded-full ${selectedFleet.isActive ? "bg-emerald-300" : "bg-slate-300"}`} />
                          {selectedFleet.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                      <BadgeCheck size={16} className="text-indigo-100/80 transition-transform duration-200 group-hover:scale-105" />
                    </div>
                  </div>

                  <div className="group rounded-xl border border-white/18 bg-white/10 p-2.5 backdrop-blur-md transition-all duration-200 hover:border-white/28 hover:bg-white/15">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-100/90">Vehicles</p>
                        <p className="mt-0.5 text-base font-semibold text-white">{(selectedFleet.vehicles || []).length}</p>
                      </div>
                      <FileBadge2 size={16} className="text-indigo-100/80 transition-transform duration-200 group-hover:scale-105" />
                    </div>
                  </div>

                  <div className="group rounded-xl border border-white/18 bg-white/10 p-2.5 backdrop-blur-md transition-all duration-200 hover:border-white/28 hover:bg-white/15">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-100/90">Drivers</p>
                        <p className="mt-0.5 text-base font-semibold text-white">{(selectedFleet.drivers || []).length}</p>
                      </div>
                      <Users size={16} className="text-indigo-100/80 transition-transform duration-200 group-hover:scale-105" />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <section className="p-5 sm:p-6">
              <div className="grid gap-4 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Building2 size={16} />
                    <h4 className="text-sm font-semibold uppercase tracking-wide">Company Profile Data</h4>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {TABLE_COLUMNS.map((column) => (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={column.key}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{column.label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{selectedFleet[column.key] || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-900">
                      <ShieldCheck size={16} />
                      <h4 className="text-sm font-semibold uppercase tracking-wide">Control Panel</h4>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      onClick={() => openEditModal(selectedFleet)}
                      type="button"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Managing Director</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedFleet.managingDirector || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Registration Number</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedFleet.registrationNumber || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">VAT Number</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedFleet.vatNumber || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedFleet.street || "N/A"}</p>
                      <p className="text-xs text-slate-500">{selectedFleet.postcode || "N/A"}, {selectedFleet.city || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileBadge2 size={16} className="text-slate-700" />
                      <h4 className="text-base font-semibold text-slate-900">Fleet Vehicles</h4>
                    </div>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{(selectedFleet.vehicles || []).length} total</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" onChange={(event) => setVehicleInput((current) => ({ ...current, plate: event.target.value }))} placeholder="Vehicle plate" type="text" value={vehicleInput.plate} />
                    <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" onChange={(event) => setVehicleInput((current) => ({ ...current, model: event.target.value }))} placeholder="Brand / model" type="text" value={vehicleInput.model} />
                  </div>
                  <button className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" disabled={isSubmitting || !selectedFleet.isActive} onClick={addVehicleInFleet} type="button"><Plus size={13} />Add vehicle</button>
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {(selectedFleet.vehicles || []).map((vehicle) => (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={vehicle.id}><p className="text-sm font-semibold text-slate-800">{vehicle.plate}</p><p className="text-xs text-slate-500">{vehicle.model}</p></div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-slate-700" />
                      <h4 className="text-base font-semibold text-slate-900">Fleet Drivers</h4>
                    </div>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{(selectedFleet.drivers || []).length} total</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:col-span-2" onChange={(event) => setDriverInput((current) => ({ ...current, name: event.target.value }))} placeholder="Driver name" type="text" value={driverInput.name} />
                    <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" onChange={(event) => setDriverInput((current) => ({ ...current, email: event.target.value }))} placeholder="Driver email" type="email" value={driverInput.email} />
                    <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100" onChange={(event) => setDriverInput((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" type="text" value={driverInput.phone} />
                  </div>
                  <button className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" disabled={isSubmitting || !selectedFleet.isActive} onClick={addDriverInFleet} type="button"><UserPlus size={13} />Add driver</button>
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {(selectedFleet.drivers || []).map((driver) => (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={driver.id}><p className="text-sm font-semibold text-slate-800">{driver.name}</p><p className="text-xs text-slate-500">{driver.email}</p><p className="text-xs text-slate-500">{driver.phone}</p></div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete fleet company?</h3>
            <p className="mt-2 text-sm text-slate-500">Are you sure you want to delete <span className="font-semibold text-slate-700">{targetRow?.companyName || "this record"}</span>? This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={closeDeleteModal} type="button">Cancel</button>
              <button className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60" disabled={isSubmitting} onClick={deleteRow} type="button"><Trash2 size={13} />Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {(isEntryModalOpen || isEditModalOpen) ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{isEditModalOpen ? "Edit fleet company" : "Add fleet company"}</h3>
              <button aria-label="Close modal" className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" onClick={isEditModalOpen ? closeEditModal : closeEntryModal} type="button"><X size={15} /></button>
            </div>
            <p className="mt-2 text-sm text-slate-500">Fill company master data fields and save.</p>
            <div className="mt-4">{renderForm()}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={isEditModalOpen ? closeEditModal : closeEntryModal} type="button">Cancel</button>
              <button className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" disabled={isSubmitting} onClick={isEditModalOpen ? saveEditEntry : saveNewEntry} type="button"><Check size={13} />{isEditModalOpen ? "Save changes" : "Add fleet"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {isUploadModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Bulk upload fleet data</h3>
            <p className="mt-2 text-sm text-slate-500">Upload CSV/XLS/XLSX file to add multiple company records.</p>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <input accept=".csv,.xlsx,.xls" className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700" onChange={(event) => { setBulkFile(event.target.files?.[0] || null); setBulkMessage(""); }} type="file" />
              {bulkFile ? <p className="mt-2 text-xs text-slate-600">Selected file: <span className="font-semibold">{bulkFile.name}</span></p> : null}
              {bulkMessage ? <p className="mt-2 text-xs text-slate-600">{bulkMessage}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={closeUploadModal} type="button">Cancel</button>
              <button className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" disabled={isSubmitting} onClick={importBulkData} type="button"><Upload size={13} />Upload data</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AdminFleetDataPage;





















