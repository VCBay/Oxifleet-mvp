import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { updateVehicle, upsertVehicles } from "../data/vehicleStore";

const toIsoDate = (value) => {
  const raw = value?.trim?.() || "";
  if (!raw) {
    return "";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const deriveWarrantyStatus = (vehicle) => {
  const normalized = toIsoDate(vehicle?.warrantyExpiryDate);
  if (!normalized) {
    return "Unknown";
  }
  const now = new Date();
  const expiry = new Date(`${normalized}T23:59:59`);
  const diffDays = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return "Expired";
  }
  if (diffDays <= 60) {
    return "Expiring soon";
  }
  return "Active";
};

const getWarrantyClassName = (status) => {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Expiring soon") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Expired") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-200 text-slate-700";
};

const buildProfileDraft = (vehicle) => ({
  model: vehicle?.model || "",
  plate: vehicle?.plate || "",
  type: vehicle?.type || "Truck",
  notes: vehicle?.notes || "",
});

const buildTyreDraft = (vehicle) => ({
  brand: vehicle?.tyreSpecs?.brand || "",
  size: vehicle?.tyreSpecs?.size || "",
  frontPsi: String(vehicle?.tyreSpecs?.frontPsi ?? ""),
  rearPsi: String(vehicle?.tyreSpecs?.rearPsi ?? ""),
});

const buildWarrantyDraft = (vehicle) => ({
  provider: vehicle?.warrantyProvider || "",
  expiryDate: vehicle?.warrantyExpiryDate || "",
});

const buildReplacementDraft = (vehicle) => ({
  replacementVehicleId: vehicle?.replacementVehicleId || "none",
  replacementNotes: vehicle?.replacementNotes || "",
});

