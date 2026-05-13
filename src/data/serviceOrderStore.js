import { updateVehicle } from "./vehicleStore";
import {
  getSeedVehicleSnapshot,
  isLegacySeedVehicleModel,
} from "./seedVehicleCatalog";

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

const toNullableNonNegativeInteger = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).replace(/[^0-9]/g, "");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
};

const normalizeLifecycleEntry = (entry) => ({
  stage: String(entry?.stage || "Pending review").trim() || "Pending review",
  time: toIsoString(entry?.time),
  actor: String(entry?.actor || "System").trim() || "System",
  note: String(entry?.note || "").trim(),
});

const normalizeAttachment = (attachment = {}) => ({
  id: String(attachment?.id || "").trim(),
  name: String(attachment?.name || "Attachment").trim(),
  size: Number.isFinite(Number(attachment?.size))
    ? Number(attachment.size)
    : 0,
  mimeType: String(attachment?.mimeType || "application/octet-stream").trim(),
  uploadedAt: attachment?.uploadedAt ? toIsoString(attachment.uploadedAt) : "",
  dataUrl: String(attachment?.dataUrl || "").trim(),
});

const normalizeAppointment = (appointment = {}) => ({
  dateTime: appointment?.dateTime ? toIsoString(appointment.dateTime) : "",
  confirmedBy: String(appointment?.confirmedBy || "").trim(),
  confirmedAt: appointment?.confirmedAt ? toIsoString(appointment.confirmedAt) : "",
  note: String(appointment?.note || "").trim(),
  calendarChecked: Boolean(appointment?.calendarChecked),
  stockChecked: Boolean(appointment?.stockChecked),
  autoApproved: Boolean(appointment?.autoApproved),
});

const normalizeCheckIn = (checkIn = {}) => ({
  checkedInAt: checkIn?.checkedInAt ? toIsoString(checkIn.checkedInAt) : "",
  checkedInBy: String(checkIn?.checkedInBy || "").trim(),
  note: String(checkIn?.note || "").trim(),
  odometerReading: toNullableNonNegativeInteger(checkIn?.odometerReading),
  odometerUnit:
    String(checkIn?.odometerUnit || "km").trim().toLowerCase() === "miles"
      ? "miles"
      : "km",
});

const normalizeSettlement = (settlement = {}) => ({
  readyForSettlement: Boolean(settlement?.readyForSettlement),
  completionConfirmedBy: String(settlement?.completionConfirmedBy || "").trim(),
  completionConfirmedAt: settlement?.completionConfirmedAt
    ? toIsoString(settlement.completionConfirmedAt)
    : "",
  fleetAcknowledgedBy: String(settlement?.fleetAcknowledgedBy || "").trim(),
  fleetAcknowledgedAt: settlement?.fleetAcknowledgedAt
    ? toIsoString(settlement.fleetAcknowledgedAt)
    : "",
  note: String(settlement?.note || "").trim(),
});

const normalizeRecommendation = (recommendation = null) => {
  if (!recommendation || typeof recommendation !== "object") {
    return null;
  }
  const levelRaw = String(recommendation?.level || "")
    .trim()
    .toLowerCase();
  const level =
    levelRaw === "high" || levelRaw === "medium" || levelRaw === "low"
      ? levelRaw
      : "low";
  const title = String(recommendation?.title || "").trim();
  const summary = String(recommendation?.summary || "").trim();
  const suggestion = String(recommendation?.suggestion || "").trim();
  const suggestedCategory = String(recommendation?.suggestedCategory || "").trim();

  if (!title && !summary && !suggestion && !suggestedCategory) {
    return null;
  }

  return {
    level,
    title,
    summary,
    suggestion,
    suggestedCategory,
  };
};

