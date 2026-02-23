const STORAGE_KEY = "oxifleet:communication";

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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

const createMessageId = (prefix = "MSG") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createTicketId = () =>
  `TKT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const normalizeDriverMessage = (message = {}) => ({
  id: String(message.id || createMessageId("DRV")).trim(),
  driverId: String(message.driverId || "").trim(),
  driverName: String(message.driverName || "Unknown driver").trim(),
  channel: String(message.channel || "In-app").trim() || "In-app",
  message: String(message.message || "").trim(),
  sentBy: String(message.sentBy || "Operations Desk").trim() || "Operations Desk",
  sentAt: toIsoString(message.sentAt),
});

const normalizeWorkshopMessage = (message = {}) => ({
  id: String(message.id || createMessageId("WSH")).trim(),
  workshop: String(message.workshop || "Unassigned workshop").trim(),
  channel: String(message.channel || "Email").trim() || "Email",
  urgency: String(message.urgency || "Normal").trim() || "Normal",
  message: String(message.message || "").trim(),
  sentBy: String(message.sentBy || "Service Desk").trim() || "Service Desk",
  sentAt: toIsoString(message.sentAt),
});

const normalizeSupportTicket = (ticket = {}) => ({
  id: String(ticket.id || createTicketId()).trim(),
  subject: String(ticket.subject || "Support ticket").trim() || "Support ticket",
  category: String(ticket.category || "General").trim() || "General",
  priority: String(ticket.priority || "Medium").trim() || "Medium",
  relatedRef: String(ticket.relatedRef || "").trim(),
  description: String(ticket.description || "").trim(),
  createdBy: String(ticket.createdBy || "Operations Desk").trim() || "Operations Desk",
  assignee: String(ticket.assignee || "Support Team").trim() || "Support Team",
  status: String(ticket.status || "Open").trim() || "Open",
  escalationLevel: Number(ticket.escalationLevel) || 0,
  escalationNote: String(ticket.escalationNote || "").trim(),
  createdAt: toIsoString(ticket.createdAt),
  updatedAt: toIsoString(ticket.updatedAt || ticket.createdAt),
});

const minusHours = (hours) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const getDefaultState = () => ({
  driverMessages: [
    normalizeDriverMessage({
      id: "DRV-DEMO-001",
      driverId: "DR-104",
      driverName: "Jamie Stewart",
      channel: "In-app",
      message: "Route rerouted due to weather. Please confirm acknowledgement.",
      sentBy: "Dispatch Control",
      sentAt: minusHours(6),
    }),
  ],
  workshopMessages: [
    normalizeWorkshopMessage({
      id: "WSH-DEMO-001",
      workshop: "Metro Service Hub",
      channel: "Email",
      urgency: "High",
      message: "Please prioritize order SR-1001 and share revised ETA.",
      sentBy: "Service Desk",
      sentAt: minusHours(4),
    }),
  ],
  tickets: [
    normalizeSupportTicket({
      id: "TKT-1001",
      subject: "Driver app cannot upload proof image",
      category: "Driver support",
      priority: "High",
      relatedRef: "DR-104",
      description: "Image upload fails for roadside service confirmation.",
      createdBy: "Dispatch Control",
      assignee: "Product Support",
      status: "Escalated",
      escalationLevel: 1,
      escalationNote: "Escalated to engineering after repeated failures.",
      createdAt: minusHours(14),
      updatedAt: minusHours(3),
    }),
    normalizeSupportTicket({
      id: "TKT-1002",
      subject: "Workshop invoice mismatch",
      category: "Billing",
      priority: "Medium",
      relatedRef: "INV-2051",
      description: "Parts line item differs from approved estimate.",
      createdBy: "Finance Ops",
      assignee: "Billing Desk",
      status: "Open",
      escalationLevel: 0,
      createdAt: minusHours(20),
      updatedAt: minusHours(20),
    }),
  ],
});

const normalizeState = (value = {}) => ({
  driverMessages: Array.isArray(value.driverMessages)
    ? value.driverMessages.map(normalizeDriverMessage)
    : [],
  workshopMessages: Array.isArray(value.workshopMessages)
    ? value.workshopMessages.map(normalizeWorkshopMessage)
    : [],
  tickets: Array.isArray(value.tickets)
    ? value.tickets.map(normalizeSupportTicket)
    : [],
});

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    writeStorage(normalized);
    return normalized;
  }
  const defaults = getDefaultState();
  writeStorage(defaults);
  return defaults;
};

let state = initializeState();

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (nextState) => {
  state = nextState;
  writeStorage(state);
  emit();
};

export const getCommunicationState = () => state;

export const sendDriverMessage = (message) => {
  const nextMessage = normalizeDriverMessage(message);
  setState({
    ...state,
    driverMessages: [nextMessage, ...state.driverMessages].slice(0, 50),
  });
  return nextMessage;
};

export const sendWorkshopMessage = (message) => {
  const nextMessage = normalizeWorkshopMessage(message);
  setState({
    ...state,
    workshopMessages: [nextMessage, ...state.workshopMessages].slice(0, 50),
  });
  return nextMessage;
};

export const createSupportTicket = (ticket) => {
  const nextTicket = normalizeSupportTicket(ticket);
  setState({
    ...state,
    tickets: [nextTicket, ...state.tickets],
  });
  return nextTicket;
};

export const updateSupportTicket = (ticketId, updates = {}) => {
  const targetId = String(ticketId || "").trim();
  if (!targetId) {
    return null;
  }
  let updatedTicket = null;
  const nextTickets = state.tickets.map((ticket) => {
    if (ticket.id !== targetId) {
      return ticket;
    }
    updatedTicket = normalizeSupportTicket({
      ...ticket,
      ...updates,
      id: ticket.id,
      createdAt: ticket.createdAt,
      updatedAt: new Date().toISOString(),
    });
    return updatedTicket;
  });
  if (!updatedTicket) {
    return null;
  }
  setState({
    ...state,
    tickets: nextTickets,
  });
  return updatedTicket;
};

export const escalateSupportTicket = (ticketId, escalationNote = "") => {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    return null;
  }
  const nextLevel = (Number(ticket.escalationLevel) || 0) + 1;
  return updateSupportTicket(ticketId, {
    status: "Escalated",
    escalationLevel: nextLevel,
    escalationNote: String(escalationNote || "").trim(),
  });
};

export const resolveSupportTicket = (ticketId, resolutionNote = "") => {
  return updateSupportTicket(ticketId, {
    status: "Resolved",
    escalationNote: String(resolutionNote || "").trim(),
  });
};

export const reopenSupportTicket = (ticketId) => {
  return updateSupportTicket(ticketId, {
    status: "Open",
  });
};

export const subscribeCommunication = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
