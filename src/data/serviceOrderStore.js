const STORAGE_KEY = "oxifleet:service-orders";

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};

const createOrderId = () =>
  `SR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const toIsoString = (value) => {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const normalizeLifecycleEntry = (entry) => ({
  stage: String(entry?.stage || "Pending review").trim() || "Pending review",
  time: toIsoString(entry?.time),
  actor: String(entry?.actor || "System").trim() || "System",
  note: String(entry?.note || "").trim(),
});

const normalizeOrder = (order = {}) => {
  const emergency = Boolean(order.emergency);
  const status = String(order.status || "Pending").trim() || "Pending";
  const lifecycle = Array.isArray(order.lifecycle)
    ? order.lifecycle.map(normalizeLifecycleEntry)
    : [
        {
          stage: "Requested",
          time: toIsoString(order.requestedAt),
          actor: order.requestedBy || "Dispatcher",
          note: "Service request submitted.",
        },
      ];

  return {
    id: String(order.id || createOrderId()).trim(),
    vehicleId: String(order.vehicleId || "N/A").trim(),
    vehicleModel: String(order.vehicleModel || "Unknown vehicle").trim(),
    serviceType: String(order.serviceType || "General service").trim(),
    requestTitle: String(order.requestTitle || "Service request").trim(),
    requestedBy: String(order.requestedBy || "Ops team").trim(),
    requestedAt: toIsoString(order.requestedAt),
    priority: String(order.priority || (emergency ? "Emergency" : "Normal")).trim(),
    status,
    emergency,
    orderDetails: {
      description:
        String(order.orderDetails?.description || "No description provided.").trim(),
      vendor: String(order.orderDetails?.vendor || "Unassigned").trim(),
      estimatedCost: String(order.orderDetails?.estimatedCost || "N/A").trim(),
      location: String(order.orderDetails?.location || "N/A").trim(),
      notes: String(order.orderDetails?.notes || "").trim(),
    },
    approval: {
      decision: String(order.approval?.decision || "").trim(),
      approver: String(order.approval?.approver || "").trim(),
      note: String(order.approval?.note || "").trim(),
      decidedAt: order.approval?.decidedAt ? toIsoString(order.approval.decidedAt) : "",
      manualOverride: Boolean(order.approval?.manualOverride),
    },
    lifecycle: lifecycle.slice(0, 25),
    updatedAt: toIsoString(order.updatedAt),
  };
};

const getDefaultOrders = () => {
  const now = new Date();
  const minusHours = (hours) =>
    new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  return [
    normalizeOrder({
      id: "SR-1001",
      vehicleId: "VH-884",
      vehicleModel: "Freightliner Cascadia",
      serviceType: "Brake service",
      requestTitle: "Front brake pad replacement",
      requestedBy: "Jamie Stewart",
      requestedAt: minusHours(30),
      priority: "High",
      status: "Pending approval",
      emergency: false,
      orderDetails: {
        description: "Brake wear indicator triggered during route check.",
        vendor: "Metro Service Hub",
        estimatedCost: "$1,180",
        location: "Dallas, TX",
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(30),
          actor: "Jamie Stewart",
          note: "Issue reported from pre-trip inspection.",
        },
        {
          stage: "Under review",
          time: minusHours(24),
          actor: "Service Desk",
          note: "Estimate requested from vendor.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-1002",
      vehicleId: "VH-241",
      vehicleModel: "Volvo VNL 760",
      serviceType: "Tyre replacement",
      requestTitle: "Rear axle tyre replacement",
      requestedBy: "Avery Chen",
      requestedAt: minusHours(20),
      priority: "Emergency",
      status: "In progress",
      emergency: true,
      orderDetails: {
        description: "Tyre sidewall tear detected on route.",
        vendor: "Westline Tire Care",
        estimatedCost: "$2,300",
        location: "Austin, TX",
      },
      approval: {
        decision: "Approved",
        approver: "Fleet Manager",
        note: "Approved due to safety-critical failure.",
        decidedAt: minusHours(18),
        manualOverride: false,
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(20),
          actor: "Avery Chen",
          note: "Emergency request submitted.",
        },
        {
          stage: "Approved",
          time: minusHours(18),
          actor: "Fleet Manager",
          note: "Approved as emergency.",
        },
        {
          stage: "In progress",
          time: minusHours(14),
          actor: "Westline Tire Care",
          note: "Tyre replacement started.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-1003",
      vehicleId: "VH-553",
      vehicleModel: "Kenworth T680",
      serviceType: "Engine diagnostics",
      requestTitle: "Check engine light diagnostics",
      requestedBy: "Morgan Patel",
      requestedAt: minusHours(54),
      priority: "Normal",
      status: "Rejected",
      emergency: false,
      orderDetails: {
        description: "Intermittent engine warning light.",
        vendor: "Northern Fleet Works",
        estimatedCost: "$740",
        location: "Houston, TX",
      },
      approval: {
        decision: "Rejected",
        approver: "Operations Lead",
        note: "Reschedule with next planned service window.",
        decidedAt: minusHours(48),
        manualOverride: false,
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(54),
          actor: "Morgan Patel",
          note: "Issue observed during route.",
        },
        {
          stage: "Rejected",
          time: minusHours(48),
          actor: "Operations Lead",
          note: "Deferred to scheduled service window.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-1004",
      vehicleId: "VH-901",
      vehicleModel: "Mack Anthem",
      serviceType: "Towing + roadside support",
      requestTitle: "Roadside breakdown support",
      requestedBy: "Dispatch Control",
      requestedAt: minusHours(8),
      priority: "Emergency",
      status: "Pending approval",
      emergency: true,
      orderDetails: {
        description: "Vehicle stalled on route; requires tow and immediate check.",
        vendor: "RapidTow Services",
        estimatedCost: "$3,200",
        location: "I-35 Northbound",
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(8),
          actor: "Dispatch Control",
          note: "Emergency escalation.",
        },
      ],
    }),
  ];
};

const initializeOrders = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return stored.map(normalizeOrder);
  }
  const defaults = getDefaultOrders();
  writeStorage(defaults);
  return defaults;
};

let state = {
  orders: initializeOrders(),
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateOrderInternal = (orderId, updater) => {
  const targetId = String(orderId || "").trim();
  if (!targetId) {
    return null;
  }

  let updatedOrder = null;
  const nextOrders = state.orders.map((order) => {
    if (order.id !== targetId) {
      return order;
    }
    const nextOrder = normalizeOrder(updater(order));
    updatedOrder = nextOrder;
    return nextOrder;
  });

  if (!updatedOrder) {
    return null;
  }

  state = {
    ...state,
    orders: nextOrders,
  };
  writeStorage(nextOrders);
  emit();
  return updatedOrder;
};

export const getServiceOrderState = () => state;

export const decideServiceRequest = (
  orderId,
  { decision, approver, note, manualOverride = false }
) =>
  updateOrderInternal(orderId, (order) => {
    const approved = decision === "Approved";
    const nextStatus = approved
      ? manualOverride
        ? "Approved (override)"
        : "Approved"
      : "Rejected";

    return {
      ...order,
      status: nextStatus,
      approval: {
        decision,
        approver: String(approver || "Supervisor").trim() || "Supervisor",
        note: String(note || "").trim(),
        decidedAt: new Date().toISOString(),
        manualOverride: Boolean(manualOverride),
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: nextStatus,
          time: new Date().toISOString(),
          actor: String(approver || "Supervisor").trim() || "Supervisor",
          note: String(note || "").trim(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  });

export const setOrderLifecycleStage = (orderId, { stage, actor, note }) =>
  updateOrderInternal(orderId, (order) => ({
    ...order,
    status: String(stage || order.status).trim() || order.status,
    lifecycle: [
      ...order.lifecycle,
      {
        stage: String(stage || "Updated").trim() || "Updated",
        time: new Date().toISOString(),
        actor: String(actor || "Service Desk").trim() || "Service Desk",
        note: String(note || "").trim(),
      },
    ],
    updatedAt: new Date().toISOString(),
  }));

export const subscribeServiceOrders = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