const normalizeOrder = (order = {}) => {
  const emergency = Boolean(order.emergency);
  const status = String(order.status || "Pending").trim() || "Pending";
  const seedVehicle = getSeedVehicleSnapshot(order.vehicleId);
  const nextVehicleModel =
    order.vehicleModel && !isLegacySeedVehicleModel(order.vehicleModel)
      ? String(order.vehicleModel).trim()
      : seedVehicle?.model || String(order.vehicleModel || "").trim();
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
    vehicleModel: nextVehicleModel || "Unknown vehicle",
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
      routeTo:
        String(order.orderDetails?.routeTo || "pos").trim().toLowerCase() ===
        "fleet-only"
          ? "fleet-only"
          : "pos",
      attachments: Array.isArray(order.orderDetails?.attachments)
        ? order.orderDetails.attachments
            .map(normalizeAttachment)
            .filter((item) => Boolean(item.dataUrl))
        : [],
      odometerReading: toNullableNonNegativeInteger(
        order.orderDetails?.odometerReading,
      ),
      odometerUnit:
        String(order.orderDetails?.odometerUnit || "km").trim().toLowerCase() ===
        "miles"
          ? "miles"
          : "km",
      recommendationAccepted: Boolean(
        order.orderDetails?.recommendationAccepted,
      ),
      recommendation: normalizeRecommendation(order.orderDetails?.recommendation),
    },
    approval: {
      decision: String(order.approval?.decision || "").trim(),
      approver: String(order.approval?.approver || "").trim(),
      note: String(order.approval?.note || "").trim(),
      reasonCode: String(order.approval?.reasonCode || "").trim(),
      decidedAt: order.approval?.decidedAt ? toIsoString(order.approval.decidedAt) : "",
      manualOverride: Boolean(order.approval?.manualOverride),
    },
    appointment: normalizeAppointment(order.appointment),
    checkIn: normalizeCheckIn(order.checkIn),
    settlement: normalizeSettlement(order.settlement),
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
    normalizeOrder({
      id: "SR-1005",
      vehicleId: "VH-617",
      vehicleModel: "International LT",
      serviceType: "Transmission diagnostics",
      requestTitle: "Transmission inspection with parts review",
      requestedBy: "Riley Carter",
      requestedAt: minusHours(6),
      priority: "High",
      status: "Pending approval",
      emergency: true,
      orderDetails: {
        description: "Driver reported delayed gear engagement and warning indicator during route.",
        vendor: "Central Powertrain Hub",
        estimatedCost: "$3,480",
        location: "San Antonio, TX",
        notes: "Review required for policy scope and stock readiness before booking.",
        odometerReading: 184920,
        odometerUnit: "km",
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(6),
          actor: "Riley Carter",
          note: "High-cost diagnostics request requires POS review before approval.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-2001",
      vehicleId: "VH-884",
      vehicleModel: "Freightliner Cascadia",
      serviceType: "Brake service",
      requestTitle: "Brake service - POS Order POSO-4001",
      requestedBy: "POS Supervisor",
      requestedAt: minusHours(72),
      priority: "High",
      status: "Approved",
      emergency: false,
      orderDetails: {
        description: "Approval workflow request created from POS dashboard.",
        vendor: "POS Booking Desk",
        estimatedCost: "$1,452",
        location: "Dallas, TX",
        notes: "Approval granted for POS Order POSO-4001",
      },
      approval: {
        decision: "Approved",
        approver: "Fleet Manager",
        note: "Within contract threshold and approved vendor scope.",
        decidedAt: minusHours(68),
        manualOverride: false,
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(72),
          actor: "POS Supervisor",
          note: "Submitted for approval. POS Order POSO-4001",
        },
        {
          stage: "Approved",
          time: minusHours(68),
          actor: "Fleet Manager",
          note: "Approved for execution.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-2002",
      vehicleId: "VH-241",
      vehicleModel: "Volvo VNL 760",
      serviceType: "Tyre replacement",
      requestTitle: "Tyre replacement - POS Order POSO-4002",
      requestedBy: "POS Supervisor",
      requestedAt: minusHours(58),
      priority: "Emergency",
      status: "Rejected",
      emergency: true,
      orderDetails: {
        description: "Emergency tyre replacement review from POS workflow.",
        vendor: "POS Booking Desk",
        estimatedCost: "$1,318",
        location: "Austin, TX",
        notes: "Rejected decision for POS Order POSO-4002",
      },
      approval: {
        decision: "Rejected",
        approver: "Fleet Manager",
        note: "Use policy-compliant tyre brand and resubmit.",
        decidedAt: minusHours(54),
        manualOverride: false,
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(58),
          actor: "POS Supervisor",
          note: "Submitted for emergency approval. POS Order POSO-4002",
        },
        {
          stage: "Rejected",
          time: minusHours(54),
          actor: "Fleet Manager",
          note: "Brand mismatch against policy.",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-2003",
      vehicleId: "VH-553",
      vehicleModel: "Kenworth T680",
      serviceType: "Engine diagnostics",
      requestTitle: "Engine diagnostics - POS Order POSO-4003",
      requestedBy: "POS Advisor",
      requestedAt: minusHours(36),
      priority: "Normal",
      status: "Pending approval",
      emergency: false,
      orderDetails: {
        description: "Pending approval for repeated diagnostics request.",
        vendor: "POS Booking Desk",
        estimatedCost: "$465",
        location: "Houston, TX",
        notes: "Approval pending for POS Order POSO-4003",
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(36),
          actor: "POS Advisor",
          note: "Awaiting manager decision. POS Order POSO-4003",
        },
      ],
    }),
    normalizeOrder({
      id: "SR-2004",
      vehicleId: "VH-884",
      vehicleModel: "Freightliner Cascadia",
      serviceType: "Battery replacement",
      requestTitle: "Battery replacement - POS Order POSO-4005 (Re-submission)",
      requestedBy: "POS Supervisor",
      requestedAt: minusHours(28),
      priority: "High",
      status: "Re-submitted",
      emergency: false,
      orderDetails: {
        description: "Corrected re-submission with updated charging test report.",
        vendor: "POS Booking Desk",
        estimatedCost: "$723",
        location: "Dallas, TX",
        notes: "Re-submitted approval request for POS Order POSO-4005",
      },
      lifecycle: [
        {
          stage: "Requested",
          time: minusHours(34),
          actor: "POS Supervisor",
          note: "Initial submission. POS Order POSO-4005",
        },
        {
          stage: "Re-submitted",
          time: minusHours(28),
          actor: "POS Supervisor",
          note: "Corrected electrical report attached.",
        },
      ],
    }),
  ];
};

