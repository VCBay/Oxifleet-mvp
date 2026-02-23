const STORAGE_KEY = "oxifleet:settings-profile";

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

const toIsoDate = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const toIsoDateTime = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const createTicketId = () =>
  `SUP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const parseRecipients = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
};

const normalizeCompanyProfile = (profile = {}) => ({
  companyName: String(profile.companyName || "Oxifleet Logistics LLC").trim(),
  legalName: String(profile.legalName || "Oxifleet Logistics LLC").trim(),
  registrationNumber: String(profile.registrationNumber || "REG-OF-44912").trim(),
  taxId: String(profile.taxId || "US-TX-99127").trim(),
  website: String(profile.website || "https://oxifleet.com").trim(),
  contactEmail: String(profile.contactEmail || "ops@oxifleet.com")
    .trim()
    .toLowerCase(),
  supportEmail: String(profile.supportEmail || "support@oxifleet.com")
    .trim()
    .toLowerCase(),
  contactPhone: String(profile.contactPhone || "+1 (214) 555-0129").trim(),
  headquartersAddress: String(
    profile.headquartersAddress ||
      "2108 Elm Street, Suite 420, Dallas, TX 75201, USA"
  ).trim(),
});

const normalizeContractDetails = (contract = {}) => ({
  agreementId: String(contract.agreementId || "CON-2026-MASTER-01").trim(),
  contractType: String(contract.contractType || "Enterprise Fleet").trim(),
  startDate: toIsoDate(contract.startDate || "2026-01-01"),
  endDate: toIsoDate(contract.endDate || "2026-12-31"),
  renewalType: String(contract.renewalType || "Auto-renew").trim(),
  slaTier: String(contract.slaTier || "Premium").trim(),
  paymentTerms: String(contract.paymentTerms || "Net 30").trim(),
  status: String(contract.status || "Active").trim(),
  notes: String(
    contract.notes ||
      "Includes emergency roadside support and quarterly account review."
  ).trim(),
});

const normalizeIntegrationSettings = (integration = {}) => ({
  telematicsProvider: String(integration.telematicsProvider || "Samsara").trim(),
  erpSystem: String(integration.erpSystem || "SAP S/4HANA").trim(),
  accountingSystem: String(integration.accountingSystem || "QuickBooks Online").trim(),
  apiKeyMasked: String(integration.apiKeyMasked || "****-****-8K2A").trim(),
  webhookUrl: String(
    integration.webhookUrl || "https://api.oxifleet.com/webhooks/fleet-events"
  ).trim(),
  syncEnabled: integration.syncEnabled !== false,
  autoInvoiceSync: integration.autoInvoiceSync !== false,
  autoDriverSync: integration.autoDriverSync !== false,
  lastSyncAt: toIsoDateTime(integration.lastSyncAt || Date.now()),
});

const normalizeNotificationPreferences = (preferences = {}) => ({
  emailAlerts: preferences.emailAlerts !== false,
  smsAlerts: Boolean(preferences.smsAlerts),
  pushAlerts: preferences.pushAlerts !== false,
  criticalIncidentsOnly: Boolean(preferences.criticalIncidentsOnly),
  weeklySummary: preferences.weeklySummary !== false,
  monthlyComplianceDigest: preferences.monthlyComplianceDigest !== false,
  recipients: parseRecipients(
    preferences.recipients || ["ops@oxifleet.com", "fleet.manager@oxifleet.com"]
  ),
});

const normalizeSupportTicket = (ticket = {}) => ({
  id: String(ticket.id || createTicketId()).trim(),
  subject: String(ticket.subject || "Support request").trim(),
  category: String(ticket.category || "General").trim(),
  priority: String(ticket.priority || "Medium").trim(),
  status: String(ticket.status || "Open").trim(),
  message: String(ticket.message || "").trim(),
  createdBy: String(ticket.createdBy || "Ops Control").trim(),
  createdAt: toIsoDateTime(ticket.createdAt),
  updatedAt: toIsoDateTime(ticket.updatedAt || ticket.createdAt),
});

const getDefaultState = () => ({
  companyProfile: normalizeCompanyProfile(),
  contractDetails: normalizeContractDetails(),
  integrationSettings: normalizeIntegrationSettings(),
  notificationPreferences: normalizeNotificationPreferences(),
  helpSupport: {
    supportEmail: "support@oxifleet.com",
    supportPhone: "+1 (800) 555-0194",
    knowledgeBaseUrl: "https://help.oxifleet.com",
    ticketChannels: ["Portal", "Email", "Phone"],
    tickets: [
      normalizeSupportTicket({
        id: "SUP-1001",
        subject: "Webhook retries delayed",
        category: "Integration",
        priority: "High",
        status: "In Progress",
        message: "Webhook deliveries delayed for invoice events after midnight sync.",
        createdBy: "Ava Carter",
        createdAt: "2026-02-20T14:10:00.000Z",
        updatedAt: "2026-02-21T07:45:00.000Z",
      }),
      normalizeSupportTicket({
        id: "SUP-1002",
        subject: "Need report export guidance",
        category: "Help",
        priority: "Low",
        status: "Resolved",
        message: "Requested steps for monthly accounting export schedule.",
        createdBy: "Mia Flores",
        createdAt: "2026-02-18T11:20:00.000Z",
        updatedAt: "2026-02-18T16:02:00.000Z",
      }),
    ],
  },
});

const normalizeState = (value = {}) => {
  const defaults = getDefaultState();
  return {
    companyProfile: normalizeCompanyProfile(
      value.companyProfile || defaults.companyProfile
    ),
    contractDetails: normalizeContractDetails(
      value.contractDetails || defaults.contractDetails
    ),
    integrationSettings: normalizeIntegrationSettings(
      value.integrationSettings || defaults.integrationSettings
    ),
    notificationPreferences: normalizeNotificationPreferences(
      value.notificationPreferences || defaults.notificationPreferences
    ),
    helpSupport: {
      supportEmail: String(
        value.helpSupport?.supportEmail || defaults.helpSupport.supportEmail
      )
        .trim()
        .toLowerCase(),
      supportPhone: String(
        value.helpSupport?.supportPhone || defaults.helpSupport.supportPhone
      ).trim(),
      knowledgeBaseUrl: String(
        value.helpSupport?.knowledgeBaseUrl || defaults.helpSupport.knowledgeBaseUrl
      ).trim(),
      ticketChannels: Array.isArray(value.helpSupport?.ticketChannels)
        ? value.helpSupport.ticketChannels
            .map((item) => String(item || "").trim())
            .filter((item) => item.length > 0)
        : defaults.helpSupport.ticketChannels,
      tickets: Array.isArray(value.helpSupport?.tickets)
        ? value.helpSupport.tickets.map(normalizeSupportTicket)
        : defaults.helpSupport.tickets,
    },
  };
};

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    writeStorage(normalized);
    return normalized;
  }
  const defaults = normalizeState(getDefaultState());
  writeStorage(defaults);
  return defaults;
};

let state = initializeState();

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateState = (nextState) => {
  state = normalizeState(nextState);
  writeStorage(state);
  emit();
};

export const getSettingsProfileState = () => state;

export const updateCompanyProfile = (updates = {}) => {
  updateState({
    ...state,
    companyProfile: {
      ...state.companyProfile,
      ...updates,
    },
  });
  return state.companyProfile;
};

export const updateContractDetails = (updates = {}) => {
  updateState({
    ...state,
    contractDetails: {
      ...state.contractDetails,
      ...updates,
    },
  });
  return state.contractDetails;
};

export const updateIntegrationSettings = (updates = {}) => {
  updateState({
    ...state,
    integrationSettings: {
      ...state.integrationSettings,
      ...updates,
      lastSyncAt: toIsoDateTime(Date.now()),
    },
  });
  return state.integrationSettings;
};

export const updateNotificationPreferences = (updates = {}) => {
  updateState({
    ...state,
    notificationPreferences: {
      ...state.notificationPreferences,
      ...updates,
    },
  });
  return state.notificationPreferences;
};

export const createSupportRequest = (ticket = {}) => {
  const nextTicket = normalizeSupportTicket(ticket);
  updateState({
    ...state,
    helpSupport: {
      ...state.helpSupport,
      tickets: [nextTicket, ...state.helpSupport.tickets].slice(0, 60),
    },
  });
  return nextTicket;
};

export const setSupportRequestStatus = (ticketId, status) => {
  const targetId = String(ticketId || "").trim();
  if (!targetId) {
    return null;
  }
  let updated = null;
  const nextTickets = state.helpSupport.tickets.map((ticket) => {
    if (ticket.id !== targetId) {
      return ticket;
    }
    updated = normalizeSupportTicket({
      ...ticket,
      status: String(status || ticket.status).trim(),
      updatedAt: toIsoDateTime(Date.now()),
    });
    return updated;
  });
  if (!updated) {
    return null;
  }
  updateState({
    ...state,
    helpSupport: {
      ...state.helpSupport,
      tickets: nextTickets,
    },
  });
  return updated;
};

export const subscribeSettingsProfile = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
