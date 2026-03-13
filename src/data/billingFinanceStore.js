const STORAGE_KEY = "oxifleet:billing-finance";

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

const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const toIsoDate = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeServiceLine = (line) => ({
  name: String(line?.name || "Service").trim() || "Service",
  cost: toNumber(line?.cost),
});

const normalizeInvoice = (invoice = {}) => {
  const services = Array.isArray(invoice.services)
    ? invoice.services.map(normalizeServiceLine)
    : [];

  const totalAmount =
    invoice.totalAmount !== undefined
      ? toNumber(invoice.totalAmount)
      : services.reduce((sum, line) => sum + line.cost, 0);

  return {
    id: String(invoice.id || createId("INV")).trim(),
    orderId: String(invoice.orderId || "N/A").trim(),
    vehicleId: String(invoice.vehicleId || "N/A").trim(),
    vehicleModel: String(invoice.vehicleModel || "Unknown vehicle").trim(),
    driverName: String(invoice.driverName || "Unassigned").trim(),
    location: String(invoice.location || "N/A").trim(),
    date: toIsoDate(invoice.date),
    status: String(invoice.status || "Processing").trim() || "Processing",
    totalAmount,
    services: services.length > 0 ? services : [normalizeServiceLine({})],
  };
};

const normalizeCreditNote = (note = {}) => ({
  id: String(note.id || createId("CRN")).trim(),
  invoiceId: String(note.invoiceId || "N/A").trim(),
  reason: String(note.reason || "Adjustment").trim(),
  amount: toNumber(note.amount),
  status: String(note.status || "Issued").trim() || "Issued",
  date: toIsoDate(note.date),
});

const normalizePaymentMethod = (method = {}) => ({
  id: String(method.id || createId("PMT")).trim(),
  type: String(method.type || "Card").trim(),
  label: String(method.label || "Payment method").trim(),
  holderName: String(method.holderName || "").trim(),
  last4: String(method.last4 || "").trim(),
  isDefault: Boolean(method.isDefault),
  active: method.active !== false,
});

const normalizeBillingProfile = (profile = {}) => ({
  companyName: String(profile.companyName || "Oxifleet Logistics").trim(),
  addressLine1: String(profile.addressLine1 || "").trim(),
  addressLine2: String(profile.addressLine2 || "").trim(),
  city: String(profile.city || "").trim(),
  state: String(profile.state || "").trim(),
  postalCode: String(profile.postalCode || "").trim(),
  country: String(profile.country || "").trim(),
  taxId: String(profile.taxId || "").trim(),
  vatNumber: String(profile.vatNumber || "").trim(),
  billingEmail: String(profile.billingEmail || "").trim(),
});

const getDefaultState = () => ({
  invoices: [
    normalizeInvoice({
      id: "INV-3001",
      orderId: "SR-1001",
      vehicleId: "VH-884",
      vehicleModel: "Freightliner Cascadia",
      driverName: "Jamie Stewart",
      location: "Dallas, TX",
      date: "2026-02-18",
      status: "Paid",
      services: [
        { name: "Brake pad replacement", cost: 820 },
        { name: "Labor", cost: 300 },
        { name: "Diagnostics", cost: 60 },
      ],
    }),
    normalizeInvoice({
      id: "INV-3002",
      orderId: "SR-1002",
      vehicleId: "VH-241",
      vehicleModel: "Volvo VNL 760",
      driverName: "Avery Chen",
      location: "Austin, TX",
      date: "2026-02-19",
      status: "Processing",
      services: [
        { name: "Rear tyre replacement", cost: 1850 },
        { name: "Roadside labor", cost: 320 },
      ],
    }),
    normalizeInvoice({
      id: "INV-3003",
      orderId: "SR-1004",
      vehicleId: "VH-901",
      vehicleModel: "Mack Anthem",
      driverName: "Dispatch Control",
      location: "I-35 Northbound",
      date: "2026-02-20",
      status: "Unpaid",
      services: [
        { name: "Emergency towing", cost: 2100 },
        { name: "On-site inspection", cost: 440 },
      ],
    }),
  ],
  creditNotes: [
    normalizeCreditNote({
      id: "CRN-1201",
      invoiceId: "INV-3002",
      reason: "Vendor labor discount correction",
      amount: 120,
      status: "Issued",
      date: "2026-02-20",
    }),
    normalizeCreditNote({
      id: "CRN-1202",
      invoiceId: "INV-3001",
      reason: "Parts return adjustment",
      amount: 75,
      status: "Applied",
      date: "2026-02-21",
    }),
  ],
  paymentMethods: [
    normalizePaymentMethod({
      id: "PMT-9001",
      type: "Card",
      label: "Corporate Visa",
      holderName: "Oxifleet Logistics",
      last4: "4242",
      isDefault: true,
      active: true,
    }),
    normalizePaymentMethod({
      id: "PMT-9002",
      type: "Bank transfer",
      label: "Primary Bank Account",
      holderName: "Oxifleet Logistics",
      last4: "8721",
      isDefault: false,
      active: true,
    }),
  ],
  billingProfile: normalizeBillingProfile({
    companyName: "Oxifleet Logistics LLC",
    addressLine1: "2108 Elm Street",
    addressLine2: "Suite 420",
    city: "Dallas",
    state: "TX",
    postalCode: "75201",
    country: "USA",
    taxId: "TX-ELN-88217",
    vatNumber: "US-VA-440190",
    billingEmail: "billing@oxifleet.com",
  }),
});