const ensureSeedOrders = (existingOrders) => {
  const normalizedExisting = existingOrders.map(normalizeOrder);
  const defaultOrders = getDefaultOrders();
  const existingIds = new Set(
    normalizedExisting.map((order) => String(order?.id || "").trim())
  );
  const missingDefaults = defaultOrders.filter(
    (order) => !existingIds.has(String(order?.id || "").trim())
  );

  if (missingDefaults.length === 0) {
    return normalizedExisting;
  }

  const merged = [...missingDefaults, ...normalizedExisting];
  writeStorage(merged);
  return merged;
};

const initializeOrders = () => {
  const stored = readStorage();
  if (stored.length > 0) {
    return ensureSeedOrders(stored);
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

export const setServiceOrdersFromApi = (orders = []) => {
  const list = Array.isArray(orders) ? orders : [];
  const normalized = list.map(normalizeOrder);
  state = {
    ...state,
    orders: normalized,
  };
  writeStorage(normalized);
  emit();
  return normalized;
};

export const upsertServiceOrderFromApi = (order) => {
  const normalized = normalizeOrder(order || {});
  const index = state.orders.findIndex((entry) => entry.id === normalized.id);
  const nextOrders = [...state.orders];
  if (index >= 0) {
    nextOrders[index] = normalized;
  } else {
    nextOrders.unshift(normalized);
  }
  state = {
    ...state,
    orders: nextOrders,
  };
  writeStorage(nextOrders);
  emit();
  return normalized;
};

export const decideServiceRequest = (
  orderId,
  { decision, approver, note, reasonCode = "", manualOverride = false }
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
        reasonCode: String(reasonCode || "").trim(),
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

export const createServiceRequest = (request = {}) => {
  const nextOrder = normalizeOrder({
    ...request,
    id: request.id || createOrderId(),
    status: request.status || "Pending approval",
    requestedAt: request.requestedAt || new Date().toISOString(),
    lifecycle: [
      {
        stage: "Requested",
        time: request.requestedAt || new Date().toISOString(),
        actor: request.requestedBy || "Driver",
        note:
          request.orderDetails?.description ||
          request.requestTitle ||
          "Service request created from driver portal.",
      },
    ],
    updatedAt: new Date().toISOString(),
  });

  state = {
    ...state,
    orders: [nextOrder, ...state.orders],
  };
  writeStorage(state.orders);
  emit();
  return nextOrder;
};

export const confirmServiceAppointment = (
  orderId,
  {
    appointmentAt,
    actor,
    note,
    calendarChecked = true,
    stockChecked = true,
    autoApproved = false,
  } = {}
) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const appointmentDateTime = appointmentAt ? toIsoString(appointmentAt) : now;
    const confirmedBy = String(actor || "POS Desk").trim() || "POS Desk";
    const checkedCalendar = Boolean(calendarChecked);
    const checkedStock = Boolean(stockChecked);
    const messageParts = [
      `Appointment confirmed for ${new Date(appointmentDateTime).toLocaleString("en-US")}.`,
      checkedCalendar ? "Calendar checked." : "Calendar not confirmed.",
      checkedStock ? "Stock checked." : "Stock not confirmed.",
    ];
    const noteText = String(note || "").trim();
    if (noteText) {
      messageParts.push(noteText);
    }

    return {
      ...order,
      status: "Scheduled",
      appointment: {
        ...order.appointment,
        dateTime: appointmentDateTime,
        confirmedBy,
        confirmedAt: now,
        note: noteText,
        calendarChecked: checkedCalendar,
        stockChecked: checkedStock,
        autoApproved: Boolean(autoApproved),
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Scheduled",
          time: now,
          actor: confirmedBy,
          note: messageParts.join(" "),
        },
      ],
      updatedAt: now,
    };
  });

