import { useMemo, useState } from "react";
import { Boxes, CheckCircle2, CircleAlert, Link2Off } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SearchableSelect } from "./ui/searchable-select";
import { useTranslation } from "../i18n/useTranslation";

const tyreInventory = [
  {
    id: "TY-001",
    size: "295/75R22.5",
    brand: "Goodyear",
    category: "Highway",
    manufacturer: "Goodyear",
    onHand: 20,
    reserved: 8,
    etaDays: 4,
    unitPrice: 420,
  },
  {
    id: "TY-002",
    size: "295/75R22.5",
    brand: "Michelin",
    category: "All-season",
    manufacturer: "Michelin",
    onHand: 14,
    reserved: 6,
    etaDays: 5,
    unitPrice: 438,
  },
  {
    id: "TY-003",
    size: "295/75R22.5",
    brand: "Bridgestone",
    category: "All-season",
    manufacturer: "Bridgestone",
    onHand: 10,
    reserved: 9,
    etaDays: 6,
    unitPrice: 410,
  },
  {
    id: "TY-004",
    size: "11R22.5",
    brand: "Michelin",
    category: "Winter",
    manufacturer: "Michelin",
    onHand: 12,
    reserved: 4,
    etaDays: 3,
    unitPrice: 452,
  },
  {
    id: "TY-005",
    size: "11R22.5",
    brand: "Goodyear",
    category: "All-season",
    manufacturer: "Goodyear",
    onHand: 7,
    reserved: 3,
    etaDays: 5,
    unitPrice: 430,
  },
  {
    id: "TY-006",
    size: "275/80R22.5",
    brand: "Bridgestone",
    category: "Highway",
    manufacturer: "Bridgestone",
    onHand: 16,
    reserved: 7,
    etaDays: 4,
    unitPrice: 408,
  },
  {
    id: "TY-007",
    size: "275/80R22.5",
    brand: "Pirelli",
    category: "All-season",
    manufacturer: "Pirelli",
    onHand: 6,
    reserved: 2,
    etaDays: 7,
    unitPrice: 396,
  },
  {
    id: "TY-008",
    size: "315/80R22.5",
    brand: "Continental",
    category: "Highway",
    manufacturer: "Continental",
    onHand: 5,
    reserved: 4,
    etaDays: 8,
    unitPrice: 468,
  },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "all-season", label: "All-season" },
  { value: "highway", label: "Highway" },
  { value: "winter", label: "Winter" },
];