const mergeById = (existing = [], seeded = []) => {
  const seen = new Set(existing.map((item) => String(item?.id || "").trim()));
  const missingSeeded = seeded.filter(
    (item) => !seen.has(String(item?.id || "").trim())
  );
  return [...missingSeeded, ...existing];
};

const normalizeState = (value = {}) => ({
  invoices: Array.isArray(value.invoices)
    ? value.invoices.map(normalizeInvoice)
    : getDefaultState().invoices,
  creditNotes: Array.isArray(value.creditNotes)
    ? value.creditNotes.map(normalizeCreditNote)
    : getDefaultState().creditNotes,
  paymentMethods: (() => {
    const methods = Array.isArray(value.paymentMethods)
      ? value.paymentMethods.map(normalizePaymentMethod)
      : getDefaultState().paymentMethods;
    const hasDefault = methods.some((method) => method.isDefault);
    if (hasDefault || methods.length === 0) {
      return methods;
    }
    return methods.map((method, index) => ({
      ...method,
      isDefault: index === 0,
    }));
  })(),
  billingProfile: normalizeBillingProfile(
    value.billingProfile || getDefaultState().billingProfile
  ),
});

const ensureSeedState = (value = {}) => {
  const normalized = normalizeState(value);
  const defaults = normalizeState(getDefaultState());
  return normalizeState({
    ...normalized,
    invoices: mergeById(normalized.invoices, defaults.invoices),
    creditNotes: mergeById(normalized.creditNotes, defaults.creditNotes),
    paymentMethods: mergeById(normalized.paymentMethods, defaults.paymentMethods),
  });
};

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = ensureSeedState(stored);
    writeStorage(normalized);
    return normalized;
  }
  const defaults = ensureSeedState(getDefaultState());
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

export const getBillingFinanceState = () => state;

export const addPaymentMethod = (method) => {
  const nextMethod = normalizePaymentMethod(method);
  const nextMethods = state.paymentMethods;
  const shouldDefault = nextMethod.isDefault || nextMethods.length === 0;
  const normalizedMethods = shouldDefault
    ? [...nextMethods.map((item) => ({ ...item, isDefault: false })), { ...nextMethod, isDefault: true }]
    : [...nextMethods, { ...nextMethod, isDefault: false }];

  updateState({
    ...state,
    paymentMethods: normalizedMethods,
  });
  return nextMethod;
};

export const removePaymentMethod = (methodId) => {
  const targetId = String(methodId || "").trim();
  const remaining = state.paymentMethods.filter((method) => method.id !== targetId);
  if (remaining.length === state.paymentMethods.length) {
    return false;
  }
  const normalizedRemaining =
    remaining.length > 0 && !remaining.some((method) => method.isDefault)
      ? remaining.map((method, index) => ({ ...method, isDefault: index === 0 }))
      : remaining;

  updateState({
    ...state,
    paymentMethods: normalizedRemaining,
  });
  return true;
};

export const setDefaultPaymentMethod = (methodId) => {
  const targetId = String(methodId || "").trim();
  const exists = state.paymentMethods.some((method) => method.id === targetId);
  if (!exists) {
    return false;
  }
  const nextMethods = state.paymentMethods.map((method) => ({
    ...method,
    isDefault: method.id === targetId,
  }));

  updateState({
    ...state,
    paymentMethods: nextMethods,
  });
  return true;
};

export const updateBillingProfile = (profile) => {
  updateState({
    ...state,
    billingProfile: {
      ...state.billingProfile,
      ...profile,
    },
  });
  return state.billingProfile;
};

export const setInvoiceStatus = (invoiceId, status) => {
  const targetId = String(invoiceId || "").trim();
  const nextStatus = String(status || "").trim();
  if (!targetId || !nextStatus) {
    return null;
  }
  let updatedInvoice = null;
  const nextInvoices = state.invoices.map((invoice) => {
    if (invoice.id !== targetId) {
      return invoice;
    }
    updatedInvoice = {
      ...invoice,
      status: nextStatus,
    };
    return updatedInvoice;
  });
  if (!updatedInvoice) {
    return null;
  }
  updateState({
    ...state,
    invoices: nextInvoices,
  });
  return updatedInvoice;
};

export const addInvoice = (invoice) => {
  const nextInvoice = normalizeInvoice({
    ...invoice,
    id: invoice?.id || createId("INV"),
    date: invoice?.date || new Date().toISOString(),
    status: invoice?.status || "Processing",
  });

  updateState({
    ...state,
    invoices: [nextInvoice, ...state.invoices],
  });
  return nextInvoice;
};

export const subscribeBillingFinance = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