export const startServiceExecution = (orderId, { actor, note } = {}) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const performedBy = String(actor || "POS Technician").trim() || "POS Technician";
    const noteText = String(note || "").trim();
    return {
      ...order,
      status: "In progress",
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "In progress",
          time: now,
          actor: performedBy,
          note: noteText || "Service execution started at POS.",
        },
      ],
      updatedAt: now,
    };
  });

export const autoApproveServiceRequest = (
  orderId,
  {
    appointmentAt,
    actor,
    note,
    calendarChecked = true,
    stockChecked = true,
  } = {}
) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const confirmedBy = String(actor || "POS Desk").trim() || "POS Desk";
    const appointmentDateTime = appointmentAt ? toIsoString(appointmentAt) : now;
    const noteText =
      String(note || "").trim() ||
      "Shared calendar slot confirmed and booking auto-approved.";

    return {
      ...order,
      status: "Scheduled",
      approval: {
        decision: "Auto-approved",
        approver: confirmedBy,
        note: noteText,
        reasonCode: "",
        decidedAt: now,
        manualOverride: false,
      },
      appointment: {
        ...order.appointment,
        dateTime: appointmentDateTime,
        confirmedBy,
        confirmedAt: now,
        note: noteText,
        calendarChecked: Boolean(calendarChecked),
        stockChecked: Boolean(stockChecked),
        autoApproved: true,
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Auto-approved",
          time: now,
          actor: confirmedBy,
          note: noteText,
        },
        {
          stage: "Scheduled",
          time: now,
          actor: confirmedBy,
          note: `Appointment confirmed for ${new Date(appointmentDateTime).toLocaleString("en-US")}.`,
        },
      ],
      updatedAt: now,
    };
  });

