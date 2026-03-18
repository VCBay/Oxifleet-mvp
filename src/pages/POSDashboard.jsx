import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  ChevronLeft,
  ArrowLeft,
  ChevronRight,
  ChartColumnBig,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings2,
  ShieldAlert,
  X,
  ArrowRight,
} from "lucide-react";
import Logo from "../icons/Logo";
import OxifleetEmblemWhite from "../icons/Oxifleet-Emblem-White.svg";
import { clearSession, getSession, subscribeSession } from "../auth/session";
import { getDriverState, subscribeDrivers } from "../data/driverStore";
import { getVehicleState, subscribeVehicles } from "../data/vehicleStore";
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
import POSTopbar from "../components/pos/POSTopbar";
import { useTranslation } from "../i18n/useTranslation";

const fallbackVehicles = [
  {
    id: "VH-884",
    model: "Freightliner Cascadia",
    plate: "TX-8841",
    type: "Truck",
    tyreSpecs: {
      brand: "Goodyear",
      size: "295/75R22.5",
      frontPsi: 102,
      rearPsi: 98,
    },
  },
  {
    id: "VH-241",
    model: "Volvo VNL 760",
    plate: "TX-2417",
    type: "Truck",
    tyreSpecs: {
      brand: "Michelin",
      size: "11R22.5",
      frontPsi: 100,
      rearPsi: 96,
    },
  },
  {
    id: "VH-553",
    model: "Kenworth T680",
    plate: "TX-5532",
    type: "Truck",
    tyreSpecs: {
      brand: "Bridgestone",
      size: "275/80R22.5",
      frontPsi: 101,
      rearPsi: 97,
    },
  },
];

const posMenuItems = [
  {
    key: "overview",
    labelKey: "pos.menu.overview",
    to: "/pos-dashboard/overview",
    icon: LayoutDashboard,
  },
  {
    key: "order-management",
    labelKey: "pos.menu.order-management",
    to: "/pos-dashboard/order-management",
    icon: ClipboardList,
  },
  {
    key: "validation",
    labelKey: "pos.menu.validation",
    to: "/pos-dashboard/validation",
    icon: ShieldAlert,
  },
  {
    key: "analytics-reports",
    labelKey: "pos.menu.analytics-reports",
    to: "/pos-dashboard/analytics-reports",
    icon: ChartColumnBig,
  },
  {
    key: "approval-workflow",
    labelKey: "pos.menu.approval-workflow",
    to: "/pos-dashboard/approval-workflow",
    icon: FileText,
  },
  {
    key: "billing-settlement",
    labelKey: "pos.menu.billing-settlement",
    to: "/pos-dashboard/billing-settlement",
    icon: BadgeDollarSign,
  },
  {
    key: "inventory-availability",
    labelKey: "pos.menu.inventory-availability",
    to: "/pos-dashboard/inventory-availability",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    key: "communication",
    label: "Communication",
    to: "/pos-dashboard/communication",
    icon: MessageSquare,
  },
  {
    key: "profile-settings",
    labelKey: "pos.menu.profile-settings",
    to: "/pos-dashboard/profile-settings",
    icon: Settings2,
  },
];

const initialPosNotifications = [
  {
    id: "NTF-001",
    titleKey: "pos.notifications.newBookingTitle",
    detailKey: "pos.notifications.newBookingDetail",
    minutesAgo: 2,
  },
  {
    id: "NTF-002",
    titleKey: "pos.notifications.approvalResponsesTitle",
    detailKey: "pos.notifications.approvalResponsesDetail",
    minutesAgo: 8,
  },
  {
    id: "NTF-003",
    titleKey: "pos.notifications.rejectionAlertsTitle",
    detailKey: "pos.notifications.rejectionAlertsDetail",
    minutesAgo: 18,
  },
  {
    id: "NTF-004",
    titleKey: "pos.notifications.paymentProcessedTitle",
    detailKey: "pos.notifications.paymentProcessedDetail",
    minutesAgo: 31,
  },
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

const toTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const monthlyComparisonFallback = [
  { completed: 4, pending: 3, total: 8, estimatedCost: 4600 },
  { completed: 5, pending: 2, total: 8, estimatedCost: 4900 },
  { completed: 6, pending: 3, total: 10, estimatedCost: 5400 },
  { completed: 5, pending: 4, total: 10, estimatedCost: 5200 },
  { completed: 7, pending: 3, total: 11, estimatedCost: 6100 },
  { completed: 8, pending: 2, total: 11, estimatedCost: 6800 },
  { completed: 7, pending: 3, total: 11, estimatedCost: 6400 },
  { completed: 9, pending: 3, total: 13, estimatedCost: 7100 },
  { completed: 8, pending: 4, total: 13, estimatedCost: 7450 },
  { completed: 10, pending: 3, total: 14, estimatedCost: 7920 },
  { completed: 9, pending: 4, total: 14, estimatedCost: 7680 },
  { completed: 11, pending: 3, total: 15, estimatedCost: 8240 },
];

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
  if (
    scope.fleet &&
    fleetName &&
    normalize(scope.fleet) !== normalize(fleetName)
  ) {
    return false;
  }
  return true;
};

function POSDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getSession,
  );
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState,
  );
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState,
  );
  const policyState = useSyncExternalStore(
    subscribeVehiclePolicies,
    getVehiclePolicyState,
    getVehiclePolicyState,
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState,
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState,
  );
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState,
  );
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState,
  );

  const vehicles =
    vehicleState.vehicles.length > 0 ? vehicleState.vehicles : fallbackVehicles;
  const [plateQuery, setPlateQuery] = useState(() => vehicles[0]?.plate || "");
  const [notifications, setNotifications] = useState(initialPosNotifications);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  const matchedVehicles = useMemo(() => {
    const q = normalize(plateQuery);
    if (!q) {
      return vehicles;
    }
    return vehicles.filter((vehicle) =>
      [vehicle.plate, vehicle.id, vehicle.model].some((value) =>
        normalize(value).includes(q),
      ),
    );
  }, [plateQuery, vehicles]);

  const selectedVehicle = useMemo(() => {
    const exact = vehicles.find(
      (vehicle) => normalize(vehicle.plate) === normalize(plateQuery),
    );
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
      driverState.drivers.find(
        (driver) => driver.assignedVehicleId === selectedVehicle.id,
      ) || null
    );
  }, [driverState.drivers, selectedVehicle]);

  const fleetDetails = useMemo(() => {
    if (!assignedDriver) {
      return null;
    }
    const assignment = opsState.tenantAssignments.find(
      (item) => normalize(item.driverName) === normalize(assignedDriver.name),
    );
    if (!assignment) {
      return null;
    }
    const tenant = opsState.tenants.find(
      (item) => item.id === assignment.tenantId,
    );
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
      (policy) => normalize(policy.status) === "active",
    );
    return activePolicies.filter((policy) =>
      policyMatchesVehicle(
        policy,
        selectedVehicle,
        fleetDetails?.tenantName || "",
      ),
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
        const cycleHours = Math.max(
          0,
          (lastLifecycleTime - requestedAt) / (1000 * 60 * 60),
        );
        cycleTotal += cycleHours;
        cycleCount += 1;
        if (cycleHours <= 48) {
          onTimeCount += 1;
        }
      }
    });

    summary.avgCycleHours =
      cycleCount > 0 ? Math.round(cycleTotal / cycleCount) : 0;
    summary.onTimeRate =
      cycleCount > 0 ? Math.round((onTimeCount / cycleCount) * 100) : 0;
    return summary;
  }, [selectedVehicleOrders]);

  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
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

    const hasAnyLiveData = months.some(
      (month) => month.total > 0 || month.estimatedCost > 0,
    );

    return months.map((month, index) => {
      const normalizedLive = {
        ...month,
        estimatedCost: Math.round(month.estimatedCost),
      };
      if (month.total > 0 || month.estimatedCost > 0) {
        return normalizedLive;
      }

      const seed =
        monthlyComparisonFallback[index % monthlyComparisonFallback.length];
      if (!hasAnyLiveData) {
        return {
          ...normalizedLive,
          ...seed,
        };
      }

      // Keep sparse real datasets visually informative by filling empty months with low-volume baseline.
      return {
        ...normalizedLive,
        completed: Math.max(1, Math.round(seed.completed * 0.4)),
        pending: Math.max(1, Math.round(seed.pending * 0.5)),
        total: Math.max(2, Math.round(seed.total * 0.45)),
        estimatedCost: Math.max(1400, Math.round(seed.estimatedCost * 0.38)),
      };
    });
  }, [selectedVehicleOrders]);

  const spareParts = useMemo(() => {
    const vehicleType = selectedVehicle?.type || "Truck";
    return sparePartsCatalog
      .filter(
        (part) =>
          part.compatible.includes(vehicleType) ||
          part.compatible.includes("All"),
      )
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
    const totalAvailable = spareParts.reduce(
      (sum, part) => sum + part.available,
      0,
    );
    const lowStockCount = spareParts.filter(
      (part) => part.stockStatus === "Low stock",
    ).length;
    const outOfStockCount = spareParts.filter(
      (part) => part.stockStatus === "Out of stock",
    ).length;
    const inventoryValue = spareParts.reduce(
      (sum, part) => sum + part.stockValue,
      0,
    );
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
              0,
            ) / submittedOrders,
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
        } else if (
          status.includes("re-submit") ||
          status.includes("resubmit")
        ) {
          acc.resubmitted += 1;
        } else if (status.includes("pending")) {
          acc.pending += 1;
        } else {
          acc.inReview += 1;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, resubmitted: 0, inReview: 0 },
    );

    const serviceLimit = primaryPolicy?.servicePriceLimit ?? null;
    const validationOverLimit = posOrderState.draftOrders.filter(
      (draft) =>
        serviceLimit != null && Number(draft.total || 0) > Number(serviceLimit),
    ).length;
    const validationMissingCore = posOrderState.draftOrders.filter(
      (draft) =>
        !String(draft.vehicleId || "").trim() ||
        !String(draft.serviceType || "").trim(),
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
      { paid: 0, processing: 0, unpaid: 0, settledValue: 0, inFlightValue: 0 },
    );

    const peakMonth =
      [...monthlyComparison].sort((a, b) => b.total - a.total)[0]?.month ||
      "N/A";
    const recent =
      monthlyComparison[monthlyComparison.length - 1]?.estimatedCost || 0;
    const previous =
      monthlyComparison[monthlyComparison.length - 2]?.estimatedCost || 0;
    const trendDirection =
      recent > previous ? "up" : recent < previous ? "down" : "flat";

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

  const isOrderManagementRoute =
    location.pathname.includes("/order-management");
  const isValidationRoute = location.pathname.includes("/validation");
  const isApprovalWorkflowRoute =
    location.pathname.includes("/approval-workflow");
  const isBillingSettlementRoute = location.pathname.includes(
    "/billing-settlement",
  );
  const isInventoryAvailabilityRoute = location.pathname.includes(
    "/inventory-availability",
  );
  const isAnalyticsReportsRoute =
    location.pathname.includes("/analytics-reports");
  const isCommunicationRoute = location.pathname.includes("/communication");
  const isProfileSettingsRoute =
    location.pathname.includes("/profile-settings");
  const isOverviewRoute =
    location.pathname.includes("/overview") ||
    location.pathname === "/pos-dashboard";

  const pageTitle = isOrderManagementRoute
    ? t("pos.menu.order-management", "Order Management")
    : isCommunicationRoute
      ? t("pos.menu.communication", "Communication")
      : isProfileSettingsRoute
        ? t("pos.menu.profile-settings", "Profile & Settings")
        : isAnalyticsReportsRoute
          ? t("pos.menu.analytics-reports", "Analytics & Reports")
          : isInventoryAvailabilityRoute
            ? t("pos.menu.inventory-availability", "Inventory & Availability")
            : isBillingSettlementRoute
              ? t("pos.menu.billing-settlement", "Billing & Settlement")
              : isApprovalWorkflowRoute
                ? t("pos.menu.approval-workflow", "Approval Workflow")
                : isValidationRoute
                  ? t("pos.menu.validation", "Validation")
                  : t("pos.menu.overview", "Dashboard");
  const pageDescription = isOrderManagementRoute
    ? "Create, edit, and submit service orders with draft support."
    : isCommunicationRoute
      ? "Chat with multiple drivers and fleet owners in a single communication workspace."
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

  const clearNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId),
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const approvalLinkedRequests = useMemo(
    () =>
      serviceOrderState.orders
        .map((order) => ({
          ...order,
          posOrderId: extractPosOrderId(order),
        }))
        .filter((order) => order.posOrderId)
        .sort(
          (a, b) =>
            toTimestamp(b.updatedAt || b.requestedAt) -
            toTimestamp(a.updatedAt || a.requestedAt),
        ),
    [serviceOrderState.orders],
  );

  const queueOrders = useMemo(
    () =>
      serviceOrderState.orders
        .filter((order) => {
          const status = normalize(order.status);
          if (
            status.includes("rejected") ||
            status.includes("completed") ||
            status.includes("closed")
          ) {
            return false;
          }
          return (
            status.includes("approved") ||
            status.includes("pending booking") ||
            status.includes("scheduled") ||
            status.includes("progress")
          );
        })
        .sort(
          (a, b) =>
            toTimestamp(b.updatedAt || b.requestedAt) -
            toTimestamp(a.updatedAt || a.requestedAt),
        ),
    [serviceOrderState.orders],
  );

  const actionableNotifications = useMemo(() => {
    const latestQueueOrderId = queueOrders[0]?.id || "";
    const latestApprovalResponse =
      approvalLinkedRequests.find((request) => {
        const status = normalize(request.status);
        return status.includes("approved") || status.includes("rejected");
      }) || null;
    const latestRejectedRequest =
      approvalLinkedRequests.find((request) =>
        normalize(request.status).includes("rejected"),
      ) || null;
    const latestPaidInvoice =
      [...billingState.invoices]
        .filter((invoice) => normalize(invoice.status) === "paid")
        .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date))[0] || null;

    return notifications.map((notification) => {
      const localizedNotification = {
        ...notification,
        title: t(notification.titleKey, notification.title || notification.id),
        detail: t(notification.detailKey, notification.detail || ""),
        time: t("pos.notifications.minutesAgo", "{{count}} min ago", {
          count: notification.minutesAgo,
        }),
      };
      if (notification.id === "NTF-001") {
        return {
          ...localizedNotification,
          actionLabel: t("actions.open", "Open"),
          actionPath: "/pos-dashboard/approval-workflow",
          actionQuery: {
            focus: "queue",
            queueOrderId: latestQueueOrderId,
          },
        };
      }
      if (notification.id === "NTF-002") {
        return {
          ...localizedNotification,
          actionLabel: t("actions.open", "Open"),
          actionPath: "/pos-dashboard/approval-workflow",
          actionQuery: {
            focus: "status",
            requestId: latestApprovalResponse?.id || "",
            posOrderId: latestApprovalResponse?.posOrderId || "",
          },
        };
      }
      if (notification.id === "NTF-003") {
        return {
          ...localizedNotification,
          actionLabel: t("actions.open", "Open"),
          actionPath: "/pos-dashboard/approval-workflow",
          actionQuery: {
            focus: "resubmit",
            requestId: latestRejectedRequest?.id || "",
            posOrderId: latestRejectedRequest?.posOrderId || "",
          },
        };
      }
      if (notification.id === "NTF-004") {
        return {
          ...localizedNotification,
          actionLabel: t("actions.open", "Open"),
          actionPath: "/pos-dashboard/billing-settlement",
          actionQuery: {
            focus: "settlement-history",
            invoiceId: latestPaidInvoice?.id || "",
          },
        };
      }
      return {
        ...localizedNotification,
        actionLabel: notification.actionLabel || t("actions.open", "Open"),
        actionPath: notification.actionPath || "/pos-dashboard/overview",
      };
    });
  }, [
    approvalLinkedRequests,
    billingState.invoices,
    notifications,
    queueOrders,
    t,
  ]);

  const handleNotificationAction = (notification) => {
    const actionPath = notification?.actionPath || "/pos-dashboard/overview";
    const params = new URLSearchParams();
    Object.entries(notification?.actionQuery || {}).forEach(([key, value]) => {
      if (value == null || value === "") {
        return;
      }
      params.set(key, String(value));
    });
    const query = params.toString();
    navigate(query ? `${actionPath}?${query}` : actionPath);
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <main className="pos-dashboard-theme h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf2f7_100%)]">
      <div className="flex h-full w-full min-w-0">
        <div
          className={`fixed inset-0 z-40 bg-slate-900/45 transition-opacity duration-300 ease-in-out lg:hidden ${
            isMobileSidebarOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <button
            aria-label="Close menu backdrop"
            className="h-full w-full"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
        </div>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            isDesktopSidebarCollapsed
              ? "lg:w-24 lg:transition-[width] lg:duration-300 lg:ease-in-out"
              : "lg:w-72 lg:transition-[width] lg:duration-300 lg:ease-in-out"
          } lg:translate-x-0`}
        >
          <div
            className={`flex h-full flex-col bg-[#0D0F16] text-white shadow-xl ${
              isDesktopSidebarCollapsed ? "p-3 lg:p-3" : "p-6"
            }`}
          >
            <button
              aria-label="Close menu"
              className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full bg-white/10 text-white lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <button
              aria-label={
                isDesktopSidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              className="absolute -right-3 top-3 z-[65] hidden size-6 place-items-center rounded-full border border-[#cec6df] bg-[#ddd6ea] text-[#3b276d] shadow-sm transition hover:bg-[#d1c7e4] lg:grid"
              onClick={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
              type="button"
            >
              {isDesktopSidebarCollapsed ? (
                <ArrowRight size={14} />
              ) : (
                <ArrowLeft size={14} />
              )}
            </button>

            <div className="sidebar-scrollbar min-h-0 flex-1 space-y-8 overflow-y-auto pr-1">
              <div className="flex items-center gap-3">
                <div
                  className={`${isDesktopSidebarCollapsed ? "lg:hidden" : ""}`}
                >
                  <Logo className="w-48 text-white" />
                </div>
                <div
                  className={`hidden rounded-2xl border-white/10 bg-white/5 p-2 shadow-inner ${
                    isDesktopSidebarCollapsed ? "lg:block" : ""
                  }`}
                >
                  <img
                    alt="Oxifleet emblem"
                    className="h-8 w-8 object-contain"
                    src={OxifleetEmblemWhite}
                  />
                </div>
              </div>

              <nav className="space-y-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] text-white/40 ${
                    isDesktopSidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {t("common.menu", "Menu")}
                </p>
                {posMenuItems.map((item) => {
                  const Icon = item.icon;
                  const label = t(item.labelKey, item.key);
                  return (
                    <NavLink
                      key={item.key}
                      className={({ isActive }) =>
                        `flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          isDesktopSidebarCollapsed
                            ? "lg:justify-center lg:gap-0 lg:px-0 lg:py-2.5"
                            : ""
                        } ${
                          isActive
                            ? isDesktopSidebarCollapsed
                              ? "border-[#5f47a8] bg-[#2A1656] text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                              : "border-[#5f47a8] bg-[#2A1656] text-white shadow-sm"
                            : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                        }`
                      }
                      title={isDesktopSidebarCollapsed ? label : undefined}
                      to={item.to}
                      onClick={() => setIsMobileSidebarOpen(false)}
                    >
                      <Icon size={16} />
                      <span
                        className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                      >
                        {label}
                      </span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="mt-auto space-y-2">
              {/* <Button
                className={`w-full ${isDesktopSidebarCollapsed ? "lg:justify-center lg:px-0" : "justify-start"}`}
                onClick={onSignOut}
                title={
                  isDesktopSidebarCollapsed
                    ? t("actions.signOut", "Sign out")
                    : undefined
                }
                type="button"
                // variant="secondary"
              >
                <LogOut className={isDesktopSidebarCollapsed ? "" : "mr-2"} size={16} />
                <span className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>
                  {t("actions.signOut", "Sign out")}
                </span>
              </Button> */}

              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white ${
                  isDesktopSidebarCollapsed
                    ? "lg:justify-center lg:gap-0 lg:px-0"
                    : ""
                }`}
                onClick={onSignOut}
                title={
                  isDesktopSidebarCollapsed
                    ? t("actions.signOut", "Sign out")
                    : undefined
                }
                type="button"
              >
                <LogOut size={18} />
                <span className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>
                  {t("actions.signOut", "Sign out")}
                </span>
              </button>
            </div>
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0 sm:px-6 sm:pb-6 ${
            isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
          } lg:px-8 lg:pb-8`}
        >
          <div className="-mx-4 top-0 z-40 sm:-mx-6 lg:-mx-8">
            <POSTopbar
              displayEmail={session?.email || "N/A"}
              displayName={session?.name || "POS User"}
              isSidebarCollapsed={isDesktopSidebarCollapsed}
              notifications={actionableNotifications}
              onClearAllNotifications={clearAllNotifications}
              onClearNotification={clearNotification}
              onNotificationAction={handleNotificationAction}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              onToggleSidebarCollapse={() =>
                setIsDesktopSidebarCollapsed((prev) => !prev)
              }
              pageTitle={pageTitle}
              profileInitials={(session?.name || "POS")
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || "")
                .join("")}
            />
          </div>

          {/* {isOverviewRoute ? (
            <header className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
            </header>
          ) : null} */}

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
