import { useMemo, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Bell,
  ChartColumnBig,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";
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
import { getPosOrderState, subscribePosOrders } from "../data/posOrderStore";
import {
  getBillingFinanceState,
  subscribeBillingFinance,
} from "../data/billingFinanceStore";

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
  {
    key: "validation",
    label: "Validation",
    to: "/pos-dashboard/validation",
    icon: ShieldAlert,
  },
    {
    key: "analytics-reports",
    label: "Analytics & Reports",
    to: "/pos-dashboard/analytics-reports",
    icon: ChartColumnBig,
  },
  {
    key: "approval-workflow",
    label: "Approval Workflow",
    to: "/pos-dashboard/approval-workflow",
    icon: FileText,
  },
  {
    key: "billing-settlement",
    label: "Billing & Settlement",
    to: "/pos-dashboard/billing-settlement",
    icon: BadgeDollarSign,
  },
  {
    key: "inventory-availability",
    label: "Inventory & Availability",
    to: "/pos-dashboard/inventory-availability",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    key: "profile-settings",
    label: "Profile & Settings",
    to: "/pos-dashboard/profile-settings",
    icon: Settings2,
  },
];

const initialPosNotifications = [
  {
    id: "NTF-001",
    title: "New booking received",
    detail: "A new service booking is waiting in order queue.",
    time: "2 min ago",
  },
  {
    id: "NTF-002",
    title: "Approval responses",
    detail: "Fleet manager responded to recent approval requests.",
    time: "8 min ago",
  },
  {
    id: "NTF-003",
    title: "Rejection alerts",
    detail: "One request was rejected and needs correction.",
    time: "18 min ago",
  },
  {
    id: "NTF-004",
    title: "Payment processed alerts",
    detail: "A settlement payment has been processed successfully.",
    time: "31 min ago",
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

const extractPosOrderId = (serviceOrder) => {
  const title = String(serviceOrder?.requestTitle || "");
  const notes = String(serviceOrder?.orderDetails?.notes || "");
  const match = `${title} ${notes}`.match(/POS\s+Order\s+([A-Z0-9-]+)/i);
  return match ? String(match[1]).trim() : "";
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
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState
  );
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState
  );

  const vehicles =
    vehicleState.vehicles.length > 0 ? vehicleState.vehicles : fallbackVehicles;
  const [plateQuery, setPlateQuery] = useState(() => vehicles[0]?.plate || "");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(initialPosNotifications);

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

  const operationDetails = useMemo(() => {
    const draftOrders = posOrderState.draftOrders.length;
    const submittedOrders = posOrderState.submittedOrders.length;
    const averageSubmittedValue =
      submittedOrders > 0
        ? Math.round(
            posOrderState.submittedOrders.reduce(
              (sum, order) => sum + Number(order.total || 0),
              0
            ) / submittedOrders
          )
        : 0;

    const approvalLinked = serviceOrderState.orders
      .map((order) => ({
        ...order,
        posOrderId: extractPosOrderId(order),
      }))
      .filter((order) => order.posOrderId);
    const approvalSummary = approvalLinked.reduce(
      (acc, order) => {
        const status = normalize(order.status);
        if (status.includes("rejected")) {
          acc.rejected += 1;
        } else if (status.includes("approved")) {
          acc.approved += 1;
        } else if (status.includes("re-submit") || status.includes("resubmit")) {
          acc.resubmitted += 1;
        } else if (status.includes("pending")) {
          acc.pending += 1;
        } else {
          acc.inReview += 1;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, resubmitted: 0, inReview: 0 }
    );

    const serviceLimit = primaryPolicy?.servicePriceLimit ?? null;
    const validationOverLimit = posOrderState.draftOrders.filter(
      (draft) => serviceLimit != null && Number(draft.total || 0) > Number(serviceLimit)
    ).length;
    const validationMissingCore = posOrderState.draftOrders.filter(
      (draft) => !String(draft.vehicleId || "").trim() || !String(draft.serviceType || "").trim()
    ).length;

    const invoices = billingState.invoices;
    const billingSummary = invoices.reduce(
      (acc, invoice) => {
        const status = normalize(invoice.status);
        if (status === "paid") {
          acc.paid += 1;
          acc.settledValue += Number(invoice.totalAmount || 0);
        } else if (status === "processing") {
          acc.processing += 1;
          acc.inFlightValue += Number(invoice.totalAmount || 0);
        } else if (status === "unpaid") {
          acc.unpaid += 1;
          acc.inFlightValue += Number(invoice.totalAmount || 0);
        }
        return acc;
      },
      { paid: 0, processing: 0, unpaid: 0, settledValue: 0, inFlightValue: 0 }
    );

    const peakMonth = [...monthlyComparison]
      .sort((a, b) => b.total - a.total)[0]?.month || "N/A";
    const recent = monthlyComparison[monthlyComparison.length - 1]?.estimatedCost || 0;
    const previous = monthlyComparison[monthlyComparison.length - 2]?.estimatedCost || 0;
    const trendDirection = recent > previous ? "up" : recent < previous ? "down" : "flat";

    return {
      orderManagement: {
        drafts: draftOrders,
        submitted: submittedOrders,
        averageValue: averageSubmittedValue,
      },
      validation: {
        policyMapped: Boolean(primaryPolicy),
        overLimitDrafts: validationOverLimit,
        missingRequired: validationMissingCore,
      },
      approval: {
        total: approvalLinked.length,
        ...approvalSummary,
      },
      billing: {
        invoices: invoices.length,
        paid: billingSummary.paid,
        processing: billingSummary.processing,
        unpaid: billingSummary.unpaid,
        settledValue: Math.round(billingSummary.settledValue),
        inFlightValue: Math.round(billingSummary.inFlightValue),
        creditNotes: billingState.creditNotes.length,
      },
      inventory: {
        availableUnits: spareSummary.totalAvailable,
        lowStock: spareSummary.lowStockCount,
        outOfStock: spareSummary.outOfStockCount,
        inventoryValue: spareSummary.inventoryValue,
      },
      analytics: {
        peakMonth,
        onTimeRate: requestSummary.onTimeRate,
        avgCycleHours: requestSummary.avgCycleHours,
        trendDirection,
      },
      profile: {
        user: session?.name || "POS User",
        hasPolicy: Boolean(primaryPolicy),
        activeNotifications: notifications.length,
      },
    };
  }, [
    billingState.creditNotes.length,
    billingState.invoices,
    monthlyComparison,
    notifications.length,
    posOrderState.draftOrders,
    posOrderState.submittedOrders,
    primaryPolicy,
    requestSummary.avgCycleHours,
    requestSummary.onTimeRate,
    serviceOrderState.orders,
    session?.name,
    spareSummary.inventoryValue,
    spareSummary.lowStockCount,
    spareSummary.outOfStockCount,
    spareSummary.totalAvailable,
  ]);

  const isOrderManagementRoute = location.pathname.includes("/order-management");
  const isValidationRoute = location.pathname.includes("/validation");
  const isApprovalWorkflowRoute = location.pathname.includes("/approval-workflow");
  const isBillingSettlementRoute = location.pathname.includes("/billing-settlement");
  const isInventoryAvailabilityRoute = location.pathname.includes("/inventory-availability");
  const isAnalyticsReportsRoute = location.pathname.includes("/analytics-reports");
  const isProfileSettingsRoute = location.pathname.includes("/profile-settings");

  const pageTitle = isOrderManagementRoute
    ? "POS Order Management"
    : isProfileSettingsRoute
    ? "POS Profile & Settings"
    : isAnalyticsReportsRoute
    ? "POS Analytics & Reports"
    : isInventoryAvailabilityRoute
    ? "POS Inventory & Availability"
    : isBillingSettlementRoute
    ? "POS Billing & Settlement"
    : isApprovalWorkflowRoute
    ? "POS Approval Workflow"
    : isValidationRoute
    ? "POS Validation"
    : "POS Dashboard";
  const pageDescription = isOrderManagementRoute
    ? "Create, edit, and submit service orders with draft support."
    : isProfileSettingsRoute
    ? "Manage workshop profile, staff, working hours, and POS location configuration."
    : isAnalyticsReportsRoute
    ? "Track orders, revenue, rejection patterns, fleet performance, and top serviced vehicles."
    : isInventoryAvailabilityRoute
    ? "Check tyre stock, view alternatives, and monitor manufacturer integration sync status."
    : isBillingSettlementRoute
    ? "Track submitted/validated/rejected orders, credit memos, payment schedules, and settlements."
    : isApprovalWorkflowRoute
    ? "Send requests, track approval status, review history, and re-submit corrected orders."
    : isValidationRoute
    ? "Validate policy compliance, KB pricing, approval flow, and submission alerts."
    : "Search by vehicle plate and validate service and contract controls.";

  const onSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  const clearNotification = (notificationId) => () => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                Menu
              </p>
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
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    aria-expanded={showNotifications}
                    aria-label="Toggle notifications"
                    className="relative grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    type="button"
                  >
                    <Bell size={18} />
                    {notifications.length > 0 ? (
                      <span className="absolute right-1.5 top-1.5 min-w-[1rem] rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                        {notifications.length}
                      </span>
                    ) : null}
                  </button>
                  {showNotifications ? (
                    <div className="absolute right-0 top-12 z-20 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        <button
                          className="text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={notifications.length === 0}
                          onClick={clearAllNotifications}
                          type="button"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar]:w-1.5">
                        {notifications.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                            No new notifications.
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {notification.title}
                                </p>
                                <button
                                  aria-label={`Clear ${notification.title}`}
                                  className="rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-slate-800"
                                  onClick={clearNotification(notification.id)}
                                  type="button"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {notification.detail}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {notification.time}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
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
                    <p className="text-sm font-semibold text-slate-900">
                      {session?.name || "POS User"}
                    </p>
                    <p className="text-xs text-slate-500">{session?.email || "N/A"}</p>
                  </div>
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
              operationDetails,
              vehicles,
            }}
          />
        </section>
      </div>
    </main>
  );
}

export default POSDashboard;