export const rejectServiceRequest = (
  orderId,
  { actor, reasonCode, note } = {}
) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const rejectedBy = String(actor || "POS Desk").trim() || "POS Desk";
    const code = String(reasonCode || "").trim();
    const noteText = String(note || "").trim();
    return {
      ...order,
      status: "Rejected",
      approval: {
        decision: "Rejected",
        approver: rejectedBy,
        note: noteText,
        reasonCode: code,
        decidedAt: now,
        manualOverride: false,
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Rejected",
          time: now,
          actor: rejectedBy,
          note: code ? `${code}${noteText ? `: ${noteText}` : ""}` : noteText,
        },
      ],
      updatedAt: now,
    };
  });

export const checkInServiceVehicle = (
  orderId,
  { actor, odometerReading, odometerUnit = "km", note } = {}
) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const checkedInBy = String(actor || "POS Desk").trim() || "POS Desk";
    const odometer = toNullableNonNegativeInteger(odometerReading);
    const unit =
      String(odometerUnit || "km").trim().toLowerCase() === "miles"
        ? "miles"
        : "km";
    const noteText = String(note || "").trim();

    if (odometer !== null && order.vehicleId) {
      updateVehicle(order.vehicleId, {
        odometerReading: odometer,
        odometerUnit: unit,
      });
    }

    return {
      ...order,
      status: "Checked in",
      checkIn: {
        checkedInAt: now,
        checkedInBy,
        note: noteText,
        odometerReading: odometer,
        odometerUnit: unit,
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Checked in",
          time: now,
          actor: checkedInBy,
          note:
            odometer !== null
              ? `Vehicle checked in at ${odometer.toLocaleString()} ${unit}.${noteText ? ` ${noteText}` : ""}`
              : noteText || "Vehicle checked in at POS.",
        },
      ],
      updatedAt: now,
    };
  });

export const confirmServiceCompletion = (orderId, { actor, note } = {}) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const confirmedBy = String(actor || "POS Manager").trim() || "POS Manager";
    const noteText = String(note || "").trim();
    return {
      ...order,
      status: "Completed",
      settlement: {
        ...order.settlement,
        readyForSettlement: true,
        completionConfirmedBy: confirmedBy,
        completionConfirmedAt: now,
        note: noteText,
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Completed",
          time: now,
          actor: confirmedBy,
          note: noteText || "Service completed and marked ready for settlement.",
        },
      ],
      updatedAt: now,
    };
  });

export const submitInvoiceToFleet = (orderId, { actor, note, invoiceId } = {}) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const submittedBy = String(actor || "POS Manager").trim() || "POS Manager";
    const trimmedInvoiceId = String(invoiceId || "").trim();
    const noteText = String(note || "").trim();
    const defaultNote = trimmedInvoiceId
      ? `Invoice ${trimmedInvoiceId} sent to fleet for completion confirmation.`
      : "Invoice sent to fleet for completion confirmation.";
    return {
      ...order,
      status: "Invoice processing",
      settlement: {
        ...order.settlement,
        readyForSettlement: true,
        completionConfirmedBy: submittedBy,
        completionConfirmedAt: now,
        note: noteText || defaultNote,
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Invoice processing",
          time: now,
          actor: submittedBy,
          note: noteText || defaultNote,
        },
      ],
      updatedAt: now,
    };
  });

export const acknowledgeSettlementByFleet = (orderId, { actor, note } = {}) =>
  updateOrderInternal(orderId, (order) => {
    const now = new Date().toISOString();
    const acknowledgedBy =
      String(actor || "Fleet Manager").trim() || "Fleet Manager";
    const noteText = String(note || "").trim();
    return {
      ...order,
      status: "Completed",
      settlement: {
        ...order.settlement,
        readyForSettlement: false,
        fleetAcknowledgedBy: acknowledgedBy,
        fleetAcknowledgedAt: now,
        note: noteText || order.settlement?.note || "",
      },
      lifecycle: [
        ...order.lifecycle,
        {
          stage: "Completed",
          time: now,
          actor: acknowledgedBy,
          note: noteText || "Fleet manager confirmed invoice and completed service order.",
        },
      ],
      updatedAt: now,
    };
  });

export const subscribeServiceOrders = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

