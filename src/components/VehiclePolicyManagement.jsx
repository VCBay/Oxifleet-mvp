import { useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
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
import {
  getVehiclePolicyState,
  saveVehiclePolicyVersion,
  setVehiclePolicyStatus,
  subscribeVehiclePolicies,
} from "../data/vehiclePolicyStore";

const todayIso = () => new Date().toISOString().slice(0, 10);

const toScopeLabel = (policy) => {
  const scope = policy.appliesTo || {};
  const parts = [];
  if (scope.fleet) {
    parts.push(`Fleet: ${scope.fleet}`);
  }
  if (scope.vehicleGroup) {
    parts.push(`Group: ${scope.vehicleGroup}`);
  }
  if (scope.vehicleClass) {
    parts.push(`Class: ${scope.vehicleClass}`);
  }
  if (scope.vehicleId) {
    parts.push(`Vehicle: ${scope.vehicleId}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "Unscoped";
};

const statusClassName = (status) => {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Draft") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Retired") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-slate-100 text-slate-700";
};

function VehiclePolicyManagement({ vehicles }) {
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState
  );

  const [policySearch, setPolicySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyCode, setHistoryCode] = useState("all");
  const [form, setForm] = useState({
    name: "",
    policyCode: "",
    status: "Active",
    fleet: "",
    vehicleGroup: "",
    vehicleClass: "",
    vehicleId: "all",
    allowedServiceTypes: "",
    allowedTyreBrands: "",
    allowedTyreCategories: "",
    servicePriceLimit: "",
    tyrePriceLimit: "",
    approvalThreshold: "",
    seasonalTyreRules: "",
    specialCaseExceptions: "",
    changeNote: "",
    effectiveFrom: todayIso(),
  });

  const allPolicies = useMemo(() => {
    return [...policyState.policies].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [policyState.policies]);

  const vehicleClasses = useMemo(() => {
    const classes = new Set(
      vehicles.map((vehicle) => String(vehicle.type || "").trim()).filter(Boolean)
    );
    return Array.from(classes).sort();
  }, [vehicles]);

  const policyCodes = useMemo(() => {
    const codes = new Set(allPolicies.map((policy) => policy.policyCode));
    return Array.from(codes).sort();
  }, [allPolicies]);

  const latestPoliciesByCode = useMemo(() => {
    const map = new Map();
    allPolicies.forEach((policy) => {
      const current = map.get(policy.policyCode);
      if (!current || Number(policy.version) > Number(current.version)) {
        map.set(policy.policyCode, policy);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.policyCode.localeCompare(b.policyCode)
    );
  }, [allPolicies]);

  const filteredLatestPolicies = useMemo(() => {
    return latestPoliciesByCode.filter((policy) => {
      if (statusFilter !== "all" && policy.status !== statusFilter) {
        return false;
      }
      if (!policySearch.trim()) {
        return true;
      }
      const scopeLabel = toScopeLabel(policy);
      const blob = [
        policy.name,
        policy.policyCode,
        policy.status,
        scopeLabel,
        policy.allowedServiceTypes.join(" "),
        policy.allowedTyreBrands.join(" "),
        policy.allowedTyreCategories.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(policySearch.trim().toLowerCase());
    });
  }, [latestPoliciesByCode, policySearch, statusFilter]);

  const classWisePolicies = useMemo(() => {
    const map = new Map();
    latestPoliciesByCode.forEach((policy) => {
      const className = policy.appliesTo?.vehicleClass;
      if (!className) {
        return;
      }
      const entry = map.get(className) || [];
      entry.push(policy);
      map.set(className, entry);
    });

    return Array.from(map.entries())
      .map(([className, policies]) => ({
        className,
        policies,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [latestPoliciesByCode]);

  const selectedHistory = useMemo(() => {
    if (historyCode === "all") {
      return allPolicies;
    }
    return allPolicies.filter((policy) => policy.policyCode === historyCode);
  }, [allPolicies, historyCode]);

  const handleFormField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFormSelect = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreatePolicyVersion = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    const nextPolicy = saveVehiclePolicyVersion({
      name: form.name,
      policyCode: form.policyCode,
      status: form.status,
      allowedServiceTypes: form.allowedServiceTypes,
      allowedTyreBrands: form.allowedTyreBrands,
      allowedTyreCategories: form.allowedTyreCategories,
      servicePriceLimit: form.servicePriceLimit,
      tyrePriceLimit: form.tyrePriceLimit,
      approvalThreshold: form.approvalThreshold,
      seasonalTyreRules: form.seasonalTyreRules,
      specialCaseExceptions: form.specialCaseExceptions,
      changeNote: form.changeNote,
      effectiveFrom: form.effectiveFrom,
      appliesTo: {
        fleet: form.fleet,
        vehicleGroup: form.vehicleGroup,
        vehicleClass: form.vehicleClass,
        vehicleId: form.vehicleId === "all" ? "" : form.vehicleId,
      },
    });

    setHistoryCode(nextPolicy.policyCode);
    setForm((prev) => ({
      ...prev,
      policyCode: nextPolicy.policyCode,
      changeNote: "",
      effectiveFrom: todayIso(),
    }));
  };

  const handleLoadFromPolicy = (policy) => () => {
    setForm({
      name: policy.name,
      policyCode: policy.policyCode,
      status: policy.status,
      fleet: policy.appliesTo?.fleet || "",
      vehicleGroup: policy.appliesTo?.vehicleGroup || "",
      vehicleClass: policy.appliesTo?.vehicleClass || "",
      vehicleId: policy.appliesTo?.vehicleId || "all",
      allowedServiceTypes: policy.allowedServiceTypes.join(", "),
      allowedTyreBrands: policy.allowedTyreBrands.join(", "),
      allowedTyreCategories: policy.allowedTyreCategories.join(", "),
      servicePriceLimit:
        policy.servicePriceLimit === null ? "" : String(policy.servicePriceLimit),
      tyrePriceLimit:
        policy.tyrePriceLimit === null ? "" : String(policy.tyrePriceLimit),
      approvalThreshold:
        policy.approvalThreshold === null ? "" : String(policy.approvalThreshold),
      seasonalTyreRules: policy.seasonalTyreRules || "",
      specialCaseExceptions: policy.specialCaseExceptions || "",
      changeNote: "",
      effectiveFrom: todayIso(),
    });
  };

  return (
    <section className="space-y-6">
       <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#1d3148_0%,#0f1b33_45%,#070b14_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
               Policy Management
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/50 sm:text-sm">
              Define and manage vehicle policies with flexible scoping and versioning.
            </p>
          </div>
        </div>
      </header>
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Vehicle Policy</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure policy management and class-wise policy rules. You can keep
          different policies for the same vehicle or the same class by creating
          separate policy codes and/or versions.
        </p>

        <form className="mt-5 grid gap-4" onSubmit={handleCreatePolicyVersion}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="policy-name">Policy name</Label>
              <Input
                id="policy-name"
                onChange={handleFormField("name")}
                placeholder="Safety Fleet Standard"
                required
                value={form.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policy-code">Policy code (version family)</Label>
              <Input
                id="policy-code"
                onChange={handleFormField("policyCode")}
                placeholder="SAFE-FLEET"
                value={form.policyCode}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select onValueChange={handleFormSelect("status")} value={form.status}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="policy-fleet">Apply per fleet</Label>
              <Input
                id="policy-fleet"
                onChange={handleFormField("fleet")}
                placeholder="North Fleet"
                value={form.fleet}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="policy-group">Apply per vehicle group</Label>
              <Input
                id="policy-group"
                onChange={handleFormField("vehicleGroup")}
                placeholder="Long-haul"
                value={form.vehicleGroup}
              />
            </div>
            <div className="grid gap-2">
              <Label>Class-wise policy</Label>
              <Select
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleClass: value === "none" ? "" : value,
                  }))
                }
                value={form.vehicleClass || "none"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No class scope</SelectItem>
                  {vehicleClasses.map((vehicleClass) => (
                    <SelectItem key={vehicleClass} value={vehicleClass}>
                      {vehicleClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Vehicle-specific policy</Label>
              <Select onValueChange={handleFormSelect("vehicleId")} value={form.vehicleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No vehicle scope</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.id} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="service-types">Allowed service types</Label>
              <Input
                id="service-types"
                onChange={handleFormField("allowedServiceTypes")}
                placeholder="Oil change, Brake service, Alignment"
                value={form.allowedServiceTypes}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tyre-brands">Allowed tyre brands</Label>
              <Input
                id="tyre-brands"
                onChange={handleFormField("allowedTyreBrands")}
                placeholder="Michelin, Bridgestone"
                value={form.allowedTyreBrands}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tyre-categories">Allowed tyre categories</Label>
              <Input
                id="tyre-categories"
                onChange={handleFormField("allowedTyreCategories")}
                placeholder="All-season, Winter"
                value={form.allowedTyreCategories}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="service-limit">Service price limit</Label>
              <Input
                id="service-limit"
                onChange={handleFormField("servicePriceLimit")}
                placeholder="1500"
                type="number"
                value={form.servicePriceLimit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tyre-limit">Tyre price limit</Label>
              <Input
                id="tyre-limit"
                onChange={handleFormField("tyrePriceLimit")}
                placeholder="2400"
                type="number"
                value={form.tyrePriceLimit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-threshold">Approval threshold</Label>
              <Input
                id="approval-threshold"
                max={100}
                min={0}
                onChange={handleFormField("approvalThreshold")}
                placeholder="85"
                type="number"
                value={form.approvalThreshold}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effective-from">Effective from</Label>
              <Input
                id="effective-from"
                onChange={handleFormField("effectiveFrom")}
                type="date"
                value={form.effectiveFrom}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seasonal-rules">Seasonal tyre rules</Label>
              <Textarea
                id="seasonal-rules"
                onChange={handleFormField("seasonalTyreRules")}
                placeholder="Dec-Feb: Winter tyres mandatory in northern routes."
                rows={3}
                value={form.seasonalTyreRules}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="special-exceptions">Special case exceptions</Label>
              <Textarea
                id="special-exceptions"
                onChange={handleFormField("specialCaseExceptions")}
                placeholder="Emergency dispatch vehicles can exceed tyre limit by 10%."
                rows={3}
                value={form.specialCaseExceptions}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="change-note">Version change note</Label>
            <Input
              id="change-note"
              onChange={handleFormField("changeNote")}
              placeholder="Raised service cap for class Truck."
              value={form.changeNote}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]">Save as policy version</Button>
            <p className="text-xs text-slate-500">
              New save creates the next version in the selected policy code family.
            </p>
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Policy records</h3>
            <span className="text-xs text-slate-500">
              {filteredLatestPolicies.length} policy families
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Input
                className="pr-10"
                onChange={(event) => setPolicySearch(event.target.value)}
                placeholder="Search name/code/scope"
                value={policySearch}
              />
              {policySearch ? (
                <button
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => setPolicySearch("")}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {filteredLatestPolicies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No policy records found.
              </div>
            ) : (
              filteredLatestPolicies.map((policy) => (
                <article
                  key={policy.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {policy.name} (v{policy.version})
                      </p>
                      <p className="text-xs text-slate-500">
                        {policy.policyCode} | {toScopeLabel(policy)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                        policy.status
                      )}`}
                    >
                      {policy.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={handleLoadFromPolicy(policy)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Load in form
                    </Button>
                    <Select
                      onValueChange={(value) => setVehiclePolicyStatus(policy.id, value)}
                      value={policy.status}
                    >
                      <SelectTrigger className="h-8 w-[140px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Class-wise policy view</h3>
          <p className="mt-1 text-sm text-slate-500">
            Multiple policies can exist for the same class. Latest version per policy
            code is shown here.
          </p>
          <div className="card-list-scrollbar mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {classWisePolicies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No class-scoped policies yet.
              </div>
            ) : (
              classWisePolicies.map((item) => (
                <div
                  key={item.className}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{item.className}</p>
                    <span className="text-xs text-slate-500">
                      {item.policies.length} policies
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {item.policies.map((policy) => (
                      <span
                        key={policy.id}
                        className="rounded-full bg-white px-2.5 py-1 text-slate-700"
                      >
                        {policy.policyCode} v{policy.version}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Policy version history</h3>
          <Select onValueChange={setHistoryCode} value={historyCode}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filter by policy code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All policy codes</SelectItem>
              {policyCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
          {selectedHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No version history found.
            </div>
          ) : (
            selectedHistory.map((policy) => (
              <article
                key={policy.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {policy.policyCode} | {policy.name} | v{policy.version}
                    </p>
                    <p className="text-xs text-slate-500">
                      Effective {policy.effectiveFrom || "-"} | {toScopeLabel(policy)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(
                      policy.status
                    )}`}
                  >
                    {policy.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <p>
                    Allowed service types:{" "}
                    {policy.allowedServiceTypes.length > 0
                      ? policy.allowedServiceTypes.join(", ")
                      : "-"}
                  </p>
                  <p>
                    Allowed tyre brands/categories:{" "}
                    {[...policy.allowedTyreBrands, ...policy.allowedTyreCategories].length >
                    0
                      ? `${policy.allowedTyreBrands.join(", ")} | ${policy.allowedTyreCategories.join(", ")}`
                      : "-"}
                  </p>
                  <p>
                    Price limits: Service{" "}
                    {policy.servicePriceLimit === null ? "-" : `$${policy.servicePriceLimit}`},
                    Tyre {policy.tyrePriceLimit === null ? "-" : `$${policy.tyrePriceLimit}`}
                  </p>
                  <p>
                    Approval threshold:{" "}
                    {policy.approvalThreshold === null
                      ? "-"
                      : `${policy.approvalThreshold}%`}
                  </p>
                </div>

                {(policy.seasonalTyreRules || policy.specialCaseExceptions) && (
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <p>Seasonal tyre rules: {policy.seasonalTyreRules || "-"}</p>
                    <p>Special case exceptions: {policy.specialCaseExceptions || "-"}</p>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Change note: {policy.changeNote || "-"} | Updated{" "}
                  {new Date(policy.updatedAt).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default VehiclePolicyManagement;