function VehicleManagement({ vehicles }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [warrantyFilter, setWarrantyFilter] = useState("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [bulkPayload, setBulkPayload] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [profileDraftById, setProfileDraftById] = useState({});
  const [tyreDraftById, setTyreDraftById] = useState({});
  const [warrantyDraftById, setWarrantyDraftById] = useState({});
  const [replacementDraftById, setReplacementDraftById] = useState({});
  const [serviceForm, setServiceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    event: "",
    cost: "",
  });

  const typeOptions = useMemo(() => {
    const set = new Set(
      vehicles.map((vehicle) => vehicle.type).filter((value) => Boolean(value))
    );
    return Array.from(set).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const warrantyStatus = deriveWarrantyStatus(vehicle);
      const queryBlob = [
        vehicle.id,
        vehicle.model,
        vehicle.plate,
        vehicle.type,
        vehicle.status,
        vehicle.warrantyProvider,
        warrantyStatus,
      ]
        .join(" ")
        .toLowerCase();

      if (searchQuery.trim()) {
        const matchesSearch = queryBlob.includes(searchQuery.trim().toLowerCase());
        if (!matchesSearch) {
          return false;
        }
      }
      if (statusFilter !== "all" && vehicle.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && vehicle.type !== typeFilter) {
        return false;
      }
      if (warrantyFilter !== "all" && warrantyStatus !== warrantyFilter) {
        return false;
      }
      return true;
    });
  }, [searchQuery, statusFilter, typeFilter, vehicles, warrantyFilter]);

  const selectedVehicle = useMemo(() => {
    const explicit = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    if (explicit) {
      return explicit;
    }
    return filteredVehicles[0] || null;
  }, [filteredVehicles, selectedVehicleId, vehicles]);

  const selectedId = selectedVehicle?.id || "";
  const selectedWarrantyStatus = deriveWarrantyStatus(selectedVehicle);
  const replacementOptions = vehicles.filter(
    (vehicle) => vehicle.id !== selectedVehicle?.id
  );

  const profileDraft = selectedVehicle
    ? profileDraftById[selectedId] || buildProfileDraft(selectedVehicle)
    : null;
  const tyreDraft = selectedVehicle
    ? tyreDraftById[selectedId] || buildTyreDraft(selectedVehicle)
    : null;
  const warrantyDraft = selectedVehicle
    ? warrantyDraftById[selectedId] || buildWarrantyDraft(selectedVehicle)
    : null;
  const replacementDraft = selectedVehicle
    ? replacementDraftById[selectedId] || buildReplacementDraft(selectedVehicle)
    : null;

  const setProfileField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setProfileDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildProfileDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setTyreField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setTyreDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildTyreDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setWarrantyField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setWarrantyDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildWarrantyDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const setReplacementField = (field, value) => {
    if (!selectedVehicle) {
      return;
    }
    setReplacementDraftById((prev) => ({
      ...prev,
      [selectedId]: {
        ...buildReplacementDraft(selectedVehicle),
        ...(prev[selectedId] || {}),
        [field]: value,
      },
    }));
  };

  const handleProfileSave = () => {
    if (!selectedVehicle || !profileDraft) {
      return;
    }
    updateVehicle(selectedId, {
      model: profileDraft.model,
      plate: profileDraft.plate,
      type: profileDraft.type,
      notes: profileDraft.notes,
    });
  };

  const handleTyreSave = () => {
    if (!selectedVehicle || !tyreDraft) {
      return;
    }
    updateVehicle(selectedId, {
      tyreSpecs: {
        brand: tyreDraft.brand,
        size: tyreDraft.size,
        frontPsi: tyreDraft.frontPsi,
        rearPsi: tyreDraft.rearPsi,
      },
    });
  };

  const handleWarrantySave = () => {
    if (!selectedVehicle || !warrantyDraft) {
      return;
    }
    updateVehicle(selectedId, {
      warrantyProvider: warrantyDraft.provider,
      warrantyExpiryDate: warrantyDraft.expiryDate,
    });
  };

  const handleServiceAdd = () => {
    if (!selectedVehicle || !serviceForm.event.trim()) {
      return;
    }
    const nextHistory = [
      {
        date: serviceForm.date || new Date().toISOString().slice(0, 10),
        event: serviceForm.event.trim(),
        cost: serviceForm.cost.trim() || "N/A",
      },
      ...(selectedVehicle.serviceHistory || []),
    ].slice(0, 10);

    updateVehicle(selectedId, {
      serviceHistory: nextHistory,
    });

    setServiceForm((prev) => ({
      ...prev,
      event: "",
      cost: "",
    }));
  };

  const handleActivationToggle = () => {
    if (!selectedVehicle) {
      return;
    }
    updateVehicle(selectedId, {
      status: selectedVehicle.status === "Inactive" ? "Active" : "Inactive",
    });
  };

  const handleReplacementSave = () => {
    if (!selectedVehicle || !replacementDraft) {
      return;
    }
    updateVehicle(selectedId, {
      replacementVehicleId:
        replacementDraft.replacementVehicleId === "none"
          ? ""
          : replacementDraft.replacementVehicleId,
      replacementNotes: replacementDraft.replacementNotes,
    });
  };

  const handleBulkUpsert = () => {
    try {
      const parsed = JSON.parse(bulkPayload);
      const payload = Array.isArray(parsed) ? parsed : [parsed];
      if (payload.length === 0) {
        setBulkFeedback("No vehicle records found in payload.");
        return;
      }
      const result = upsertVehicles(payload);
      setBulkFeedback(
        `Bulk update complete: ${result.inserted} inserted, ${result.updated} updated, ${result.total} total.`
      );
    } catch {
      setBulkFeedback("Invalid JSON payload. Provide an object or an array.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Vehicle Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vehicle list with filters, profile details, tyre specs, service history,
          warranty tracking, activation controls, replacement management, and bulk
          upload/edit.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by ID, model, plate, type, status or warranty"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="In service">In service</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.length > 0 ? (
                typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="Truck">Truck</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Warranty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warranty</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expiring soon">Expiring soon</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Vehicle list with filters
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredVehicles.length} vehicles matched
          </p>

          <div className="mt-4 space-y-3">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => {
                const warrantyStatus = deriveWarrantyStatus(vehicle);
                const isSelected = selectedVehicle?.id === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{vehicle.model}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isSelected
                            ? "bg-white/10 text-white"
                            : getWarrantyClassName(warrantyStatus)
                        }`}
                      >
                        {warrantyStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">
                      {vehicle.id} - {vehicle.plate}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {vehicle.type} - {vehicle.status}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No vehicles available. Add vehicles from the header dialog or use
                bulk upload.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Vehicle profile details
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedVehicle
                    ? `${selectedVehicle.id} - ${selectedVehicle.model}`
                    : "Select a vehicle from the list"}
                </p>
              </div>
              {selectedVehicle ? (
                <Button onClick={handleActivationToggle} type="button" variant="outline">
                  {selectedVehicle.status === "Inactive"
                    ? "Activate vehicle"
                    : "Deactivate vehicle"}
                </Button>
              ) : null}
            </div>

            {selectedVehicle && profileDraft ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-profile-model">Model</Label>
                    <Input
                      id="vehicle-profile-model"
                      value={profileDraft.model}
                      onChange={(event) => setProfileField("model", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-profile-plate">Plate</Label>
                    <Input
                      id="vehicle-profile-plate"
                      value={profileDraft.plate}
                      onChange={(event) => setProfileField("plate", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select
                      value={profileDraft.type}
                      onValueChange={(value) => setProfileField("type", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                        <SelectItem value="Trailer">Trailer</SelectItem>
                        <SelectItem value="Utility">Utility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Input value={selectedVehicle.status} disabled />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle-profile-notes">Notes</Label>
                  <Textarea
                    id="vehicle-profile-notes"
                    value={profileDraft.notes}
                    onChange={(event) => setProfileField("notes", event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Added{" "}
                    {selectedVehicle.createdAt
                      ? new Date(selectedVehicle.createdAt).toLocaleString()
                      : "-"}
                  </p>
                  <Button onClick={handleProfileSave} type="button">
                    Save profile
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {selectedVehicle && tyreDraft ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Tyre specifications per vehicle
                </h3>
                <div className="mt-4 grid gap-3">
                  <Input
                    value={tyreDraft.brand}
                    onChange={(event) => setTyreField("brand", event.target.value)}
                    placeholder="Brand"
                  />
                  <Input
                    value={tyreDraft.size}
                    onChange={(event) => setTyreField("size", event.target.value)}
                    placeholder="Size"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={tyreDraft.frontPsi}
                      onChange={(event) => setTyreField("frontPsi", event.target.value)}
                      placeholder="Front PSI"
                      type="number"
                    />
                    <Input
                      value={tyreDraft.rearPsi}
                      onChange={(event) => setTyreField("rearPsi", event.target.value)}
                      placeholder="Rear PSI"
                      type="number"
                    />
                  </div>
                  <Button onClick={handleTyreSave} type="button" variant="outline">
                    Save tyre specs
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Warranty tracking
                </h3>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWarrantyClassName(
                      selectedWarrantyStatus
                    )}`}
                  >
                    {selectedWarrantyStatus}
                  </span>
                </div>
                {warrantyDraft ? (
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={warrantyDraft.provider}
                      onChange={(event) =>
                        setWarrantyField("provider", event.target.value)
                      }
                      placeholder="Warranty provider"
                    />
                    <Input
                      value={warrantyDraft.expiryDate}
                      onChange={(event) =>
                        setWarrantyField("expiryDate", event.target.value)
                      }
                      type="date"
                    />
                    <Button
                      onClick={handleWarrantySave}
                      type="button"
                      variant="outline"
                    >
                      Save warranty
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {selectedVehicle ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Service history per vehicle
                </h3>
                <div className="mt-4 space-y-2">
                  {(selectedVehicle.serviceHistory || []).slice(0, 5).map((entry, index) => (
                    <div
                      key={`${selectedVehicle.id}-service-${index}`}
                      className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{entry.event}</p>
                      <p className="mt-1 text-slate-600">
                        {entry.date} - {entry.cost}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3">
                  <Input
                    value={serviceForm.date}
                    onChange={(event) =>
                      setServiceForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    type="date"
                  />
                  <Input
                    value={serviceForm.event}
                    onChange={(event) =>
                      setServiceForm((prev) => ({ ...prev, event: event.target.value }))
                    }
                    placeholder="Service event"
                  />
                  <Input
                    value={serviceForm.cost}
                    onChange={(event) =>
                      setServiceForm((prev) => ({ ...prev, cost: event.target.value }))
                    }
                    placeholder="Cost, e.g. $560"
                  />
                  <Button onClick={handleServiceAdd} type="button" variant="outline">
                    Add service entry
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Replacement vehicle management
                </h3>
                {replacementDraft ? (
                  <div className="mt-4 grid gap-3">
                    <Select
                      value={replacementDraft.replacementVehicleId}
                      onValueChange={(value) =>
                        setReplacementField("replacementVehicleId", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select replacement vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No replacement</SelectItem>
                        {replacementOptions.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.id} - {vehicle.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={replacementDraft.replacementNotes}
                      onChange={(event) =>
                        setReplacementField("replacementNotes", event.target.value)
                      }
                      placeholder="Replacement reason, dates, and planning notes"
                      rows={4}
                    />
                    <Button
                      onClick={handleReplacementSave}
                      type="button"
                      variant="outline"
                    >
                      Save replacement plan
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Bulk upload/edit vehicle data
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Paste JSON object or array. Records with matching `id` are updated, new
          IDs are inserted.
        </p>
        <div className="mt-4 grid gap-3">
          <Textarea
            value={bulkPayload}
            onChange={(event) => setBulkPayload(event.target.value)}
            placeholder='[{"id":"VH-100","model":"Freightliner Cascadia","plate":"TX-1001","type":"Truck","status":"Active"}]'
            rows={6}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleBulkUpsert} type="button">
              Apply bulk upload/edit
            </Button>
            {bulkFeedback ? (
              <p className="text-sm text-slate-600">{bulkFeedback}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default VehicleManagement;
