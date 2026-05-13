import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SearchableSelect } from "./ui/searchable-select";
import { Textarea } from "./ui/textarea";
import { useTranslation } from "../i18n/useTranslation";
import {
  deletePosOrderDraft,
  duplicateSubmittedPosOrder,
  getPosOrderState,
  savePosOrderDraft,
  submitPosOrder,
  subscribePosOrders,
} from "../data/posOrderStore";
import {
  createServiceRequest,
  getServiceOrderState,
  submitInvoiceToFleet,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import { addInvoice } from "../data/billingFinanceStore";

const createLineId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EURO_CURRENCY_FORMATTER = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatEuro = (value) =>
  EURO_CURRENCY_FORMATTER.format(normalizeNumber(value));

const createAttachmentId = () =>
  `ATT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeAttachmentMeta = (file) => ({
  name: file.name,
  size: file.size,
  type: file.type || "application/octet-stream",
});

const isImageAttachment = (type) =>
  String(type || "")
    .toLowerCase()
    .startsWith("image/");

const toPreviewFromMeta = (meta) => ({
  id: createAttachmentId(),
  name: meta.name,
  size: meta.size,
  type: meta.type || "application/octet-stream",
  isImage: isImageAttachment(meta.type),
  url: "",
});

const toPreviewFromFile = (file) => {
  const meta = normalizeAttachmentMeta(file);
  const isImage = isImageAttachment(meta.type);
  return {
    id: createAttachmentId(),
    ...meta,
    isImage,
    url: isImage ? URL.createObjectURL(file) : "",
  };
};

const toMetaFromPreview = (preview) => ({
  name: preview.name,
  size: preview.size,
  type: preview.type || "application/octet-stream",
});

const revokeAttachmentPreviewUrls = (items = []) => {
  items.forEach((item) => {
    if (typeof item?.url === "string" && item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  });
};

const formatAttachmentSize = (size) =>
  `${Math.max(1, Math.round(Number(size || 0) / 1024))} KB`;

const ORDER_STEPS = [
  { key: "basic", label: "Basic details" },
  { key: "tyres", label: "Tyre data" },
  { key: "services", label: "Services" },
  { key: "summary", label: "Order summary" },
];

const VAT_RATE = 0.19;

const TYRE_CATALOG = [
  {
    id: "TY-001",
    code: "GY-29575-22A",
    manufacturer: "Goodyear",
    material: "Rubber compound A",
    seasonality: "All-season",
    size: "295/75R22.5",
    unitPrice: 420,
  },
  {
    id: "TY-002",
    code: "GY-29575-22H",
    manufacturer: "Goodyear",
    material: "Long-haul radial",
    seasonality: "Highway",
    size: "295/75R22.5",
    unitPrice: 432,
  },
  {
    id: "TY-003",
    code: "GY-29575-22W",
    manufacturer: "Goodyear",
    material: "Winter silica blend",
    seasonality: "Winter",
    size: "295/75R22.5",
    unitPrice: 448,
  },
  {
    id: "TY-004",
    code: "MI-29575-22W",
    manufacturer: "Michelin",
    material: "Silica blend",
    seasonality: "Winter",
    size: "295/75R22.5",
    unitPrice: 458,
  },
  {
    id: "TY-004S",
    code: "MI-29575-22S",
    manufacturer: "Michelin",
    material: "Summer road compound",
    seasonality: "Summer",
    size: "295/75R22.5",
    unitPrice: 452,
  },
  {
    id: "TY-005",
    code: "MI-29575-22A",
    manufacturer: "Michelin",
    material: "Fuel saver compound",
    seasonality: "All-season",
    size: "295/75R22.5",
    unitPrice: 446,
  },
  {
    id: "TY-006",
    code: "MI-11R22-H",
    manufacturer: "Michelin",
    material: "Heavy-duty radial",
    seasonality: "Highway",
    size: "11R22.5",
    unitPrice: 462,
  },
  {
    id: "TY-007",
    code: "BR-11R22-H",
    manufacturer: "Bridgestone",
    material: "Heavy-duty radial",
    seasonality: "Highway",
    size: "11R22.5",
    unitPrice: 445,
  },
  {
    id: "TY-008",
    code: "BR-11R22-A",
    manufacturer: "Bridgestone",
    material: "Durability compound",
    seasonality: "All-season",
    size: "11R22.5",
    unitPrice: 438,
  },
  {
    id: "TY-009",
    code: "BR-27580-H",
    manufacturer: "Bridgestone",
    material: "Long-mileage radial",
    seasonality: "Highway",
    size: "275/80R22.5",
    unitPrice: 408,
  },
  {
    id: "TY-010",
    code: "PI-27580-A",
    manufacturer: "Pirelli",
    material: "Reinforced radial",
    seasonality: "All-season",
    size: "275/80R22.5",
    unitPrice: 410,
  },
  {
    id: "TY-011",
    code: "PI-27580-W",
    manufacturer: "Pirelli",
    material: "Cold-weather compound",
    seasonality: "Winter",
    size: "275/80R22.5",
    unitPrice: 424,
  },
  {
    id: "TY-011S",
    code: "PI-27580-S",
    manufacturer: "Pirelli",
    material: "Summer performance compound",
    seasonality: "Summer",
    size: "275/80R22.5",
    unitPrice: 418,
  },
  {
    id: "TY-012",
    code: "PI-29575-H",
    manufacturer: "Pirelli",
    material: "Mileage compound",
    seasonality: "Highway",
    size: "295/75R22.5",
    unitPrice: 436,
  },
  {
    id: "TY-013",
    code: "CO-31580-H",
    manufacturer: "Continental",
    material: "Long-haul radial",
    seasonality: "Highway",
    size: "315/80R22.5",
    unitPrice: 470,
  },
  {
    id: "TY-014",
    code: "CO-31580-A",
    manufacturer: "Continental",
    material: "All-road compound",
    seasonality: "All-season",
    size: "315/80R22.5",
    unitPrice: 462,
  },
  {
    id: "TY-015",
    code: "CO-11R22-W",
    manufacturer: "Continental",
    material: "Winter traction compound",
    seasonality: "Winter",
    size: "11R22.5",
    unitPrice: 456,
  },
  {
    id: "TY-015S",
    code: "CO-11R22-S",
    manufacturer: "Continental",
    material: "Summer touring compound",
    seasonality: "Summer",
    size: "11R22.5",
    unitPrice: 448,
  },
  {
    id: "TY-016",
    code: "GY-11R22-A",
    manufacturer: "Goodyear",
    material: "Reinforced radial",
    seasonality: "All-season",
    size: "11R22.5",
    unitPrice: 434,
  },
  {
    id: "TY-017",
    code: "MI-27580-A",
    manufacturer: "Michelin",
    material: "Regional compound",
    seasonality: "All-season",
    size: "275/80R22.5",
    unitPrice: 418,
  },
  {
    id: "TY-018",
    code: "BR-31580-H",
    manufacturer: "Bridgestone",
    material: "Long-haul casing",
    seasonality: "Highway",
    size: "315/80R22.5",
    unitPrice: 466,
  },
];

const SERVICE_CATALOG = [
  {
    id: "SRV-001",
    name: "Tyre fitting",
    category: "Tyres",
    unitPrice: 65,
    favorite: true,
  },
  {
    id: "SRV-002",
    name: "Wheel balancing",
    category: "Tyres",
    unitPrice: 45,
    favorite: true,
  },
  {
    id: "SRV-003",
    name: "Wheel alignment",
    category: "Tyres",
    unitPrice: 85,
    favorite: false,
  },
  {
    id: "SRV-004",
    name: "Brake inspection",
    category: "Inspection",
    unitPrice: 72,
    favorite: false,
  },
  {
    id: "SRV-005",
    name: "Diagnostics",
    category: "Inspection",
    unitPrice: 96,
    favorite: false,
  },
  {
    id: "SRV-006",
    name: "Oil and filter service",
    category: "Service",
    unitPrice: 130,
    favorite: false,
  },
  {
    id: "SRV-007",
    name: "Pressure adjustment",
    category: "Tyres",
    unitPrice: 18,
    favorite: false,
  },
];

const TYRE_ACTION_OPTIONS = [
  "Inspect",
  "Replace",
  "Rotate",
  "Repair puncture",
  "Balance",
  "Align",
  "Pressure adjustment",
  "No action",
];

const TYRE_REASON_OPTIONS = [
  "Tread wear",
  "Sidewall damage",
  "Puncture",
  "Uneven wear",
  "Seasonal change",
  "Age / cracking",
  "Driver requested check",
];

const getVehicleTyrePositions = () => {
  return [
    "Front left",
    "Front right",
    "Rear left",
    "Rear right",
  ];
};

const translateTyrePosition = (t, position) => {
  if (position === "Front left") {
    return t("pos.order.tyrePositions.frontLeft", "Front left");
  }
  if (position === "Front right") {
    return t("pos.order.tyrePositions.frontRight", "Front right");
  }
  if (position === "Rear left") {
    return t("pos.order.tyrePositions.rearLeft", "Rear left");
  }
  if (position === "Rear right") {
    return t("pos.order.tyrePositions.rearRight", "Rear right");
  }
  return position;
};

const createServiceLine = (service = {}) => ({
  id: String(service.id || createLineId("SRV")).trim(),
  name: String(service.name || "Service").trim(),
  category: String(service.category || "Service").trim(),
  count: Math.max(1, normalizeNumber(service.count || 1)),
  unitPrice: Math.max(0, normalizeNumber(service.unitPrice || 0)),
  favorite: Boolean(service.favorite),
  selected: Boolean(service.selected),
});

const createTyreSelection = (position) => ({
  position,
  action: "Inspect",
  reason: "",
  selectedTyreId: "",
  selectedTyreLabel: "",
  tyreCode: "",
  manufacturer: "",
  material: "",
  seasonality: "",
  unitPrice: 0,
});

const createInitialForm = (selectedVehicle) => ({
  id: "",
  requestId: "",
  srCode: "",
  fleetName: "",
  driverName: "",
  driverLicense: "",
  vehicleId: selectedVehicle?.id || "",
  vehiclePlate: selectedVehicle?.plate || "",
  checkInDateTime: "",
  driverOdometerReading: 0,
  driverOdometerUnit: "km",
  verifiedOdometerReading: 0,
  verifiedOdometerUnit: "km",
  serviceType: "General service",
  problemType: "General check",
  description: "",
  priority: "Normal",
  parts: [],
  labour: [],
  tyreSelections:
    getVehicleTyrePositions(selectedVehicle).map(createTyreSelection),
  serviceLines: SERVICE_CATALOG.map(createServiceLine),
  attachments: [],
  notes: "",
  vatRate: VAT_RATE,
  vatAmount: 0,
  subtotal: 0,
  total: 0,
});

const applyRequestServices = (serviceType) => {
  const normalizedType = String(serviceType || "")
    .trim()
    .toLowerCase();
  return SERVICE_CATALOG.map((service) => ({
    ...createServiceLine(service),
    selected:
      normalizedType.length > 0 &&
      (normalizedType.includes(service.name.toLowerCase()) ||
        service.name.toLowerCase().includes(normalizedType) ||
        (normalizedType.includes("tyre") && service.category === "Tyres")),
  }));
};

const buildWizardPricing = (orderForm) => {
  const tyreTotal = (orderForm.tyreSelections || []).reduce((sum, item) => {
    if (!item.selectedTyreId) {
      return sum;
    }
    return sum + normalizeNumber(item.unitPrice);
  }, 0);
  const serviceTotal = (orderForm.serviceLines || []).reduce((sum, item) => {
    if (!item.selected) {
      return sum;
    }
    return sum + normalizeNumber(item.count) * normalizeNumber(item.unitPrice);
  }, 0);
  const subtotal = Math.round(tyreTotal + serviceTotal);
  const vatAmount = Math.round(subtotal * VAT_RATE);
  return {
    tyreTotal: Math.round(tyreTotal),
    serviceTotal: Math.round(serviceTotal),
    subtotal,
    vatAmount,
    total: Math.round(subtotal + vatAmount),
  };
};

const buildOrderPayload = (orderForm) => {
  const tyreParts = (orderForm.tyreSelections || [])
    .filter((item) => item.selectedTyreId)
    .map((item) => ({
      id: createLineId("PART"),
      name: `${item.position}: ${item.selectedTyreLabel}`,
      qty: 1,
      unitCost: normalizeNumber(item.unitPrice),
    }));

  const serviceLabour = (orderForm.serviceLines || [])
    .filter((item) => item.selected)
    .map((item) => ({
      id: createLineId("LAB"),
      name: item.name,
      hours: Math.max(1, normalizeNumber(item.count)),
      rate: normalizeNumber(item.unitPrice),
    }));

  const pricing = buildWizardPricing(orderForm);

  return {
    ...orderForm,
    parts: tyreParts,
    labour: serviceLabour,
    tyreSelections: orderForm.tyreSelections || [],
    serviceLines: orderForm.serviceLines || [],
    subtotal: pricing.subtotal,
    vatRate: VAT_RATE,
    vatAmount: pricing.vatAmount,
    total: pricing.total,
  };
};

function POSOrderManagement({
  assignedDriver = null,
  fleetDetails = null,
  vehicles = [],
  selectedVehicle = null,
  session = null,
  completionMode = false,
  completionRequestId = "",
  completionPosOrderId = "",
  completionVehicleId = "",
  completionServiceType = "",
}) {
  const { t } = useTranslation();
  const translatePriority = (value) =>
    ({
      Low: t("pos.order.priorityLow", "Low"),
      Normal: t("pos.order.priorityNormal", "Normal"),
      High: t("pos.order.priorityHigh", "High"),
      Emergency: t("pos.order.priorityEmergency", "Emergency"),
    })[value] || value;
  const navigate = useNavigate();
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState,
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState,
  );

  const [orderForm, setOrderForm] = useState(() =>
    createInitialForm(selectedVehicle),
  );
  const [activeStep, setActiveStep] = useState(0);
  const [tyreSearch, setTyreSearch] = useState("");
  const [tyreManufacturerFilter, setTyreManufacturerFilter] = useState("all");
  const [tyreMaterialFilter, setTyreMaterialFilter] = useState("all");
  const [tyreSeasonalityFilter, setTyreSeasonalityFilter] = useState("all");
  const [partDraft, setPartDraft] = useState({
    name: "",
    qty: 1,
    unitCost: 0,
  });
  const [labourDraft, setLabourDraft] = useState({
    name: "",
    hours: 1,
    rate: 0,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    order: null,
    source: "draft",
  });
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCompletionSubmitting, setIsCompletionSubmitting] = useState(false);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [completionPopup, setCompletionPopup] = useState({
    open: false,
    title: "",
    detail: "",
    invoiceId: "",
    requestId: "",
    posOrderId: "",
    vehicleId: "",
    serviceType: "",
    partsCount: 0,
    labourCount: 0,
    total: 0,
    status: "",
    invoiceDate: "",
  });
  const completionInitKeyRef = useRef("");
  const completionSubmitTimeoutRef = useRef(null);
  const completionPopupTimeoutRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const attachmentPreviewsRef = useRef([]);

  const clearAttachmentInput = () => {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const updateAttachmentPreviews = (nextPreviews) => {
    setAttachmentPreviews((prev) => {
      revokeAttachmentPreviewUrls(prev);
      return nextPreviews;
    });
  };

  const applyAttachmentMeta = (attachments = []) => {
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    updateAttachmentPreviews(safeAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setOrderForm((prev) => ({
      ...prev,
      attachments: safeAttachments,
    }));
  };

  const selectedVehicleModel = useMemo(
    () =>
      vehicles.find((item) => item.id === orderForm.vehicleId) ||
      selectedVehicle ||
      null,
    [orderForm.vehicleId, selectedVehicle, vehicles],
  );

  const currentRequest = useMemo(
    () =>
      serviceOrderState.orders.find(
        (order) => order.id === orderForm.requestId,
      ) || null,
    [orderForm.requestId, serviceOrderState.orders],
  );

  const checkedInRequests = useMemo(
    () =>
      serviceOrderState.orders
        .filter(
          (order) =>
            String(order.status || "")
              .trim()
              .toLowerCase() === "checked in",
        )
        .sort((a, b) => {
          const ta = new Date(a.updatedAt || a.requestedAt).getTime() || 0;
          const tb = new Date(b.updatedAt || b.requestedAt).getTime() || 0;
          return tb - ta;
        }),
    [serviceOrderState.orders],
  );

  const wizardPricing = useMemo(
    () => buildWizardPricing(orderForm),
    [orderForm],
  );

  const filteredTyreCatalog = useMemo(() => {
    const query = String(tyreSearch || "")
      .trim()
      .toLowerCase();
    const expectedSize = String(selectedVehicleModel?.tyreSpecs?.size || "")
      .trim()
      .toLowerCase();
    return TYRE_CATALOG.filter((item) => {
      if (expectedSize && String(item.size).toLowerCase() !== expectedSize) {
        return false;
      }
      if (
        tyreManufacturerFilter !== "all" &&
        String(item.manufacturer).toLowerCase() !== tyreManufacturerFilter
      ) {
        return false;
      }
      if (
        tyreMaterialFilter !== "all" &&
        String(item.material).toLowerCase() !== tyreMaterialFilter
      ) {
        return false;
      }
      if (
        tyreSeasonalityFilter !== "all" &&
        String(item.seasonality).toLowerCase() !== tyreSeasonalityFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        item.code,
        item.manufacturer,
        item.material,
        item.seasonality,
        item.size,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [
    selectedVehicleModel?.tyreSpecs?.size,
    tyreManufacturerFilter,
    tyreMaterialFilter,
    tyreSearch,
    tyreSeasonalityFilter,
  ]);

  const totals = useMemo(() => {
    const partsTotal = orderForm.parts.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.qty) * normalizeNumber(item.unitCost),
      0,
    );
    const labourTotal = orderForm.labour.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.hours) * normalizeNumber(item.rate),
      0,
    );
    return {
      partsTotal: Math.round(partsTotal),
      labourTotal: Math.round(labourTotal),
      total: Math.round(partsTotal + labourTotal),
    };
  }, [orderForm.labour, orderForm.parts]);

  const completionInvoiceServices = useMemo(() => {
    const partLines = orderForm.parts
      .map((item) => ({
        name: `Part: ${item.name}`,
        cost: Math.round(
          normalizeNumber(item.qty) * normalizeNumber(item.unitCost),
        ),
      }))
      .filter((line) => line.cost > 0);
    const labourLines = orderForm.labour
      .map((item) => ({
        name: `Labour: ${item.name}`,
        cost: Math.round(
          normalizeNumber(item.hours) * normalizeNumber(item.rate),
        ),
      }))
      .filter((line) => line.cost > 0);
    return [...partLines, ...labourLines];
  }, [orderForm.labour, orderForm.parts]);

  useEffect(() => {
    const initKey = completionMode
      ? `${completionRequestId}|${completionPosOrderId}|${completionVehicleId}|${completionServiceType}`
      : "";
    if (!completionMode) {
      completionInitKeyRef.current = "";
      return;
    }
    if (!initKey || completionInitKeyRef.current === initKey) {
      return;
    }

    const sourceOrder =
      posOrderState.submittedOrders.find(
        (order) => order.id === completionPosOrderId,
      ) || null;
    const sourceVehicle =
      vehicles.find(
        (item) => item.id === (sourceOrder?.vehicleId || completionVehicleId),
      ) ||
      selectedVehicle ||
      null;
    const sourceAttachments = Array.isArray(sourceOrder?.attachments)
      ? sourceOrder.attachments
      : [];

    setOrderForm((prev) => ({
      ...prev,
      id: sourceOrder?.id || prev.id,
      vehicleId:
        sourceOrder?.vehicleId ||
        completionVehicleId ||
        sourceVehicle?.id ||
        prev.vehicleId,
      vehiclePlate:
        sourceOrder?.vehiclePlate || sourceVehicle?.plate || prev.vehiclePlate,
      serviceType:
        completionServiceType || sourceOrder?.serviceType || prev.serviceType,
      problemType: sourceOrder?.problemType || prev.problemType,
      description:
        sourceOrder?.description ||
        `Completion invoice for ${completionRequestId || "service request"}.`,
      priority: sourceOrder?.priority || prev.priority,
      parts: Array.isArray(sourceOrder?.parts) ? sourceOrder.parts : prev.parts,
      labour: Array.isArray(sourceOrder?.labour)
        ? sourceOrder.labour
        : prev.labour,
      attachments: sourceAttachments,
      notes:
        sourceOrder?.notes ||
        prev.notes ||
        "Completion invoice prepared from POS workflow.",
    }));
    updateAttachmentPreviews(sourceAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setSelectedDraftId("");
    setFeedback(
      `Invoice mode active for ${completionRequestId || "selected request"}. Add/adjust parts and labour, then send invoice to fleet owner.`,
    );
    completionInitKeyRef.current = initKey;
  }, [
    completionMode,
    completionPosOrderId,
    completionRequestId,
    completionServiceType,
    completionVehicleId,
    posOrderState.submittedOrders,
    selectedVehicle,
    vehicles,
  ]);

  useEffect(
    () => () => {
      if (completionSubmitTimeoutRef.current) {
        window.clearTimeout(completionSubmitTimeoutRef.current);
      }
      if (completionPopupTimeoutRef.current) {
        window.clearTimeout(completionPopupTimeoutRef.current);
      }
      revokeAttachmentPreviewUrls(attachmentPreviewsRef.current);
    },
    [],
  );

  useEffect(() => {
    attachmentPreviewsRef.current = attachmentPreviews;
  }, [attachmentPreviews]);

  const populateOperationalForm = ({
    request,
    targetVehicle,
    fallbackDriver,
    sourceOrder = null,
  }) => {
    const vehicleTyrePositions = getVehicleTyrePositions(targetVehicle);
    const requestServiceLines = applyRequestServices(request?.serviceType);
    setOrderForm({
      id: sourceOrder?.id || "",
      requestId: request?.id || "",
      srCode: request?.id || "",
      fleetName:
        fleetDetails?.name || fleetDetails?.companyName || "Fleet owner",
      driverName:
        fallbackDriver?.name ||
        request?.requestedBy ||
        session?.name ||
        "Driver",
      driverLicense: fallbackDriver?.license || "N/A",
      vehicleId: request?.vehicleId || targetVehicle?.id || "",
      vehiclePlate: targetVehicle?.plate || "",
      checkInDateTime:
        request?.checkIn?.checkedInAt || request?.updatedAt || "",
      driverOdometerReading: normalizeNumber(
        request?.orderDetails?.odometerReading,
      ),
      driverOdometerUnit: request?.orderDetails?.odometerUnit || "km",
      verifiedOdometerReading: normalizeNumber(
        request?.checkIn?.odometerReading,
      ),
      verifiedOdometerUnit:
        request?.checkIn?.odometerUnit ||
        request?.orderDetails?.odometerUnit ||
        "km",
      serviceType: request?.serviceType || "General service",
      problemType: request?.requestTitle || "General check",
      description:
        request?.orderDetails?.description ||
        request?.requestTitle ||
        "Checked-in service request.",
      priority: request?.priority || "Normal",
      parts: sourceOrder?.parts || [],
      labour: sourceOrder?.labour || [],
      tyreSelections: vehicleTyrePositions.map(createTyreSelection),
      serviceLines: sourceOrder?.serviceLines?.length
        ? sourceOrder.serviceLines
        : requestServiceLines,
      attachments: sourceOrder?.attachments || [],
      notes:
        request?.checkIn?.note ||
        request?.orderDetails?.notes ||
        "Loaded from checked-in booking in POS workflow.",
      vatRate: VAT_RATE,
      vatAmount: 0,
      subtotal: 0,
      total: 0,
    });
    setActiveStep(0);
  };

  const toggleServiceSelection = (serviceId) => {
    setOrderForm((prev) => ({
      ...prev,
      serviceLines: prev.serviceLines.map((item) =>
        item.id !== serviceId ? item : { ...item, selected: !item.selected },
      ),
    }));
  };

  const updateServiceCount = (serviceId, count) => {
    setOrderForm((prev) => ({
      ...prev,
      serviceLines: prev.serviceLines.map((item) =>
        item.id !== serviceId
          ? item
          : { ...item, count: Math.max(1, normalizeNumber(count || 1)) },
      ),
    }));
  };

  const toggleServiceFavorite = (serviceId) => {
    setOrderForm((prev) => ({
      ...prev,
      serviceLines: prev.serviceLines.map((item) =>
        item.id !== serviceId ? item : { ...item, favorite: !item.favorite },
      ),
    }));
  };

  const addTyreToPosition = (position, tyre) => {
    setOrderForm((prev) => ({
      ...prev,
      tyreSelections: prev.tyreSelections.map((item) =>
        item.position !== position
          ? item
          : {
              ...item,
              selectedTyreId: tyre.id,
              selectedTyreLabel: `${tyre.manufacturer} ${tyre.code}`,
              tyreCode: tyre.code,
              manufacturer: tyre.manufacturer,
              material: tyre.material,
              seasonality: tyre.seasonality,
              unitPrice: tyre.unitPrice,
              action: item.action === "Inspect" ? "Replace" : item.action,
            },
      ),
    }));
  };

  const addTyreToNextOpenPosition = (tyre) => {
    const nextOpenPosition = orderForm.tyreSelections.find(
      (item) => !item.selectedTyreId,
    );
    if (!nextOpenPosition) {
      return;
    }
    addTyreToPosition(nextOpenPosition.position, tyre);
  };

  const updateTyreSelectionField = (position, field, value) => {
    setOrderForm((prev) => ({
      ...prev,
      tyreSelections: prev.tyreSelections.map((item) =>
        item.position !== position ? item : { ...item, [field]: value },
      ),
    }));
  };

  const copyTyreSelectionToAll = (position) => {
    const source = orderForm.tyreSelections.find(
      (item) => item.position === position,
    );
    if (!source) {
      return;
    }
    setOrderForm((prev) => ({
      ...prev,
      tyreSelections: prev.tyreSelections.map((item) =>
        item.position === position
          ? item
          : { ...item, ...source, position: item.position },
      ),
    }));
  };

  const loadCheckedInRequestIntoForm = (request) => {
    if (!request) {
      return;
    }
    const targetVehicle =
      vehicles.find((item) => item.id === request.vehicleId) ||
      selectedVehicle ||
      null;
    const fallbackDriver =
      assignedDriver?.assignedVehicleId === request.vehicleId
        ? assignedDriver
        : null;
    const existingOrder =
      posOrderState.submittedOrders.find(
        (order) => order.id === completionPosOrderId,
      ) || null;
    populateOperationalForm({
      request,
      targetVehicle,
      fallbackDriver,
      sourceOrder: existingOrder,
    });
    setSelectedDraftId("");
    setFeedback(`Loaded checked-in request ${request.id} into order editor.`);
  };

  const loadDraftIntoForm = (draft) => {
    if (!draft) {
      return;
    }
    const draftAttachments = Array.isArray(draft.attachments)
      ? draft.attachments
      : [];
    setOrderForm({
      id: draft.id,
      requestId: draft.requestId || "",
      srCode: draft.srCode || draft.requestId || "",
      fleetName: draft.fleetName || "",
      driverName: draft.driverName || "",
      driverLicense: draft.driverLicense || "",
      vehicleId: draft.vehicleId || "",
      vehiclePlate: draft.vehiclePlate || "",
      checkInDateTime: draft.checkInDateTime || "",
      driverOdometerReading: normalizeNumber(draft.driverOdometerReading || 0),
      driverOdometerUnit: draft.driverOdometerUnit || "km",
      verifiedOdometerReading: normalizeNumber(
        draft.verifiedOdometerReading || 0,
      ),
      verifiedOdometerUnit: draft.verifiedOdometerUnit || "km",
      serviceType: draft.serviceType || "General service",
      problemType: draft.problemType || "General check",
      description: draft.description || "",
      priority: draft.priority || "Normal",
      parts: Array.isArray(draft.parts) ? draft.parts : [],
      labour: Array.isArray(draft.labour) ? draft.labour : [],
      tyreSelections:
        Array.isArray(draft.tyreSelections) && draft.tyreSelections.length > 0
          ? draft.tyreSelections
          : getVehicleTyrePositions(
              vehicles.find((item) => item.id === draft.vehicleId) ||
                selectedVehicle,
            ).map(createTyreSelection),
      serviceLines:
        Array.isArray(draft.serviceLines) && draft.serviceLines.length > 0
          ? draft.serviceLines
          : applyRequestServices(draft.serviceType),
      attachments: draftAttachments,
      notes: draft.notes || "",
      vatRate: normalizeNumber(draft.vatRate || VAT_RATE) || VAT_RATE,
      vatAmount: normalizeNumber(draft.vatAmount || 0),
      subtotal: normalizeNumber(draft.subtotal || 0),
      total: normalizeNumber(draft.total || 0),
    });
    updateAttachmentPreviews(draftAttachments.map(toPreviewFromMeta));
    clearAttachmentInput();
    setSelectedDraftId(draft.id);
    setActiveStep(0);
  };

  const handleVehicleChange = (vehicleId) => {
    const target = vehicles.find((item) => item.id === vehicleId);
    setOrderForm((prev) => ({
      ...prev,
      vehicleId,
      vehiclePlate: target?.plate || prev.vehiclePlate,
      tyreSelections: getVehicleTyrePositions(target).map(createTyreSelection),
    }));
  };

  const addPartItem = () => {
    if (!partDraft.name.trim()) {
      return;
    }
    const item = {
      id: createLineId("PART"),
      name: partDraft.name.trim(),
      qty: Math.max(0, normalizeNumber(partDraft.qty)),
      unitCost: Math.max(0, normalizeNumber(partDraft.unitCost)),
    };
    setOrderForm((prev) => ({
      ...prev,
      parts: [...prev.parts, item],
    }));
    setPartDraft({
      name: "",
      qty: 1,
      unitCost: 0,
    });
  };

  const addLabourItem = () => {
    if (!labourDraft.name.trim()) {
      return;
    }
    const item = {
      id: createLineId("LAB"),
      name: labourDraft.name.trim(),
      hours: Math.max(0, normalizeNumber(labourDraft.hours)),
      rate: Math.max(0, normalizeNumber(labourDraft.rate)),
    };
    setOrderForm((prev) => ({
      ...prev,
      labour: [...prev.labour, item],
    }));
    setLabourDraft({
      name: "",
      hours: 1,
      rate: 0,
    });
  };

  const removePartItem = (lineId) => () => {
    setOrderForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((item) => item.id !== lineId),
    }));
  };

  const removeLabourItem = (lineId) => () => {
    setOrderForm((prev) => ({
      ...prev,
      labour: prev.labour.filter((item) => item.id !== lineId),
    }));
  };

  const onFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    const previews = files.map(toPreviewFromFile);
    setOrderForm((prev) => ({
      ...prev,
      attachments: previews.map(toMetaFromPreview),
    }));
    updateAttachmentPreviews(previews);
  };

  const removeAttachmentById = (attachmentId) => {
    setAttachmentPreviews((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(target.url);
      }
      const next = prev.filter((item) => item.id !== attachmentId);
      setOrderForm((formPrev) => ({
        ...formPrev,
        attachments: next.map(toMetaFromPreview),
      }));
      if (next.length === 0) {
        clearAttachmentInput();
      }
      return next;
    });
  };

  const clearAttachments = () => {
    updateAttachmentPreviews([]);
    clearAttachmentInput();
    setOrderForm((prev) => ({
      ...prev,
      attachments: [],
    }));
  };

  const saveDraft = () => {
    if (!orderForm.vehicleId || !orderForm.serviceType.trim()) {
      setFeedback("Vehicle and service type are required to save draft.");
      return;
    }
    const payload = completionMode ? orderForm : buildOrderPayload(orderForm);
    const saved = savePosOrderDraft(payload);
    setOrderForm((prev) => ({ ...prev, id: saved.id }));
    setSelectedDraftId(saved.id);
    setFeedback("Draft order saved.");
  };

  const submitOrder = () => {
    if (!orderForm.vehicleId || !orderForm.serviceType.trim()) {
      setFeedback("Vehicle and service type are required before submission.");
      return;
    }
    if (!completionMode) {
      const hasSelectedService = orderForm.serviceLines.some(
        (item) => item.selected,
      );
      if (!hasSelectedService) {
        setFeedback("Select at least one service before submission.");
        return;
      }
    }

    const payload = completionMode ? orderForm : buildOrderPayload(orderForm);
    const submitted = submitPosOrder(payload, session?.name || "POS User");
    if (!submitted.requestId) {
      createServiceRequest({
        vehicleId: submitted.vehicleId,
        vehicleModel: selectedVehicleModel?.model || "Unknown vehicle",
        serviceType: submitted.serviceType,
        requestTitle: `${submitted.serviceType} - POS Order ${submitted.id}`,
        requestedBy: session?.name || "POS User",
        priority: submitted.priority,
        emergency: normalizeNumber(submitted.total) > 2500,
        status: "Pending approval",
        orderDetails: {
          description: submitted.description || "POS-created service order.",
          vendor: "POS Booking Desk",
          estimatedCost: formatEuro(submitted.total),
          location: "POS Center",
          notes: `SR ${submitted.srCode || submitted.requestId || "N/A"} | Parts ${submitted.parts.length}, Labour ${submitted.labour.length}, Attachments ${submitted.attachments.length}`,
        },
      });
    }

    applyAttachmentMeta([]);
    setOrderForm(createInitialForm(selectedVehicle));
    setActiveStep(0);
    setSelectedDraftId("");
    setFeedback(`Order ${submitted.id} submitted.`);
  };

  const goToCompletionDetails = (requestId, posOrderId) => {
    if (!requestId) {
      return;
    }
    const redirectParams = new URLSearchParams({
      focus: "status",
      requestId,
    });
    if (posOrderId) {
      redirectParams.set("posOrderId", posOrderId);
    }
    navigate(`/pos-dashboard/approval-workflow?${redirectParams.toString()}`);
  };

  const submitCompletionInvoice = () => {
    if (!completionMode) {
      return;
    }
    if (!completionRequestId) {
      const message =
        "Completion request is missing. Re-open from Approval Workflow.";
      setFeedback(message);
      toast.error("Invoice not submitted", {
        description: message,
        duration: 3200,
      });
      return;
    }
    if (!orderForm.vehicleId) {
      const message = "Vehicle is required to generate invoice.";
      setFeedback(message);
      toast.error("Invoice not submitted", {
        description: message,
        duration: 3200,
      });
      return;
    }
    if (completionInvoiceServices.length === 0 || totals.total <= 0) {
      const message = "Add at least one parts/labour line with valid cost.";
      setFeedback(message);
      toast.error("Invoice not submitted", {
        description: message,
        duration: 3200,
      });
      return;
    }

    setIsCompletionSubmitting(true);
    if (completionSubmitTimeoutRef.current) {
      window.clearTimeout(completionSubmitTimeoutRef.current);
    }
    completionSubmitTimeoutRef.current = window.setTimeout(() => {
      const createdInvoice = addInvoice({
        orderId: completionRequestId,
        vehicleId: orderForm.vehicleId,
        vehicleModel: selectedVehicleModel?.model || "Unknown vehicle",
        driverName: session?.name || "POS User",
        location: "POS Center",
        status: "Processing",
        services: completionInvoiceServices,
        totalAmount: totals.total,
      });

      const invoiceSubmitted = submitInvoiceToFleet(completionRequestId, {
        actor: session?.name || "POS User",
        note: `Invoice ${createdInvoice.id} sent to fleet for completion confirmation.`,
        invoiceId: createdInvoice.id,
      });

      if (!invoiceSubmitted) {
        setIsCompletionSubmitting(false);
        const message =
          "Invoice created but unable to move request to invoice processing.";
        setFeedback(message);
        toast.error("Invoice status update failed", {
          description: message,
          duration: 3400,
        });
        return;
      }

      const detail = `Invoice ${createdInvoice.id} sent to fleet owner. ${completionRequestId} is now Invoice processing.`;
      setFeedback(detail);
      setIsCompletionSubmitting(false);
      setCompletionPopup({
        open: true,
        title: "Invoice submitted",
        detail,
        invoiceId: createdInvoice.id,
        requestId: completionRequestId,
        posOrderId: completionPosOrderId || orderForm.id,
        vehicleId: orderForm.vehicleId,
        serviceType: orderForm.serviceType,
        partsCount: orderForm.parts.length,
        labourCount: orderForm.labour.length,
        total: totals.total,
        status: createdInvoice.status || "Processing",
        invoiceDate: createdInvoice.date || new Date().toISOString(),
      });
      toast.success("Invoice sent to fleet", {
        description: detail,
        duration: 3000,
      });

      if (completionPopupTimeoutRef.current) {
        window.clearTimeout(completionPopupTimeoutRef.current);
      }
      completionPopupTimeoutRef.current = window.setTimeout(() => {
        goToCompletionDetails(
          completionRequestId,
          completionPosOrderId || orderForm.id,
        );
      }, 1900);
    }, 850);
  };

  const onDuplicateSubmittedOrder = (orderId) => () => {
    const duplicated = duplicateSubmittedPosOrder(orderId);
    if (!duplicated) {
      setFeedback("Unable to duplicate selected order.");
      return;
    }
    loadDraftIntoForm(duplicated);
    setFeedback(`Order duplicated as draft ${duplicated.id}.`);
  };

  const onDeleteDraft = (draftId) => () => {
    const removed = deletePosOrderDraft(draftId);
    if (!removed) {
      return;
    }
    if (selectedDraftId === draftId) {
      setSelectedDraftId("");
      applyAttachmentMeta([]);
      setOrderForm(createInitialForm(selectedVehicle));
      setActiveStep(0);
    }
    setFeedback("Draft removed.");
  };

  const openOrderDetails = (order, source) => () => {
    setDetailsModal({
      open: true,
      order,
      source,
    });
  };

  const closeOrderDetails = () => {
    setDetailsModal({
      open: false,
      order: null,
      source: "draft",
    });
  };

  const loadDraftFromModal = () => {
    if (!detailsModal.order) {
      return;
    }
    loadDraftIntoForm(detailsModal.order);
    closeOrderDetails();
    setFeedback(`Draft ${detailsModal.order.id} loaded in editor.`);
  };

  const duplicateFromModal = () => {
    if (!detailsModal.order) {
      return;
    }
    const duplicated = duplicateSubmittedPosOrder(detailsModal.order.id);
    if (!duplicated) {
      setFeedback("Unable to duplicate selected order.");
      return;
    }
    loadDraftIntoForm(duplicated);
    closeOrderDetails();
    setFeedback(`Order duplicated as draft ${duplicated.id}.`);
  };

  const modalOrder = detailsModal.order;
  const modalParts = Array.isArray(modalOrder?.parts) ? modalOrder.parts : [];
  const modalLabour = Array.isArray(modalOrder?.labour)
    ? modalOrder.labour
    : [];
  const modalAttachments = Array.isArray(modalOrder?.attachments)
    ? modalOrder.attachments
    : [];

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-6">
          {!completionMode ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {ORDER_STEPS.map((step, index) => (
                  <button
                    key={step.key}
                    className={`inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-xs font-semibold transition ${
                      activeStep === index
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveStep(index)}
                    type="button"
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 text-[11px]">
                      {index + 1}
                    </span>
                    {step.key === "basic"
                      ? t("pos.order.steps.basic", "Basic details")
                      : step.key === "tyres"
                        ? t("pos.order.steps.tyres", "Tyre data")
                        : step.key === "services"
                          ? t("pos.order.steps.services", "Services")
                          : t("pos.order.steps.summary", "Order summary")}
                  </button>
                ))}
              </div>

              {activeStep === 0 ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      [
                        t("pos.order.srCode", "SR code"),
                        orderForm.srCode ||
                          orderForm.requestId ||
                          t("pos.order.loadCheckedInRequest", "Load a checked-in request"),
                      ],
                      [t("pos.order.driverName", "Driver name"), orderForm.driverName || "N/A"],
                      [t("pos.order.driverLicense", "Driver license"), orderForm.driverLicense || "N/A"],
                      [t("pos.order.vehicleLicenseNo", "Vehicle license no"), orderForm.vehiclePlate || "N/A"],
                      [t("pos.order.vehicleId", "Vehicle ID"), orderForm.vehicleId || "N/A"],
                      [t("pos.order.fleet", "Fleet"), orderForm.fleetName || "N/A"],
                      [
                        t("pos.order.driverOdometer", "Driver odometer"),
                        `${normalizeNumber(orderForm.driverOdometerReading).toLocaleString()} ${orderForm.driverOdometerUnit || "km"}`,
                      ],
                      [
                        t("pos.order.posOdometer", "POS odometer"),
                        `${normalizeNumber(orderForm.verifiedOdometerReading).toLocaleString()} ${orderForm.verifiedOdometerUnit || "km"}`,
                      ],
                      [
                        t("pos.order.checkInDate", "Check-in date"),
                        formatDateTime(orderForm.checkInDateTime),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>{t("pos.order.priority", "Priority")}</Label>
                      <SearchableSelect
                        onValueChange={(value) =>
                          setOrderForm((prev) => ({ ...prev, priority: value }))
                        }
                        options={[
                          { value: "Low", label: "Low" },
                          { value: "Normal", label: "Normal" },
                          { value: "High", label: "High" },
                          { value: "Emergency", label: "Emergency" },
                        ]}
                        value={orderForm.priority || ""}
                  placeholder={t("pos.order.priority", "Priority")}
                        searchPlaceholder="Search priorities"
                        emptyLabel="No priority options"
                        noMatchLabel="No matching priorities"
                        triggerClassName="w-full"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("pos.order.problemType", "Problem type")}</Label>
                      <Input
                        onChange={(event) =>
                          setOrderForm((prev) => ({
                            ...prev,
                            problemType: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "pos.order.problemTypePlaceholder",
                          "Brake issue / Tyre wear / Diagnostics",
                        )}
                        value={orderForm.problemType}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("pos.order.driverRequestDetails", "Driver request details")}</Label>
                    <Textarea
                      onChange={(event) =>
                        setOrderForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t(
                        "pos.order.driverRequestPlaceholder",
                        "Describe service issue and observed symptoms.",
                      )}
                      rows={4}
                      value={orderForm.description}
                    />
                  </div>
                </div>
              ) : null}

              {activeStep === 1 ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Input
                          onChange={(event) =>
                            setTyreSearch(event.target.value)
                          }
                          placeholder={t("pos.order.searchTyreCode", "Search by tyre code")}
                          value={tyreSearch}
                        />
                        <select
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                          onChange={(event) =>
                            setTyreManufacturerFilter(event.target.value)
                          }
                          value={tyreManufacturerFilter}
                        >
                          <option value="all">{t("pos.order.allManufacturers", "All manufacturers")}</option>
                          {[
                            ...new Set(
                              TYRE_CATALOG.map((item) => item.manufacturer),
                            ),
                          ].map((item) => (
                            <option key={item} value={item.toLowerCase()}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                          onChange={(event) =>
                            setTyreMaterialFilter(event.target.value)
                          }
                          value={tyreMaterialFilter}
                        >
                          <option value="all">{t("pos.order.allMaterials", "All materials")}</option>
                          {[
                            ...new Set(
                              TYRE_CATALOG.map((item) => item.material),
                            ),
                          ].map((item) => (
                            <option key={item} value={item.toLowerCase()}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                          onChange={(event) =>
                            setTyreSeasonalityFilter(event.target.value)
                          }
                          value={tyreSeasonalityFilter}
                        >
                          <option value="all">{t("pos.order.allSeasons", "All seasons")}</option>
                          {[
                            ...new Set(
                              TYRE_CATALOG.map((item) => item.seasonality),
                            ),
                          ].map((item) => (
                            <option key={item} value={item.toLowerCase()}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="card-list-scrollbar mt-4 max-h-[18rem] space-y-2 overflow-y-auto pr-1">
                        {filteredTyreCatalog.map((tyre) => (
                          <div
                            key={tyre.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {tyre.manufacturer} · {tyre.code}
                              </p>
                              <p className="text-xs text-slate-500">
                                {tyre.material} | {tyre.seasonality} |{" "}
                                {tyre.size}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatEuro(tyre.unitPrice)}
                              </span>
                              <button
                                className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                                onClick={() => addTyreToNextOpenPosition(tyre)}
                                type="button"
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {t("pos.order.vehicleTyrePositions", "Vehicle tyre positions")}
                      </h4>
                      <div className="card-list-scrollbar mt-3 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                        {orderForm.tyreSelections.map((item) => (
                          <div
                            key={item.position}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {translateTyrePosition(t, item.position)}
                              </p>
                              <button
                                className="text-[11px] font-semibold text-sky-700"
                                onClick={() =>
                                  copyTyreSelectionToAll(item.position)
                                }
                                type="button"
                              >
                                {t("pos.order.copyToAll", "Copy to all")}
                              </button>
                            </div>
                            <div className="mt-3 grid gap-2">
                              <select
                                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                onChange={(event) =>
                                  updateTyreSelectionField(
                                    item.position,
                                    "action",
                                    event.target.value,
                                  )
                                }
                                value={item.action}
                              >
                                {TYRE_ACTION_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                onChange={(event) =>
                                  updateTyreSelectionField(
                                    item.position,
                                    "reason",
                                    event.target.value,
                                  )
                                }
                                value={item.reason}
                              >
                                <option value="">{t("pos.order.selectReason", "Select reason")}</option>
                                {TYRE_REASON_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                onChange={(event) => {
                                  const tyre = filteredTyreCatalog.find(
                                    (catalogItem) =>
                                      catalogItem.id === event.target.value,
                                  );
                                  if (tyre) {
                                    addTyreToPosition(item.position, tyre);
                                  }
                                }}
                                value={item.selectedTyreId}
                              >
                                <option value="">{t("pos.order.selectTyre", "Select tyre")}</option>
                                {filteredTyreCatalog.map((tyre) => (
                                  <option key={tyre.id} value={tyre.id}>
                                    {tyre.manufacturer} · {tyre.code}
                                  </option>
                                ))}
                              </select>
                              {item.selectedTyreLabel ? (
                                <p className="text-xs text-slate-600">
                                  Selected:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {item.selectedTyreLabel}
                                  </span>
                                  {" · "}
                                  {formatEuro(item.unitPrice)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeStep === 2 ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {orderForm.serviceLines
                      .slice()
                      .sort((a, b) => Number(b.favorite) - Number(a.favorite))
                      .map((service) => (
                        <div
                          key={service.id}
                          className={`rounded-2xl border p-4 transition ${
                            service.selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {service.name}
                              </p>
                              <p
                                className={`text-xs ${service.selected ? "text-white/70" : "text-slate-500"}`}
                              >
                                {service.category} ·{" "}
                                {formatEuro(service.unitPrice)}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleServiceFavorite(service.id)}
                              type="button"
                            >
                              <Star
                                className={`size-4 ${
                                  service.favorite
                                    ? "fill-amber-400 text-amber-400"
                                    : service.selected
                                      ? "text-white/70"
                                      : "text-slate-400"
                                }`}
                              />
                            </button>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <Button
                              onClick={() => toggleServiceSelection(service.id)}
                              size="sm"
                              type="button"
                              variant={
                                service.selected ? "secondary" : "outline"
                              }
                            >
                              {service.selected ? "Selected" : "Select service"}
                            </Button>
                            <Input
                              className={`w-20 ${service.selected ? "border-white/20 bg-white/10 text-white" : ""}`}
                              min="1"
                              onChange={(event) =>
                                updateServiceCount(
                                  service.id,
                                  event.target.value,
                                )
                              }
                              type="number"
                              value={service.count}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              {activeStep === 3 ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Basic details
                      </h4>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                        <p>
                          SR code:{" "}
                          <span className="font-semibold text-slate-900">
                            {orderForm.srCode || "N/A"}
                          </span>
                        </p>
                        <p>
                          Driver:{" "}
                          <span className="font-semibold text-slate-900">
                            {orderForm.driverName || "N/A"}
                          </span>
                        </p>
                        <p>
                          Driver license:{" "}
                          <span className="font-semibold text-slate-900">
                            {orderForm.driverLicense || "N/A"}
                          </span>
                        </p>
                        <p>
                          Vehicle:{" "}
                          <span className="font-semibold text-slate-900">
                            {orderForm.vehiclePlate ||
                              orderForm.vehicleId ||
                              "N/A"}
                          </span>
                        </p>
                        <p>
                          Verified odometer:{" "}
                          <span className="font-semibold text-slate-900">
                            {normalizeNumber(
                              orderForm.verifiedOdometerReading,
                            ).toLocaleString()}{" "}
                            {orderForm.verifiedOdometerUnit || "km"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Pricing summary
                      </h4>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>{t("pos.order.tyreTotal", "Tyre total")}</span>
                          <span className="font-semibold text-slate-900">
                            {formatEuro(wizardPricing.tyreTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("pos.order.servicesTotal", "Services total")}</span>
                          <span className="font-semibold text-slate-900">
                            {formatEuro(wizardPricing.serviceTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("pos.order.subtotal", "Subtotal")}</span>
                          <span className="font-semibold text-slate-900">
                            {formatEuro(wizardPricing.subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t("pos.order.vat", "VAT 19%")}</span>
                          <span className="font-semibold text-slate-900">
                            {formatEuro(wizardPricing.vatAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base">
                          <span className="font-semibold text-slate-900">
                            Total
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatEuro(wizardPricing.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Selected tyre work
                      </h4>
                      <div className="mt-3 space-y-2 text-xs text-slate-700">
                        {orderForm.tyreSelections.filter(
                          (item) =>
                            item.selectedTyreId || item.action !== "Inspect",
                        ).length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
                            No tyre work selected.
                          </p>
                        ) : (
                          orderForm.tyreSelections
                            .filter(
                              (item) =>
                                item.selectedTyreId ||
                                item.action !== "Inspect",
                            )
                            .map((item) => (
                              <div
                                key={item.position}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="font-semibold text-slate-900">
                                  {translateTyrePosition(t, item.position)}
                                </p>
                                <p>
                                  {item.action}
                                  {item.reason ? ` · ${item.reason}` : ""}
                                </p>
                                {item.selectedTyreLabel ? (
                                  <p>
                                    {item.selectedTyreLabel} ·{" "}
                                    {formatEuro(item.unitPrice)}
                                  </p>
                                ) : null}
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Selected services
                      </h4>
                      <div className="mt-3 space-y-2 text-xs text-slate-700">
                        {orderForm.serviceLines.filter((item) => item.selected)
                          .length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-500">
                            No services selected.
                          </p>
                        ) : (
                          orderForm.serviceLines
                            .filter((item) => item.selected)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {item.name}
                                  </p>
                                  <p>
                                    {item.category} · Count {item.count}
                                  </p>
                                </div>
                                <p className="font-semibold text-slate-900">
                                  {formatEuro(item.count * item.unitPrice)}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-500">
                  {activeStep < ORDER_STEPS.length - 1
                    ? t("pos.order.stepContinue", "Complete the current step and continue.")
                    : t("pos.order.reviewAndSubmit", "Review pricing and submit the service order.")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={activeStep === 0}
                    onClick={() =>
                      setActiveStep((prev) => Math.max(0, prev - 1))
                    }
                    type="button"
                    variant="outline"
                  >
                    {t("pos.order.back", "Back")}
                  </Button>
                  {activeStep < ORDER_STEPS.length - 1 ? (
                    <Button
                      onClick={() =>
                        setActiveStep((prev) =>
                          Math.min(ORDER_STEPS.length - 1, prev + 1),
                        )
                      }
                      type="button"
                    >
                      {t("pos.order.next", "Next")}
                      <ChevronRight className="ml-2 size-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={saveDraft}
                        type="button"
                        variant="outline"
                      >
                        {t("pos.order.saveDraft", "Save draft")}
                      </Button>
                      <Button
                        className="h-[36px] rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                        onClick={submitOrder}
                        type="button"
                      >
                        {t("pos.order.submitOrder", "Submit order")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ${completionMode ? "" : "hidden"}`}
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {t("pos.order.createServiceOrder", "Create service order")}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <Label>{t("pos.order.vehicle", "Vehicle")}</Label>
                <SearchableSelect
                  onValueChange={handleVehicleChange}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.plate || vehicle.id} - ${vehicle.model}`,
                    description: vehicle.type || vehicle.category,
                    meta: vehicle.status,
                  }))}
                  value={orderForm.vehicleId || ""}
                  placeholder={t("pos.order.selectVehicle", "Select vehicle")}
                  searchPlaceholder={t("pos.order.searchVehicles", "Search vehicles")}
                  emptyLabel={t("pos.order.noVehicles", "No vehicles")}
                  noMatchLabel={t("pos.order.noMatchingVehicles", "No matching vehicles")}
                  triggerClassName="w-full min-w-0 max-w-full overflow-hidden"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("pos.order.priority", "Priority")}</Label>
                <SearchableSelect
                  onValueChange={(value) =>
                    setOrderForm((prev) => ({ ...prev, priority: value }))
                  }
                  options={[
                    { value: "Low", label: t("pos.order.priorityLow", "Low") },
                    { value: "Normal", label: t("pos.order.priorityNormal", "Normal") },
                    { value: "High", label: t("pos.order.priorityHigh", "High") },
                    { value: "Emergency", label: t("pos.order.priorityEmergency", "Emergency") },
                  ]}
                  value={orderForm.priority || ""}
                  placeholder={t("pos.order.priority", "Priority")}
                  searchPlaceholder={t("pos.order.searchPriorities", "Search priorities")}
                  emptyLabel={t("pos.order.noPriorityOptions", "No priority options")}
                  noMatchLabel={t("pos.order.noMatchingPriorities", "No matching priorities")}
                  triggerClassName="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("pos.order.serviceType", "Service type")}</Label>
                <Input
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      serviceType: event.target.value,
                    }))
                  }
                  placeholder={t("pos.order.generalService", "General service")}
                  value={orderForm.serviceType}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("pos.order.problemType", "Problem type")}</Label>
                <Input
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      problemType: event.target.value,
                    }))
                  }
                  placeholder={t("pos.order.problemTypePlaceholder", "Brake issue / Tyre wear / Diagnostics")}
                  value={orderForm.problemType}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <Label>{t("pos.order.description", "Description")}</Label>
              <Textarea
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder={t("pos.order.descriptionPlaceholder", "Describe service issue and observed symptoms.")}
                rows={3}
                value={orderForm.description}
              />
            </div>
          </div>

          <div
            className={`grid gap-6 xl:grid-cols-2 ${completionMode ? "" : "hidden"}`}
          >
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                {t("pos.order.addPartsItems", "Add parts items")}
              </h3>
              <div className="mt-3 grid gap-2">
                <Input
                  onChange={(event) =>
                    setPartDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("pos.order.partName", "Part name")}
                  value={partDraft.name}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    min="0"
                    onChange={(event) =>
                      setPartDraft((prev) => ({
                        ...prev,
                        qty: event.target.value,
                      }))
                    }
                    placeholder={t("pos.order.qty", "Qty")}
                    type="number"
                    value={partDraft.qty}
                  />
                  <Input
                    min="0"
                    onChange={(event) =>
                      setPartDraft((prev) => ({
                        ...prev,
                        unitCost: event.target.value,
                      }))
                    }
                    placeholder={t("pos.order.unitCost", "Unit cost")}
                    type="number"
                    value={partDraft.unitCost}
                  />
                </div>
                <Button onClick={addPartItem} type="button" variant="outline">
                  {t("pos.order.addPart", "Add part")}
                </Button>
              </div>

              <div className="card-list-scrollbar mt-3 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                {orderForm.parts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    {t("pos.order.noPartsAdded", "No parts added.")}
                  </p>
                ) : (
                  orderForm.parts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-slate-600">
                          {t("pos.order.qtyShort", "Qty")} {item.qty} x {formatEuro(item.unitCost)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatEuro(
                            Math.round(
                              normalizeNumber(item.qty) *
                                normalizeNumber(item.unitCost),
                            ),
                          )}
                        </p>
                        <button
                          className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700"
                          onClick={removePartItem(item.id)}
                          type="button"
                        >
                          {t("actions.remove", "Remove")}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                {t("pos.order.addLabourItems", "Add labour items")}
              </h3>
              <div className="mt-3 grid gap-2">
                <Input
                  onChange={(event) =>
                    setLabourDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("pos.order.labourTask", "Labour task")}
                  value={labourDraft.name}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    min="0"
                    onChange={(event) =>
                      setLabourDraft((prev) => ({
                        ...prev,
                        hours: event.target.value,
                      }))
                    }
                    placeholder={t("pos.order.hours", "Hours")}
                    type="number"
                    value={labourDraft.hours}
                  />
                  <Input
                    min="0"
                    onChange={(event) =>
                      setLabourDraft((prev) => ({
                        ...prev,
                        rate: event.target.value,
                      }))
                    }
                    placeholder={t("pos.order.ratePerHour", "Rate/hr")}
                    type="number"
                    value={labourDraft.rate}
                  />
                </div>
                <Button onClick={addLabourItem} type="button" variant="outline">
                  {t("pos.order.addLabour", "Add labour")}
                </Button>
              </div>

              <div className="card-list-scrollbar mt-3 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                {orderForm.labour.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    {t("pos.order.noLabourItemsAdded", "No labour items added.")}
                  </p>
                ) : (
                  orderForm.labour.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-slate-600">
                          {item.hours} hr x {formatEuro(item.rate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatEuro(
                            Math.round(
                              normalizeNumber(item.hours) *
                                normalizeNumber(item.rate),
                            ),
                          )}
                        </p>
                        <button
                          className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700"
                          onClick={removeLabourItem(item.id)}
                          type="button"
                        >
                          {t("actions.remove", "Remove")}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ${completionMode ? "" : "hidden"}`}
          >
              <h3 className="text-lg font-semibold text-slate-900">
                {t("pos.order.uploadImagesDocuments", "Upload images/documents")}
              </h3>
            <div className="mt-3 grid gap-3">
              <Input
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={onFilesSelected}
                ref={attachmentInputRef}
                type="file"
              />
              {attachmentPreviews.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      {t("pos.order.uploadedFiles", "Uploaded files")} ({attachmentPreviews.length})
                    </p>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      onClick={clearAttachments}
                      type="button"
                    >
                      <Trash2 size={12} />
                      {t("actions.clearAll", "Clear all")}
                    </button>
                  </div>
                  <div className="card-list-scrollbar mt-3 grid max-h-[18rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {attachmentPreviews.map((preview) => (
                      <figure
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        key={preview.id}
                      >
                        {preview.isImage && preview.url ? (
                          <img
                            alt={preview.name}
                            className="h-24 w-full object-cover sm:h-28"
                            loading="lazy"
                            src={preview.url}
                          />
                        ) : (
                          <div className="flex h-24 w-full items-center justify-center border-b border-slate-200 bg-slate-100 sm:h-28">
                            <FileText className="size-5 text-slate-500" />
                          </div>
                        )}
                        <button
                          aria-label={`Remove ${preview.name}`}
                          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => removeAttachmentById(preview.id)}
                          type="button"
                        >
                          <X size={12} />
                        </button>
                        <figcaption className="border-t border-slate-200 px-2 py-1.5">
                          <p
                            className="truncate text-[11px] font-medium text-slate-800"
                            title={preview.name}
                          >
                            {preview.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatAttachmentSize(preview.size)}
                          </p>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  {t("pos.order.noFilesAttached", "No files attached.")}
                </p>
              )}
              <Textarea
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={t("pos.order.optionalInternalNotes", "Optional internal notes")}
                rows={2}
                value={orderForm.notes}
              />
            </div>
          </div>

          {completionMode ? (
            <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/40 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                {t("pos.order.generateServiceInvoice", "Generate service invoice")}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  "pos.order.generateServiceInvoiceDesc",
                  "Add final replaced parts and labour above, then send invoice to fleet owner for completion confirmation.",
                )}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">{t("pos.order.serviceRequest", "Service request")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {completionRequestId || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">{t("pos.order.posOrder", "POS order")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {completionPosOrderId || orderForm.id || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs">
                  <p className="text-slate-500">{t("pos.order.invoiceTotal", "Invoice total")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatEuro(totals.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  disabled={isCompletionSubmitting}
                  onClick={submitCompletionInvoice}
                  type="button"
                >
                  {isCompletionSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("pos.order.submittingInvoice", "Submitting invoice...")}
                    </>
                  ) : (
                    t("pos.order.sendInvoiceToFleetOwner", "Send invoice to fleet owner")
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ${completionMode ? "" : "hidden"}`}
          >
              <h3 className="text-lg font-semibold text-slate-900">
              {t("pos.order.editOrderBeforeSubmission", "Edit order before submission")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t(
                "pos.order.editOrderBeforeSubmissionDesc",
                "Modify any details, parts, labour, files, then save as draft or submit.",
              )}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.partsTotal", "Parts total")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatEuro(totals.partsTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.labourTotal", "Labour total")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatEuro(totals.labourTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.orderTotal", "Order total")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatEuro(totals.total)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveDraft} type="button" variant="outline">
                {t("pos.order.saveDraft", "Save draft")}
              </Button>
              {!completionMode ? (
                <Button
                  className="h-[36px] w-[136px] rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  onClick={submitOrder}
                  type="button"
                >
                  {t("pos.order.submitOrder", "Submit order")}
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  applyAttachmentMeta([]);
                  setOrderForm(createInitialForm(selectedVehicle));
                  setSelectedDraftId("");
                  setActiveStep(0);
                  setFeedback(t("pos.order.formReset", "Form reset."));
                }}
                type="button"
                variant="secondary"
              >
                {t("pos.order.resetForm", "Reset form")}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
              {t("pos.order.checkedInVehiclesAndServices", "Checked-in vehicles and services")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("pos.order.checkedInVehiclesDesc", "Create orders from bookings that have already been checked in by POS.")}
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {checkedInRequests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  {t("pos.order.noCheckedInVehicles", "No checked-in vehicles waiting for order creation.")}
                </p>
              ) : (
                checkedInRequests.map((request) => {
                  const vehicleMatch = vehicles.find(
                    (item) => item.id === request.vehicleId,
                  );
                  return (
                    <div
                      key={request.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-800">
                        {request.vehicleId} - {request.serviceType}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {vehicleMatch?.plate ||
                          request.vehicleModel ||
                          t("common.vehicleNA", "Vehicle N/A")}{" "}
                        | {request.requestedBy}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {t("pos.order.checkIn", "Check-in")}:{" "}
                        {formatDateTime(
                          request.checkIn?.checkedInAt || request.updatedAt,
                        )}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          className="bg-sky-600 text-white hover:bg-sky-500"
                          onClick={() => loadCheckedInRequestIntoForm(request)}
                          size="sm"
                          type="button"
                        >
                          {t("pos.approval.createOrder", "Create Order")}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
              {t("pos.order.draftOrders", "Draft orders")}
              </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("pos.order.resumeDrafts", "Resume and edit saved drafts before submission.")}
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {posOrderState.draftOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  {t("pos.order.noDraftOrders", "No draft orders.")}
                </p>
              ) : (
                posOrderState.draftOrders.map((draft) => (
                  <div
                    key={draft.id}
                    className={`rounded-xl border p-3 text-xs ${
                      selectedDraftId === draft.id
                        ? "border-slate-400 bg-slate-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">
                      {draft.id} - {draft.serviceType}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {draft.vehiclePlate || draft.vehicleId || t("common.vehicleNA", "Vehicle N/A")} |
                      {" "}{t("pos.order.priority", "Priority")} {translatePriority(draft.priority)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        onClick={openOrderDetails(draft, "draft")}
                        size="sm"
                        type="button"
                        variant="secondary"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        {t("pos.order.view", "View")}
                      </Button>
                      <Button
                        onClick={() => loadDraftIntoForm(draft)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("pos.order.edit", "Edit")}
                      </Button>
                      <Button
                        onClick={onDeleteDraft(draft.id)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {t("pos.order.delete", "Delete")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
              {t("pos.order.duplicatePreviousOrder", "Duplicate previous order")}
              </h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("pos.order.cloneSubmittedOrders", "Clone submitted orders as new drafts.")}
            </p>
            <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
              {posOrderState.submittedOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  {t("pos.order.noSubmittedOrdersYet", "No submitted orders yet.")}
                </p>
              ) : (
                posOrderState.submittedOrders.slice(0, 8).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <p className="font-semibold text-slate-800">
                      {order.id} - {order.serviceType}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {order.vehiclePlate || order.vehicleId || t("common.vehicleNA", "Vehicle N/A")} |{" "}
                      {formatEuro(order.total)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        onClick={openOrderDetails(order, "submitted")}
                        size="sm"
                        type="button"
                        variant="secondary"
                        className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      >
                        {t("pos.order.view", "View")}
                      </Button>
                      <Button
                        onClick={onDuplicateSubmittedOrder(order.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("pos.order.duplicate", "Duplicate")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {feedback}
            </div>
          ) : null}
        </div>
      </div>

      {isCompletionSubmitting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-2xl">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {t("pos.order.sendingInvoice", "Sending invoice...")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t("pos.order.preparingBillingLines", "Preparing billing lines and sharing with fleet owner.")}
            </p>
          </div>
        </div>
      ) : null}

      {completionPopup.open ? (
        <div className="fixed inset-0 z-[61] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <p className="text-lg font-semibold text-slate-900">
              {completionPopup.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {completionPopup.detail}
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.invoiceId", "Invoice ID")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.invoiceId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.requestId", "Request ID")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.requestId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.vehicle", "Vehicle")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.vehicleId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.service", "Service")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completionPopup.serviceType || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.lines", "Lines")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {t("pos.order.parts", "Parts")} {completionPopup.partsCount} • {t("pos.order.labour", "Labour")}{" "}
                  {completionPopup.labourCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {t("pos.order.invoiceTotal", "Invoice total")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(completionPopup.total)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {completionPopup.status} •{" "}
                  {formatDateTime(completionPopup.invoiceDate)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                {t("pos.order.redirectingToApprovalDetails", "Redirecting to approval details...")}
              </p>
              <Button
                onClick={() => {
                  if (completionPopupTimeoutRef.current) {
                    window.clearTimeout(completionPopupTimeoutRef.current);
                  }
                  goToCompletionDetails(
                    completionPopup.requestId,
                    completionPopup.posOrderId,
                  );
                }}
                size="sm"
                type="button"
              >
                {t("pos.order.openDetailsNow", "Open details now")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsModal.open && modalOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={closeOrderDetails}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("pos.order.orderDetails", "Order details")}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {modalOrder.id} - {modalOrder.serviceType}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {modalOrder.vehiclePlate ||
                    modalOrder.vehicleId ||
                    t("common.vehicleNA", "Vehicle N/A")}{" "}
                  |{" "}
                  {detailsModal.source === "draft"
                    ? t("pos.order.draftOrder", "Draft order")
                    : t("pos.order.submittedOrder", "Submitted order")}
                </p>
              </div>
              <button
                aria-label={t("pos.order.closeDetails", "Close details")}
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                onClick={closeOrderDetails}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.priority", "Priority")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {modalOrder.priority}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.partsTotal", "Parts total")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.partsTotal || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.labourTotal", "Labour total")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.labourTotal || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-slate-500">{t("pos.order.orderTotal", "Order total")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatEuro(modalOrder.total || 0)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("pos.order.coreDetails", "Core details")}
                </h4>
                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p>
                    {t("pos.order.serviceType", "Service type")}:{" "}
                    <span className="font-semibold">
                      {modalOrder.serviceType || t("common.notAvailable", "N/A")}
                    </span>
                  </p>
                  <p>
                    {t("pos.order.problemType", "Problem type")}:{" "}
                    <span className="font-semibold">
                      {modalOrder.problemType || t("common.notAvailable", "N/A")}
                    </span>
                  </p>
                  <p>
                    {t("pos.order.created", "Created")}:{" "}
                    <span className="font-semibold">
                      {formatDateTime(modalOrder.createdAt)}
                    </span>
                  </p>
                  <p>
                    {t("pos.order.updated", "Updated")}:{" "}
                    <span className="font-semibold">
                      {formatDateTime(modalOrder.updatedAt)}
                    </span>
                  </p>
                  <p>
                    {t("pos.order.submitted", "Submitted")}:{" "}
                    <span className="font-semibold">
                      {formatDateTime(modalOrder.submittedAt)}
                    </span>
                  </p>
                  <p>
                    {t("pos.order.submittedBy", "Submitted by")}:{" "}
                    <span className="font-semibold">
                      {modalOrder.submittedBy || t("common.notAvailable", "N/A")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText size={14} />
                  {t("pos.order.descriptionAndNotes", "Description and notes")}
                </h4>
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {modalOrder.description || t("pos.order.noDescriptionProvided", "No description provided.")}
                </p>
                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {modalOrder.notes || t("pos.order.noInternalNotes", "No internal notes.")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("pos.order.partsItems", "Parts items")}
                </h4>
                <div className="card-list-scrollbar mt-3 max-h-[14rem] space-y-2 overflow-y-auto pr-1">
                  {modalParts.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                      {t("pos.order.noPartsItems", "No parts items.")}
                    </p>
                  ) : (
                    modalParts.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                        key={item.id}
                      >
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-slate-600">
                          {t("pos.order.qtyShort", "Qty")} {item.qty} x {formatEuro(item.unitCost)}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatEuro(item.total)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  {t("pos.order.labourItems", "Labour items")}
                </h4>
                <div className="card-list-scrollbar mt-3 max-h-[14rem] space-y-2 overflow-y-auto pr-1">
                  {modalLabour.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                      {t("pos.order.noLabourItems", "No labour items.")}
                    </p>
                  ) : (
                    modalLabour.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                        key={item.id}
                      >
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-slate-600">
                          {item.hours} hr x {formatEuro(item.rate)}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatEuro(item.total)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-900">
                  {t("pos.order.attachments", "Attachments")}
              </h4>
              <div className="card-list-scrollbar mt-3 max-h-[10rem] space-y-2 overflow-y-auto pr-1">
                {modalAttachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    {t("pos.order.noAttachmentsAdded", "No attachments added.")}
                  </p>
                ) : (
                  modalAttachments.map((file) => (
                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                      key={`${file.name}-${file.size}`}
                    >
                      {file.name} (
                      {Math.max(1, Math.round(Number(file.size || 0) / 1024))}{" "}
                      KB)
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {detailsModal.source === "draft" ? (
                <Button onClick={loadDraftFromModal} type="button">
                  {t("pos.order.edit", "Edit")}
                </Button>
              ) : (
                <Button onClick={duplicateFromModal} type="button">
                  {t("pos.order.duplicateAsDraft", "Duplicate as draft")}
                </Button>
              )}
              <Button
                onClick={closeOrderDetails}
                type="button"
                variant="outline"
              >
                {t("pos.order.close", "Close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default POSOrderManagement;