const manufacturerIntegrationStatus = [
  {
    manufacturer: "Michelin",
    status: "Connected",
    lastSync: "2026-02-24T07:24:00Z",
    syncHealth: "Realtime pricing and stock sync",
    responseMs: 220,
  },
  {
    manufacturer: "Goodyear",
    status: "Connected",
    lastSync: "2026-02-24T07:19:00Z",
    syncHealth: "Realtime availability sync",
    responseMs: 260,
  },
  {
    manufacturer: "Bridgestone",
    status: "Degraded",
    lastSync: "2026-02-24T05:54:00Z",
    syncHealth: "Partial SKU sync (batch mode)",
    responseMs: 810,
  },
  {
    manufacturer: "Pirelli",
    status: "Offline",
    lastSync: "2026-02-23T18:12:00Z",
    syncHealth: "Fallback to cached catalog",
    responseMs: 0,
  },
  {
    manufacturer: "Continental",
    status: "Connected",
    lastSync: "2026-02-24T06:57:00Z",
    syncHealth: "Realtime sync with occasional delay",
    responseMs: 430,
  },
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const integrationBadgeClass = (status) => {
  if (status === "Connected") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Degraded") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

function POSInventoryAvailabilityControl({
  vehicles = [],
  selectedVehicle = null,
  primaryPolicy = null,
}) {
  const { t } = useTranslation();
  const [vehicleId, setVehicleId] = useState(
    () => selectedVehicle?.id || vehicles[0]?.id || "",
  );
  const [requestedQty, setRequestedQty] = useState("4");
  const [category, setCategory] = useState("all");
  const [preferredBrand, setPreferredBrand] = useState(
    () => selectedVehicle?.tyreSpecs?.brand || "",
  );

  const selected = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === vehicleId) ||
      selectedVehicle ||
      null,
    [selectedVehicle, vehicleId, vehicles],
  );

  const tyreSize = selected?.tyreSpecs?.size || "";
  const requiredQty = Math.max(1, toNumber(requestedQty) || 1);

  const availableBySize = useMemo(
    () =>
      tyreInventory
        .filter((item) => normalize(item.size) === normalize(tyreSize))
        .filter(
          (item) =>
            category === "all" ||
            normalize(item.category) === normalize(category),
        )
        .map((item) => ({
          ...item,
          available: Math.max(0, item.onHand - item.reserved),
        }))
        .sort((a, b) => b.available - a.available),
    [category, tyreSize],
  );

  const preferredStock = useMemo(
    () =>
      availableBySize.find(
        (item) =>
          normalize(item.brand) ===
          normalize(preferredBrand || selected?.tyreSpecs?.brand),
      ) || null,
    [availableBySize, preferredBrand, selected?.tyreSpecs?.brand],
  );

  const availabilityResult = useMemo(() => {
    if (!tyreSize) {
      return {
        status: "No vehicle selected",
        message: "Select a vehicle to check tyre availability.",
        canFulfill: false,
      };
    }
    if (preferredStock && preferredStock.available >= requiredQty) {
      return {
        status: "Available",
        message: `${preferredStock.brand} can fulfill ${requiredQty} tyre(s) immediately.`,
        canFulfill: true,
      };
    }
    const totalAvailable = availableBySize.reduce(
      (sum, item) => sum + item.available,
      0,
    );
    if (totalAvailable >= requiredQty) {
      return {
        status: "Partially available",
        message:
          "Preferred brand is low. Required quantity can be fulfilled using alternative brands.",
        canFulfill: true,
      };
    }
    return {
      status: "Insufficient stock",
      message:
        "Current stock cannot fulfill required quantity. Check ETA and alternatives.",
      canFulfill: false,
    };
  }, [availableBySize, preferredStock, requiredQty, tyreSize]);

  const alternativeTyres = useMemo(() => {
    const allowedBrands = Array.isArray(primaryPolicy?.allowedTyreBrands)
      ? primaryPolicy.allowedTyreBrands
      : [];
    return availableBySize
      .filter((item) => normalize(item.brand) !== normalize(preferredBrand))
      .map((item) => ({
        ...item,
        policyAligned:
          allowedBrands.length === 0 ||
          allowedBrands.some(
            (brand) => normalize(brand) === normalize(item.brand),
          ),
      }))
      .sort((a, b) => {
        if (a.policyAligned !== b.policyAligned) {
          return a.policyAligned ? -1 : 1;
        }
        return b.available - a.available;
      });
  }, [availableBySize, preferredBrand, primaryPolicy]);

  return (
    <section className="space-y-6">
      <header className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#1d3148_0%,#0f1b33_45%,#070b14_100%)] p-5 text-white shadow-lg sm:p-7 lg:block">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {t("pos.inventory.headerTitle", "Inventory availability")}
            </p>

            <p className="mt-2 max-w-3xl text-xs text-white/50 sm:text-sm">
              {t(
                "pos.inventory.headerDesc",
                "Check real-time availability of tyres across different brands and categories.",
              )}
            </p>
          </div>
        </div>
      </header>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Boxes size={18} />
            {t("pos.inventory.availabilityCheck", "Tyre availability check")}
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label>{t("pos.inventory.vehicle", "Vehicle")}</Label>
              <SearchableSelect
                onValueChange={setVehicleId}
                options={vehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: `${vehicle.plate || vehicle.id} - ${vehicle.model}`,
                  description: vehicle.type || vehicle.category,
                  meta: vehicle.status,
                }))}
                value={vehicleId || ""}
                placeholder={t("pos.inventory.selectVehicle", "Select vehicle")}
                searchPlaceholder={t("pos.inventory.searchVehicles", "Search vehicles")}
                emptyLabel={t("pos.inventory.noVehicles", "No vehicles")}
                noMatchLabel={t("pos.inventory.noMatchingVehicles", "No matching vehicles")}
                triggerClassName="w-full min-w-0 max-w-full overflow-hidden"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.inventory.tyreSize", "Tyre size")}</Label>
              <Input value={tyreSize} readOnly />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.inventory.preferredBrand", "Preferred brand")}</Label>
              <Input
                onChange={(event) => setPreferredBrand(event.target.value)}
                placeholder={t("pos.inventory.brandExample", "e.g. Michelin")}
                value={preferredBrand}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.inventory.requiredQuantity", "Required quantity")}</Label>
              <Input
                min="1"
                onChange={(event) => setRequestedQty(event.target.value)}
                type="number"
                value={requestedQty}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.inventory.categoryFilter", "Category filter")}</Label>
              <SearchableSelect
                onValueChange={setCategory}
                options={CATEGORY_OPTIONS}
                value={category || ""}
                placeholder={t("pos.inventory.category", "Category")}
                searchPlaceholder={t("pos.inventory.searchCategories", "Search categories")}
                emptyLabel={t("pos.inventory.noCategories", "No categories available")}
                noMatchLabel={t("pos.inventory.noMatchingCategories", "No matching categories")}
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {availabilityResult.status}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {availabilityResult.message}
            </p>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {availableBySize.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                {t("pos.inventory.noStock", "No tyre stock found for selected size/category.")}
              </p>
            ) : (
              availableBySize.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {item.brand} {item.size} ({item.category})
                  </p>
                  <p className="text-slate-600">
                    Available: {item.available} | ETA restock: {item.etaDays}{" "}
                    day(s) | Unit: {formatCurrency(item.unitPrice)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CircleAlert size={18} />
              {t("pos.inventory.alternatives", "Suggested alternative tyres")}
            </h2>
            <div className="card-list-scrollbar mt-4 max-h-[18rem] space-y-2 overflow-y-auto pr-1">
              {alternativeTyres.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  {t("pos.inventory.noAlternatives", "No alternatives found for current tyre size.")}
                </p>
              ) : (
                alternativeTyres.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {item.brand} ({item.category})
                      </p>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.policyAligned
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.policyAligned
                          ? t("pos.inventory.policyAligned", "Policy aligned")
                          : t("pos.inventory.needsApproval", "Needs approval")}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Available: {item.available} | ETA: {item.etaDays} day(s) |
                      Unit: {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CheckCircle2 size={18} />
              {t(
                "pos.inventory.integrationStatus",
                "Manufacturer integration status",
              )}
            </h2>
            <div className="card-list-scrollbar mt-4 max-h-[20rem] space-y-2 overflow-y-auto pr-1">
              {manufacturerIntegrationStatus.map((entry) => (
                <div
                  key={entry.manufacturer}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      {entry.manufacturer}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${integrationBadgeClass(entry.status)}`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">{entry.syncHealth}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("pos.inventory.lastSync", "Last sync")}:{" "}
                    {new Date(entry.lastSync).toLocaleString("en-US")} |{" "}
                    {entry.responseMs > 0
                      ? t("pos.inventory.latency", "Latency {{value}}ms", {
                          value: entry.responseMs,
                        })
                      : t("pos.inventory.apiUnavailable", "API unavailable")}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs text-slate-600">
              <p className="inline-flex items-center gap-1">
                <Link2Off size={14} />
                {t(
                  "pos.inventory.offlineFallback",
                  "Offline manufacturer catalogs fallback to cached prices and stock.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

export default POSInventoryAvailabilityControl;
