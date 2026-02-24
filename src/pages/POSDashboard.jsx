import { useMemo, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import Logo from "../icons/Logo";
import {
  clearSession,
  getSession,
  subscribeSession,
} from "../auth/session";
import { Button } from "../components/ui/button";
import {
  getDriverState,
  subscribeDrivers,
} from "../data/driverStore";
import {
  getVehicleState,
  subscribeVehicles,
} from "../data/vehicleStore";
import {
  getVehiclePolicyState,
  subscribeVehiclePolicies,
} from "../data/vehiclePolicyStore";
import {
  getDriverOperationsState,
  subscribeDriverOperations,
} from "../data/driverOperationsStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

const fallbackVehicles = [
  {
    id: "VH-884",
    model: "Freightliner Cascadia",
    plate: "TX-8841",
    type: "Truck",
    tyreSpecs: { brand: "Goodyear", size: "295/75R22.5", frontPsi: 102, rearPsi: 98 },
  },
  {
    id: "VH-241",
    model: "Volvo VNL 760",
    plate: "TX-2417",
    type: "Truck",
    tyreSpecs: { brand: "Michelin", size: "11R22.5", frontPsi: 100, rearPsi: 96 },
  },
  {
    id: "VH-553",
    model: "Kenworth T680",
    plate: "TX-5532",
    type: "Truck",
    tyreSpecs: { brand: "Bridgestone", size: "275/80R22.5", frontPsi: 101, rearPsi: 97 },
  },
];

const posMenuItems = [
  {
    key: "overview",
    label: "Dashboard",
    to: "/pos-dashboard/overview",
    icon: LayoutDashboard,
  },
  {
    key: "order-management",
    label: "Order Management",
    to: "/pos-dashboard/order-management",
    icon: ClipboardList,
  },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const parseAmount = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const sparePartsCatalog = [
  {
    id: "SP-001",
    part: "Brake Pad Set",
    compatible: ["Truck", "Van"],
    onHand: 42,
    reserved: 11,
    reorderPoint: 18,
    etaDays: 3,
    unitCost: 110,
  },
  {
    id: "SP-002",
    part: "Tyre 295/75R22.5",
    compatible: ["Truck"],
    onHand: 24,
    reserved: 17,
    reorderPoint: 16,
    etaDays: 5,
    unitCost: 420,
  },
  {
    id: "SP-003",
    part: "Oil Filter",
    compatible: ["Truck", "Van", "Trailer"],
    onHand: 66,
    reserved: 18,
    reorderPoint: 22,
    etaDays: 2,
    unitCost: 28,
  },
  {
    id: "SP-004",
    part: "Battery 24V",
    compatible: ["Truck", "Van"],
    onHand: 10,
    reserved: 8,
    reorderPoint: 8,
    etaDays: 6,
    unitCost: 240,
  },
  {
    id: "SP-005",
    part: "Headlight Assembly",
    compatible: ["Truck", "Van"],
    onHand: 8,
    reserved: 7,
    reorderPoint: 6,
    etaDays: 7,
    unitCost: 130,
  },
  {
    id: "SP-006",
    part: "Air Filter",
    compatible: ["Truck", "Van"],
    onHand: 38,
    reserved: 9,
    reorderPoint: 12,
    etaDays: 3,
    unitCost: 34,
  },
];

const getLatestPolicies = (policies) => {
  const map = new Map();
  policies.forEach((policy) => {
    const existing = map.get(policy.policyCode);
    if (!existing || Number(policy.version) > Number(existing.version)) {
      map.set(policy.policyCode, policy);
    }
  });
  return Array.from(map.values());
};

const policyMatchesVehicle = (policy, vehicle, fleetName) => {
  const scope = policy.appliesTo || {};
  if (scope.vehicleId && scope.vehicleId !== vehicle.id) {
    return false;
  }
  if (scope.vehicleClass && scope.vehicleClass !== vehicle.type) {
    return false;
  }
  if (scope.fleet && fleetName && normalize(scope.fleet) !== normalize(fleetName)) {
    return false;
  }
  return true;
};

function POSDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState
  );
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );

  const vehicles =
    vehicleState.vehicles.length > 0 ? vehicleState.vehicles : fallbackVehicles;
  const [plateQuery, setPlateQuery] = useState(() => vehicles[0]?.plate || "");

  const matchedVehicles = useMemo(() => {
    const q = normalize(plateQuery);
    if (!q) {
      return vehicles;
    }
    return vehicles.filter((vehicle) =>
      [vehicle.plate, vehicle.id, vehicle.model].some((value) =>
        normalize(value).includes(q)
      )
    );
  }, [plateQuery, vehicles]);

  const selectedVehicle = useMemo(() => {
    const exact = vehicles.find((vehicle) => normalize(vehicle.plate) === normalize(plateQuery));
    if (exact) {
      return exact;
    }
    return matchedVehicles[0] || vehicles[0] || null;
  }, [matchedVehicles, plateQuery, vehicles]);

  const assignedDriver = useMemo(() => {
    if (!selectedVehicle) {
      return null;
    }
    return (
      driverState.drivers.find((driver) => driver.assignedVehicleId === selectedVehicle.id) || null
    );
  }, [driverState.drivers, selectedVehicle]);

  const fleetDetails = useMemo(() => {
    if (!assignedDriver) {
      return null;
    }
    const assignment = opsState.tenantAssignments.find(
      (item) => normalize(item.driverName) === normalize(assignedDriver.name)
    );
    if (!assignment) {
      return null;
    }
    const tenant = opsState.tenants.find((item) => item.id === assignment.tenantId);
    return tenant
      ? {
          tenantName: tenant.name,
          region: tenant.region,
          supportHotline: tenant.supportHotline,
          workshopLead: tenant.workshopLead,
          homeBase: assignment.homeBase,
        }
      : null;
  }, [assignedDriver, opsState.tenantAssignments, opsState.tenants]);

  const matchedPolicies = useMemo(() => {
    if (!selectedVehicle) {
      return [];
    }
    const activePolicies = getLatestPolicies(policyState.policies).filter(
      (policy) => normalize(policy.status) === "active"
    );
    return activePolicies.filter((policy) =>
      policyMatchesVehicle(policy, selectedVehicle, fleetDetails?.tenantName || "")
    );
  }, [fleetDetails?.tenantName, policyState.policies, selectedVehicle]);

  const primaryPolicy = matchedPolicies[0] || null;

  const selectedVehicleOrders = useMemo(() => {
    if (!selectedVehicle) {
      return [];
    }
    return serviceOrderState.orders
      .filter((order) => order.vehicleId === selectedVehicle.id)
      .sort((a, b) => {
        const timeA = new Date(a.requestedAt).getTime() || 0;
        const timeB = new Date(b.requestedAt).getTime() || 0;
        return timeB - timeA;
      });
  }, [selectedVehicle, serviceOrderState.orders]);

  const requestSummary = useMemo(() => {
    const summary = {
      total: selectedVehicleOrders.length,
      completed: 0,
      pending: 0,
      inProgress: 0,
      rejected: 0,
      approvalRequired: 0,
      avgCycleHours: 0,
      onTimeRate: 0,
      estimatedCostTotal: 0,
    };
    if (selectedVehicleOrders.length === 0) {
      return summary;
    }

    let cycleTotal = 0;
    let cycleCount = 0;
    let onTimeCount = 0;

    selectedVehicleOrders.forEach((order) => {
      const status = normalize(order.status);
      const estimated = parseAmount(order.orderDetails?.estimatedCost);
      summary.estimatedCostTotal += estimated;

      if (status.includes("pending")) {
        summary.pending += 1;
      }
      if (status.includes("completed") || status.includes("closed")) {
        summary.completed += 1;
      } else if (
        status.includes("progress") ||
        status.includes("approved") ||
        status.includes("workshop")
      ) {
        summary.inProgress += 1;
      } else if (status.includes("rejected")) {
        summary.rejected += 1;
      }

      if (status.includes("pending approval") || status.includes("approval")) {
        summary.approvalRequired += 1;
      }

      const requestedAt = new Date(order.requestedAt).getTime();
      const lastLifecycleTime = Array.isArray(order.lifecycle)
        ? order.lifecycle.reduce((latest, entry) => {
            const t = new Date(entry.time).getTime();
            return Number.isFinite(t) ? Math.max(latest, t) : latest;
          }, requestedAt)
        : requestedAt;
      if (Number.isFinite(requestedAt) && Number.isFinite(lastLifecycleTime)) {
        const cycleHours = Math.max(0, (lastLifecycleTime - requestedAt) / (1000 * 60 * 60));
        cycleTotal += cycleHours;
        cycleCount += 1;
        if (cycleHours <= 48) {
          onTimeCount += 1;
        }
      }
    });

    summary.avgCycleHours = cycleCount > 0 ? Math.round(cycleTotal / cycleCount) : 0;
    summary.onTimeRate = cycleCount > 0 ? Math.round((onTimeCount / cycleCount) * 100) : 0;
    return summary;
  }, [selectedVehicleOrders]);

  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        month: d.toLocaleDateString("en-US", { month: "short" }),
        completed: 0,
        pending: 0,
        total: 0,
        estimatedCost: 0,
      };
    });
    const map = new Map(months.map((item) => [item.key, item]));

    selectedVehicleOrders.forEach((order) => {
      const key = monthKey(order.requestedAt);
      const row = key ? map.get(key) : null;
      if (!row) {
        return;
      }
      row.total += 1;
      row.estimatedCost += parseAmount(order.orderDetails?.estimatedCost);
      const status = normalize(order.status);
      if (status.includes("completed") || status.includes("closed")) {
        row.completed += 1;
      }
      if (status.includes("pending")) {
        row.pending += 1;
      }
    });

    return months.map((month) => ({
      ...month,
      estimatedCost: Math.round(month.estimatedCost),
    }));
  }, [selectedVehicleOrders]);

  const spareParts = useMemo(() => {
    const vehicleType = selectedVehicle?.type || "Truck";
    return sparePartsCatalog
      .filter((part) => part.compatible.includes(vehicleType) || part.compatible.includes("All"))
      .map((part) => {
        const available = Math.max(0, part.onHand - part.reserved);
        const status =
          available === 0
            ? "Out of stock"
            : available <= part.reorderPoint
            ? "Low stock"
            : "In stock";
        return {
          ...part,
          available,
          stockStatus: status,
          stockValue: available * part.unitCost,
        };
      })
      .sort((a, b) => a.available - b.available);
  }, [selectedVehicle?.type]);

  const spareSummary = useMemo(() => {
    const totalAvailable = spareParts.reduce((sum, part) => sum + part.available, 0);
    const lowStockCount = spareParts.filter((part) => part.stockStatus === "Low stock").length;
    const outOfStockCount = spareParts.filter((part) => part.stockStatus === "Out of stock").length;
    const inventoryValue = spareParts.reduce((sum, part) => sum + part.stockValue, 0);
    return {
      totalAvailable,
      lowStockCount,
      outOfStockCount,
      inventoryValue: Math.round(inventoryValue),
    };
  }, [spareParts]);

  const isOrderManagementRoute = location.pathname.includes("/order-management");

  const onSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full">
        <aside className="fixed inset-y-0 left-0 w-72">
          <div className="flex h-full flex-col bg-[#0D0F16] p-6 text-white shadow-xl">
            <div className="space-y-5">
              <Logo className="w-48 text-white" />
            </div>

            <nav className="mt-8 space-y-2">
              {posMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                    }
                    to={item.to}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2">
              <Button
                className="w-full justify-start"
                onClick={onSignOut}
                type="button"
                variant="secondary"
              >
                <LogOut className="mr-2" size={16} />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <section className="ml-72 flex-1 space-y-6 overflow-y-auto p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {isOrderManagementRoute ? "POS Order Management" : "POS Dashboard"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {isOrderManagementRoute
                    ? "Create, edit, and submit service orders with draft support."
                    : "Search by vehicle plate and validate service and contract controls."}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <div className="grid size-9 place-items-center rounded-full bg-[#0D0F16] text-xs font-semibold text-white">
                  {(session?.name || "POS")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() || "")
                    .join("")}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-900">{session?.name || "POS User"}</p>
                  <p className="text-xs text-slate-500">{session?.email || "N/A"}</p>
                </div>
              </div>
            </div>
          </header>

          <Outlet
            context={{
              assignedDriver,
              fleetDetails,
              matchedVehicles,
              monthlyComparison,
              plateQuery,
              primaryPolicy,
              requestSummary,
              selectedVehicle,
              session,
              setPlateQuery,
              spareParts,
              spareSummary,
              vehicles,
            }}
          />
        </section>
      </div>
    </main>
  );
}

export default POSDashboard;
