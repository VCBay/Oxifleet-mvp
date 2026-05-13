import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  FileUp,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Truck,
  User,
  Users,
  Van,
  Wrench,
  X,
} from "lucide-react";
import { clearSession, getSession } from "../auth/session";
import Logo from "../icons/Logo";
import OxifleetEmblemWhite from "../icons/Oxifleet-Emblem-White.svg";
import VehicleManagement from "../components/VehicleManagement";
import VehiclePolicyManagement from "../components/VehiclePolicyManagement";
import ServiceOrderControl from "../components/ServiceOrderControl";
import BillingFinanceControl from "../components/BillingFinanceControl";
import ReportingAnalyticsControl from "../components/ReportingAnalyticsControl";
import CommunicationControl from "../components/CommunicationControl";
import TeamAccessControl from "../components/TeamAccessControl";
import SettingsProfileControl from "../components/SettingsProfileControl";
import DriverManagement from "../components/DriverManagement";
import FleetTopbar from "../components/fleet/FleetTopbar";
import SectionLoadingCardStack from "../components/common/SectionLoadingCardStack";
import { Button } from "../components/ui/button";
import { useTranslation } from "../i18n/useTranslation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  addVehicle,
  getVehicleState,
  setVehiclesFromApi,
  subscribeVehicles,
  updateVehicle as updateVehicleStore,
  upsertVehicles,
} from "../data/vehicleStore";
import {
  addDriver,
  getDriverState,
  removeDriver,
  setDriversFromApi,
  subscribeDrivers,
  updateDriver as updateDriverStore,
} from "../data/driverStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
import {
  getCommunicationState,
  subscribeCommunication,
} from "../data/communicationStore";
import {
  getBillingFinanceState,
  subscribeBillingFinance,
} from "../data/billingFinanceStore";
import { figmaChartCardStyle, figmaChartTheme } from "../lib/chartTheme";
import {
  bulkUpsertFleetVehiclesApi,
  createFleetVehicleApi,
  listFleetVehiclesApi,
  updateFleetVehicleByVinApi,
} from "../services/fleetVehicleApi";
import {
  createFleetDriverApi,
  deleteFleetDriverByServerIdApi,
  listFleetDriversApi,
  updateFleetDriverByServerIdApi,
} from "../services/fleetDriverApi";

const fleetMenuRouteMap = {
  dashboard: "overview",
  vehicles: "vehicles",
  drivers: "drivers",
  vehicle_policy: "vehicle-policy",
  service_order_control: "service-order-control",
  billing_finance: "billing-finance",
  reporting_analytics: "reporting-analytics",
  communication: "communication",
  team_access_control: "team-access-control",
  settings_profile: "settings-profile",
};

const parseFleetMenuFromPath = (pathname) => {
  const cleaned = String(pathname || "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  const section = parts[1] || fleetMenuRouteMap.dashboard;
  const matched = Object.entries(fleetMenuRouteMap).find(
    ([, route]) => route === section,
  );
  return matched ? matched[0] : "dashboard";
};

const renderFleetSpendTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const spend = Number(payload[0]?.value) || 0;
  const vehicleCount = Number(payload[0]?.payload?.vehicleCount) || 0;
  return (
    <div
      className="min-w-[200px] rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.16em]"
        style={{ color: figmaChartTheme.tooltipLabel }}
      >
        Cost per car
      </p>
      <p
        className="mt-1 text-sm font-semibold"
        style={{ color: figmaChartTheme.tooltipTitle }}
      >
        {label}
      </p>
      <div
        className="mt-2 rounded-md px-2.5 py-2"
        style={{ border: `0.5px solid ${figmaChartTheme.tooltipBorder}` }}
      >
        <p
          className="text-[10px] uppercase tracking-wide"
          style={{ color: figmaChartTheme.tooltipLabel }}
        >
          Average cost
        </p>
        <p
          className="mt-1 text-sm font-semibold"
          style={{ color: figmaChartTheme.tooltipValue }}
        >
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(spend)}
        </p>
        <p
          className="mt-1 text-[10px]"
          style={{ color: figmaChartTheme.tooltipLabel }}
        >
          {vehicleCount} active vehicles
        </p>
      </div>
    </div>
  );
};

const renderFleetVehicleCostTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const total = Number(payload[0]?.value) || 0;
  const requests = Number(payload[0]?.payload?.requestCount) || 0;

  return (
    <div
      className="min-w-[164px] rounded-md px-3 py-2 shadow-xl backdrop-blur-sm"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p
        className="text-xs font-semibold"
        style={{ color: figmaChartTheme.tooltipTitle }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-sm font-semibold"
        style={{ color: figmaChartTheme.tooltipValue }}
      >
        {new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(total)}
      </p>
      <p
        className="mt-1 text-[10px]"
        style={{ color: figmaChartTheme.tooltipLabel }}
      >
        {requests} requests in selected period
      </p>
    </div>
  );
};

const formatFleetAxisEuro = (value) => {
  const amount = Number(value) || 0;
  const absolute = Math.abs(amount);
  if (absolute >= 1000000) {
    const scaled = amount / 1000000;
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}M`;
  }
  if (absolute >= 1000) {
    const scaled = amount / 1000;
    return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}k`;
  }
  if (Math.abs(amount) >= 10) {
    return `${Math.round(amount)}`;
  }
  if (Math.abs(amount) >= 1) {
    return `${amount.toFixed(1)}`;
  }
  return `${amount.toFixed(2)}`;
};

const buildFleetAxisTicks = (values = []) => {
  const numericValues = values
    .map((value) => Number(value) || 0)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;

  if (maxValue <= 0) {
    return { domainMax: 4, ticks: [0, 1, 2, 3, 4] };
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalizedStep = roughStep / magnitude;
  let niceStep = magnitude;

  if (normalizedStep <= 1) {
    niceStep = magnitude;
  } else if (normalizedStep <= 2) {
    niceStep = 2 * magnitude;
  } else if (normalizedStep <= 5) {
    niceStep = 5 * magnitude;
  } else {
    niceStep = 10 * magnitude;
  }

  if (maxValue < 10) {
    niceStep = Math.max(0.5, Math.ceil(roughStep * 2) / 2);
  }
  if (maxValue < 2) {
    niceStep = 0.25;
  }

  const domainMax = Math.max(niceStep * 4, maxValue);
  const ticks = Array.from({ length: 5 }, (_, index) =>
    Number((index * niceStep).toFixed(2)),
  );

  return { domainMax, ticks };
};

const renderFleetOemTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const rows = payload
    .filter((item) => Number.isFinite(Number(item.value)))
    .map((item) => ({
      label: String(item.name || item.dataKey || ""),
      value: Number(item.value) || 0,
      color: item.color || item.fill || "#334155",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div
      className="min-w-[220px] rounded-xl px-3 py-3 shadow-xl backdrop-blur-sm"
      style={{
        background: figmaChartTheme.tooltipBackground,
        border: `0.5px solid ${figmaChartTheme.tooltipBorder}`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.16em]"
        style={{ color: figmaChartTheme.tooltipLabel }}
      >
        OEM business
      </p>
      <p
        className="mt-1 text-sm font-semibold"
        style={{ color: figmaChartTheme.tooltipTitle }}
      >
        {label}
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg px-2.5 py-2"
            style={{ border: `0.5px solid ${figmaChartTheme.tooltipBorder}` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: figmaChartTheme.tooltipTitle }}
              >
                {row.label}
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: figmaChartTheme.tooltipValue }}
            >
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const fleetKpiTone = (status) => {
  if (status === "good") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "warn") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

const classifyFleetVehicleType = ({
  model = "",
  type = "",
  category = "",
} = {}) => {
  const source = `${model} ${type} ${category}`.toLowerCase();
  if (
    source.includes("eqs") ||
    source.includes("ora funky cat") ||
    source.includes("electric") ||
    source.includes("ev")
  ) {
    return "ev";
  }
  if (
    source.includes("van") ||
    source.includes("bus") ||
    source.includes("transporter") ||
    source.includes("kastenwagen") ||
    source.includes("utility") ||
    source.includes("anhänger")
  ) {
    return "lcv";
  }
  if (
    source.includes("suv") ||
    source.includes("kombi") ||
    source.includes("kleinwagen") ||
    source.includes("lim") ||
    source.includes("car")
  ) {
    return "pkw";
  }
  return "ice";
};

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSession();
  const vehicleState = useSyncExternalStore(
    subscribeVehicles,
    getVehicleState,
    getVehicleState,
  );
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState,
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState,
  );
  const communicationState = useSyncExternalStore(
    subscribeCommunication,
    getCommunicationState,
    getCommunicationState,
  );
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState,
  );
  const totalVehicles =
    vehicleState.baseVehicleCount + vehicleState.vehicles.length;
  const totalDrivers = driverState.baseDriverCount + driverState.drivers.length;
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleApiLoading, setVehicleApiLoading] = useState(false);
  const [vehicleApiError, setVehicleApiError] = useState("");
  const [driverApiLoading, setDriverApiLoading] = useState(false);
  const [driverApiError, setDriverApiError] = useState("");
  const [vehicleForm, setVehicleForm] = useState({
    id: "",
    model: "",
    plate: "",
    type: "Truck",
    status: "Active",
    notes: "",
  });
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const fleetVehiclesLoadedRef = useRef(false);
  const fleetDriversLoadedRef = useRef(false);
  const [clearedFleetNotificationIds, setClearedFleetNotificationIds] =
    useState([]);
  const activeMenu = parseFleetMenuFromPath(location.pathname);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [selectedDashboardPeriod, setSelectedDashboardPeriod] = useState("90");
  const [selectedCostTrendHorizon, setSelectedCostTrendHorizon] =
    useState("12m");
  const [selectedCostTrendVehicleType, setSelectedCostTrendVehicleType] =
    useState("all");
  const activePageTitle = t(
    `fleet.menu.${activeMenu}`,
    activeMenu === "dashboard" ? "Dashboard" : activeMenu,
  );
  const [driverForm, setDriverForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    license: "",
    status: "Active",
    notes: "",
  });
  const isVehicleReady =
    vehicleForm.id.trim().length > 0 &&
    vehicleForm.model.trim().length > 0 &&
    vehicleForm.plate.trim().length > 0;
  const isDriverReady =
    driverForm.name.trim().length > 0 && driverForm.email.trim().length > 0;
  const dashboardUpdatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const formatEuro = (value) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  useEffect(() => {
    if (fleetVehiclesLoadedRef.current) return;
    fleetVehiclesLoadedRef.current = true;

    const loadFleetVehicles = async () => {
      setVehicleApiLoading(true);
      setVehicleApiError("");
      try {
        const userFleetId = String(user?.fleet_id || "").trim();
        const rows = await listFleetVehiclesApi(
          userFleetId ? { fleetId: userFleetId } : {},
        );

        const scopedRows = userFleetId
          ? rows.filter(
              (vehicle) => String(vehicle?.fleetId || "").trim() === userFleetId,
            )
          : rows;

        setVehiclesFromApi(scopedRows);
      } catch (error) {
        setVehicleApiError(
          error?.message || "Unable to load vehicles from backend. Showing local data.",
        );
      } finally {
        setVehicleApiLoading(false);
      }
    };

    loadFleetVehicles();
  }, [user?.fleet_id]);

  useEffect(() => {
    if (fleetDriversLoadedRef.current) return;
    fleetDriversLoadedRef.current = true;

    const loadFleetDrivers = async () => {
      setDriverApiLoading(true);
      setDriverApiError("");
      try {
        const rows = await listFleetDriversApi();
        setDriversFromApi(rows);
      } catch (error) {
        setDriverApiError(
          error?.message || "Unable to load drivers from backend. Showing local data.",
        );
      } finally {
        setDriverApiLoading(false);
      }
    };

    loadFleetDrivers();
  }, []);

  const dashboardPeriodOptions = [
    { value: "30", label: t("fleet.dashboard.last30Days", "Last 30 days") },
    { value: "90", label: t("fleet.dashboard.last90Days", "Last 90 days") },
    { value: "180", label: t("fleet.dashboard.last180Days", "Last 180 days") },
    { value: "365", label: t("fleet.dashboard.last365Days", "Last 365 days") },
  ];
  const costTrendHorizonOptions = [
    { value: "90d", label: t("fleet.dashboard.last90Days", "Last 90 days") },
    { value: "180d", label: t("fleet.dashboard.last180Days", "Last 180 days") },
    { value: "365d", label: t("fleet.dashboard.last365Days", "Last 365 days") },
    {
      value: "12m",
      label: t("fleet.dashboard.last12Months", "Last 12 months"),
    },
    {
      value: "24m",
      label: t("fleet.dashboard.last24Months", "Last 24 months"),
    },
  ];
  const vehicleTypeFilterOptions = [
    { value: "all", label: t("fleet.dashboard.allVehicles", "All vehicles") },
    { value: "ev", label: t("fleet.dashboard.ev", "EV") },
    { value: "pkw", label: t("fleet.dashboard.pkw", "PKW") },
    { value: "ice", label: t("fleet.dashboard.ice", "ICE") },
    { value: "lcv", label: t("fleet.dashboard.lcv", "LCV") },
  ];

  const dashboardAnalytics = useMemo(() => {
    const now = Date.now();
    const days = Number(selectedDashboardPeriod) || 90;
    const threshold = now - days * 24 * 60 * 60 * 1000;
    const nowDate = new Date();
    const parsedTrendValue = Number.parseInt(selectedCostTrendHorizon, 10);
    const trendUnit = String(selectedCostTrendHorizon || "").endsWith("d")
      ? "days"
      : "months";
    const costTrendMonths =
      trendUnit === "days"
        ? Math.max(3, Math.ceil((parsedTrendValue || 365) / 30))
        : Math.max(3, parsedTrendValue || 12);
    const historicalStart =
      trendUnit === "days"
        ? now - (parsedTrendValue || 365) * 24 * 60 * 60 * 1000
        : new Date(
            nowDate.getFullYear(),
            nowDate.getMonth() - (costTrendMonths - 1),
            1,
          ).getTime();
    const parseTime = (value) => {
      const time = new Date(value || 0).getTime();
      return Number.isFinite(time) ? time : 0;
    };
    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const parseMoney = (value) => {
      const normalized = String(value || "").replace(/[^0-9.-]/g, "");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const allInvoices = Array.isArray(billingState.invoices)
      ? billingState.invoices
      : [];
    const allOrders = Array.isArray(serviceOrderState.orders)
      ? serviceOrderState.orders
      : [];
    const vehiclesById = new Map(
      (Array.isArray(vehicleState.vehicles) ? vehicleState.vehicles : []).map(
        (vehicle) => [vehicle.id, vehicle],
      ),
    );
    const filteredVehicles = [...vehiclesById.values()].filter((vehicle) =>
      selectedCostTrendVehicleType === "all"
        ? true
        : classifyFleetVehicleType({
            model: vehicle?.model,
            type: vehicle?.type,
            category: vehicle?.category,
          }) === selectedCostTrendVehicleType,
    );
    const filteredVehicleCount = Math.max(filteredVehicles.length, 1);
    const matchesVehicleTypeFilter = ({
      vehicleId,
      vehicleModel = "",
      vehicleType = "",
    }) => {
      if (selectedCostTrendVehicleType === "all") {
        return true;
      }
      const vehicle = vehiclesById.get(String(vehicleId || "").trim());
      return (
        classifyFleetVehicleType({
          model: vehicle?.model || vehicleModel,
          type: vehicle?.type || vehicleType,
          category: vehicle?.category || vehicleType,
        }) === selectedCostTrendVehicleType
      );
    };
    const invoiceSet = allInvoices.filter(
      (invoice) => parseTime(invoice.date) >= threshold,
    );
    const orderSet = allOrders.filter(
      (order) =>
        parseTime(
          order.appointment?.dateTime || order.updatedAt || order.requestedAt,
        ) >= threshold,
    );
    const invoices = invoiceSet.length > 0 ? invoiceSet : allInvoices;
    const orders = orderSet.length > 0 ? orderSet : allOrders;

    const totalSpend = invoices.reduce(
      (sum, invoice) => sum + (Number(invoice.totalAmount) || 0),
      0,
    );
    const pendingInvoiceStatuses = new Set(["processing", "unpaid"]);
    const invoicesAwaitingReview = invoices
      .filter((invoice) =>
        pendingInvoiceStatuses.has(normalize(invoice.status)),
      )
      .reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
    const openStatuses = [
      "pending",
      "approved",
      "scheduled",
      "checked in",
      "in progress",
      "invoice processing",
      "re-submitted",
    ];
    const openRequests = orders.filter((order) =>
      openStatuses.some((status) => normalize(order.status).includes(status)),
    );
    const activeDriversWithRequests = new Set(
      orders
        .map((order) => String(order.requestedBy || "").trim())
        .filter(Boolean),
    ).size;

    const historicalBuckets = Array.from(
      { length: costTrendMonths },
      (_, index) => {
        const bucketDate = new Date(
          nowDate.getFullYear(),
          nowDate.getMonth() - (costTrendMonths - 1 - index),
          1,
        );
        return {
          label: bucketDate.toLocaleString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
          spend: 0,
          vehicleIds: new Set(),
          start: bucketDate.getTime(),
          end: new Date(
            bucketDate.getFullYear(),
            bucketDate.getMonth() + 1,
            1,
          ).getTime(),
        };
      },
    );

    const addHistoricalCost = (timestamp, amount, vehicleId) => {
      if (!timestamp || amount <= 0 || timestamp < historicalStart) {
        return;
      }
      const bucket = historicalBuckets.find(
        (entry) => timestamp >= entry.start && timestamp < entry.end,
      );
      if (!bucket) {
        return;
      }
      bucket.spend += amount;
      if (vehicleId) {
        bucket.vehicleIds.add(String(vehicleId).trim());
      }
    };

    allInvoices.forEach((invoice) => {
      if (
        !matchesVehicleTypeFilter({
          vehicleId: invoice.vehicleId,
          vehicleModel: invoice.vehicleModel,
        })
      ) {
        return;
      }
      addHistoricalCost(
        parseTime(invoice.date),
        Number(invoice.totalAmount) || 0,
        invoice.vehicleId,
      );
    });

    allOrders.forEach((order) => {
      const status = normalize(order.status);
      const isStillOpen =
        !status.includes("completed") &&
        !status.includes("paid") &&
        !status.includes("invoice processing");
      if (
        !isStillOpen ||
        !matchesVehicleTypeFilter({
          vehicleId: order.vehicleId,
          vehicleModel: order.vehicleModel,
        })
      ) {
        return;
      }
      addHistoricalCost(
        parseTime(order.updatedAt || order.requestedAt),
        parseMoney(order.orderDetails?.estimatedCost),
        order.vehicleId,
      );
    });

    const historicalNonZero = historicalBuckets.filter(
      (entry) => entry.spend > 0,
    );
    if (historicalNonZero.length === 0) {
      const seededBasePerCar =
        selectedCostTrendVehicleType === "ev"
          ? 420
          : selectedCostTrendVehicleType === "pkw"
            ? 280
            : selectedCostTrendVehicleType === "lcv"
              ? 360
              : selectedCostTrendVehicleType === "ice"
                ? 330
                : 310;
      const seedCurve = [
        0.82, 0.9, 0.95, 1.04, 0.97, 1.08, 1.12, 0.93, 0.88, 1.01, 1.06, 0.98,
      ];
      historicalBuckets.forEach((entry, index) => {
        entry.vehicleIds = new Set(
          filteredVehicles.length > 0
            ? filteredVehicles.map((vehicle) => vehicle.id)
            : Array.from(
                { length: filteredVehicleCount },
                (_, number) => `seed-${number}`,
              ),
        );
        entry.spend = Math.round(
          seededBasePerCar *
            filteredVehicleCount *
            seedCurve[index % seedCurve.length] *
            (0.92 + index / Math.max(historicalBuckets.length * 10, 1)),
        );
      });
    } else if (historicalNonZero.length < historicalBuckets.length) {
      const baseAverage =
        historicalNonZero.reduce(
          (sum, entry) =>
            sum + entry.spend / Math.max(entry.vehicleIds.size || 1, 1),
          0,
        ) / historicalNonZero.length;
      const seedCurve = [
        0.82, 0.9, 0.95, 1.04, 0.97, 1.08, 1.12, 0.93, 0.88, 1.01, 1.06, 0.98,
      ];
      historicalBuckets.forEach((entry, index) => {
        if (entry.spend > 0) {
          return;
        }
        const fallbackVehicleCount =
          selectedCostTrendVehicleType === "all"
            ? Math.max(filteredVehicleCount, 3)
            : Math.max(filteredVehicleCount, 1);
        entry.vehicleIds = new Set(
          filteredVehicles.length > 0
            ? filteredVehicles.map((vehicle) => vehicle.id)
            : Array.from(
                { length: fallbackVehicleCount },
                (_, number) => `seed-${number}`,
              ),
        );
        const recencyLift =
          0.9 + index / Math.max(historicalBuckets.length * 16, 1);
        entry.spend = Math.round(
          baseAverage *
            fallbackVehicleCount *
            seedCurve[index % seedCurve.length] *
            recencyLift,
        );
      });
    }

    if (historicalBuckets.length > 1) {
      const latestBucket = historicalBuckets[historicalBuckets.length - 1];
      const previousBucket = historicalBuckets[historicalBuckets.length - 2];
      const latestPerCar =
        latestBucket.vehicleIds.size > 0
          ? latestBucket.spend / latestBucket.vehicleIds.size
          : 0;
      const previousPerCar =
        previousBucket.vehicleIds.size > 0
          ? previousBucket.spend / previousBucket.vehicleIds.size
          : 0;

      if (previousPerCar > 0 && latestPerCar > previousPerCar * 1.18) {
        latestBucket.spend = Math.round(
          previousPerCar * 1.12 * Math.max(latestBucket.vehicleIds.size, 1),
        );
      }
    }

    const costPerCarTrend = historicalBuckets.map((entry) => ({
      label: entry.label,
      spend:
        entry.vehicleIds.size > 0
          ? Math.round(entry.spend / entry.vehicleIds.size)
          : 0,
      vehicleCount: entry.vehicleIds.size,
    }));

    const currentMonthBucket = historicalBuckets[historicalBuckets.length - 1];
    const ytdBuckets = historicalBuckets.filter((entry) => {
      const date = new Date(entry.start);
      return date.getFullYear() === nowDate.getFullYear();
    });
    const currentMonthCostPerCar =
      currentMonthBucket && currentMonthBucket.vehicleIds.size > 0
        ? currentMonthBucket.spend / currentMonthBucket.vehicleIds.size
        : 0;
    const ytdPerCarValues = ytdBuckets
      .map((entry) =>
        entry.vehicleIds.size > 0 ? entry.spend / entry.vehicleIds.size : 0,
      )
      .filter((value) => Number.isFinite(value) && value > 0);
    const ytdCostPerCar =
      ytdPerCarValues.length > 0
        ? ytdPerCarValues.reduce((sum, value) => sum + value, 0) /
          ytdPerCarValues.length
        : 0;

    const oemShares = [
      {
        key: "continental",
        label: t("fleet.dashboard.oemContinental", "Continental"),
        share: 0.24,
      },
      {
        key: "michelin",
        label: t("fleet.dashboard.oemMichelin", "Michelin"),
        share: 0.21,
      },
      {
        key: "bridgestone",
        label: t("fleet.dashboard.oemBridgestone", "Bridgestone"),
        share: 0.18,
      },
      {
        key: "goodyear",
        label: t("fleet.dashboard.oemGoodyear", "Goodyear"),
        share: 0.19,
      },
      {
        key: "uniroyal",
        label: t("fleet.dashboard.oemUniroyal", "Uniroyal"),
        share: 0.18,
      },
    ];

    const oemBusinessTrend = historicalBuckets.slice(-6).map((entry, index) => {
      const row = { label: entry.label };
      const seasonalCurve = [0.96, 1.02, 0.94, 1.06, 0.98, 1.04];
      const monthLabel = String(entry.label || "");
      const lateWinterLift = monthLabel.includes("Feb 26")
        ? 1.35
        : monthLabel.includes("Mar 26")
          ? 1.48
          : 1;
      oemShares.forEach((oem, oemIndex) => {
        const oemBias = 0.92 + oemIndex * 0.04;
        row[oem.key] = Math.round(
          entry.spend *
            oem.share *
            seasonalCurve[index % seasonalCurve.length] *
            oemBias *
            lateWinterLift,
        );
      });
      return row;
    });

    oemShares.forEach((oem) => {
      for (let index = 1; index < oemBusinessTrend.length; index += 1) {
        const current = oemBusinessTrend[index];
        const previous = oemBusinessTrend[index - 1];
        const previousValue = Number(previous?.[oem.key]) || 0;
        const currentValue = Number(current?.[oem.key]) || 0;
        const label = String(current?.label || "");
        const minimumRatio = label.includes("Feb 26")
          ? 0.82
          : label.includes("Mar 26")
            ? 0.88
            : 0.7;

        if (previousValue > 0 && currentValue < previousValue * minimumRatio) {
          current[oem.key] = Math.round(previousValue * minimumRatio);
        }
      }
    });

    const bucketSizeDays =
      days <= 30 ? 5 : days <= 90 ? 10 : days <= 180 ? 30 : 60;
    const bucketSizeMs = bucketSizeDays * 24 * 60 * 60 * 1000;
    const bucketCount = Math.max(4, Math.ceil(days / bucketSizeDays));
    const spendTrend = Array.from({ length: bucketCount }, (_, index) => {
      const start = threshold + index * bucketSizeMs;
      const end = Math.min(start + bucketSizeMs, now + 1);
      const labelDate = new Date(start);
      return {
        label:
          bucketSizeDays >= 30
            ? labelDate.toLocaleString("en-US", { month: "short" })
            : labelDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              }),
        spend: 0,
        start,
        end,
      };
    });

    const addSpendToBuckets = (timestamp, amount) => {
      if (!timestamp || amount <= 0) {
        return;
      }
      const bucket = spendTrend.find(
        (entry) => timestamp >= entry.start && timestamp < entry.end,
      );
      if (bucket) {
        bucket.spend += amount;
      }
    };

    invoices.forEach((invoice) => {
      addSpendToBuckets(
        parseTime(invoice.date),
        Number(invoice.totalAmount) || 0,
      );
    });

    orders.forEach((order) => {
      const status = normalize(order.status);
      const isStillOpen =
        !status.includes("completed") &&
        !status.includes("paid") &&
        !status.includes("invoice processing");
      if (!isStillOpen) {
        return;
      }
      addSpendToBuckets(
        parseTime(order.updatedAt || order.requestedAt),
        parseMoney(order.orderDetails?.estimatedCost),
      );
    });

    const hasAnySpend = spendTrend.some((entry) => entry.spend > 0);
    if (!hasAnySpend && invoices.length > 0) {
      invoices.forEach((invoice, index) => {
        const fallbackBucket = spendTrend[index % spendTrend.length];
        fallbackBucket.spend += Number(invoice.totalAmount) || 0;
      });
    }

    const nonZeroBuckets = spendTrend.filter((entry) => entry.spend > 0);
    if (
      nonZeroBuckets.length > 0 &&
      nonZeroBuckets.length < spendTrend.length
    ) {
      const knownAverage =
        nonZeroBuckets.reduce((sum, entry) => sum + entry.spend, 0) /
        nonZeroBuckets.length;
      const seedCurve = [0.72, 0.84, 0.93, 1.02, 0.96, 1.08, 0.9, 1.12];

      spendTrend.forEach((entry, index) => {
        if (entry.spend > 0) {
          return;
        }
        const curveFactor = seedCurve[index % seedCurve.length];
        const recencyFactor =
          0.88 + (index / Math.max(spendTrend.length - 1, 1)) * 0.22;
        entry.spend = Math.round(knownAverage * curveFactor * recencyFactor);
      });
    }

    const vehicleMap = new Map();
    invoices.forEach((invoice) => {
      const key = String(invoice.vehicleId || "N/A").trim();
      const current = vehicleMap.get(key) || {
        id: key,
        model: invoice.vehicleModel || key,
        total: 0,
        requestCount: 0,
        latestDate: invoice.date,
      };
      current.total += Number(invoice.totalAmount) || 0;
      current.requestCount += 1;
      current.latestDate =
        parseTime(invoice.date) > parseTime(current.latestDate)
          ? invoice.date
          : current.latestDate;
      vehicleMap.set(key, current);
    });
    const mostCostlyVehicles = [...vehicleMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const driverMap = new Map();
    orders.forEach((order) => {
      const key =
        String(order.requestedBy || "Unassigned").trim() || "Unassigned";
      const current = driverMap.get(key) || {
        name: key,
        requests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
      current.requests += 1;
      const status = normalize(order.status);
      if (status.includes("rejected")) {
        current.rejected += 1;
      } else if (
        status.includes("approved") ||
        status.includes("scheduled") ||
        status.includes("checked in") ||
        status.includes("in progress") ||
        status.includes("completed") ||
        status.includes("invoice processing")
      ) {
        current.approved += 1;
      } else {
        current.pending += 1;
      }
      driverMap.set(key, current);
    });
    const requestsByDriver = [...driverMap.values()]
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 6);

    const invoicesRequiringAction = invoices
      .filter((invoice) =>
        pendingInvoiceStatuses.has(normalize(invoice.status)),
      )
      .sort((a, b) => parseTime(b.date) - parseTime(a.date))
      .slice(0, 6);

    const activeServiceRequests = openRequests
      .sort(
        (a, b) =>
          parseTime(b.appointment?.dateTime || b.updatedAt || b.requestedAt) -
          parseTime(a.appointment?.dateTime || a.updatedAt || a.requestedAt),
      )
      .slice(0, 6)
      .map((order) => ({
        id: order.id,
        model: order.vehicleModel,
        vehicleId: order.vehicleId,
        requestTitle: order.requestTitle,
        requestedBy: order.requestedBy,
        date: new Date(
          order.appointment?.dateTime || order.updatedAt || order.requestedAt,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        status: order.status,
      }));

    const financialSnapshot = [
      {
        key: "paid",
        label: t("fleet.dashboard.paidInvoices", "Paid invoices"),
        amount: invoices
          .filter((invoice) => normalize(invoice.status) === "paid")
          .reduce(
            (sum, invoice) => sum + (Number(invoice.totalAmount) || 0),
            0,
          ),
        tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
      },
      {
        key: "processing",
        label: t("fleet.dashboard.processingInvoices", "Processing"),
        amount: invoices
          .filter((invoice) => normalize(invoice.status) === "processing")
          .reduce(
            (sum, invoice) => sum + (Number(invoice.totalAmount) || 0),
            0,
          ),
        tone: "bg-amber-50 text-amber-700 border-amber-100",
      },
      {
        key: "unpaid",
        label: t("fleet.dashboard.unpaidInvoices", "Unpaid"),
        amount: invoices
          .filter((invoice) => normalize(invoice.status) === "unpaid")
          .reduce(
            (sum, invoice) => sum + (Number(invoice.totalAmount) || 0),
            0,
          ),
        tone: "bg-rose-50 text-rose-700 border-rose-100",
      },
    ];

    return {
      invoices,
      orders,
      totalSpend,
      invoicesAwaitingReview,
      openRequests,
      activeDriversWithRequests,
      avgCostPerRequest:
        orders.length > 0 ? totalSpend / orders.length : totalSpend,
      spendTrend,
      mostCostlyVehicles,
      requestsByDriver,
      invoicesRequiringAction,
      activeServiceRequests,
      financialSnapshot,
      costPerCarTrend,
      currentMonthCostPerCar,
      ytdCostPerCar,
      oemBusinessTrend,
      contractBusinessStatus: "green",
      estimatedCashbackYtd: 5500,
    };
  }, [
    billingState.invoices,
    selectedDashboardPeriod,
    selectedCostTrendHorizon,
    selectedCostTrendVehicleType,
    serviceOrderState.orders,
    t,
    totalVehicles,
    vehicleState.vehicles,
  ]);

  const dashboardSummaryCards = [
    {
      kind: "status",
      title: t(
        "fleet.dashboard.contractBusinessOverview",
        "Contract business overview",
      ),
      indicators: [
        {
          label: t(
            "fleet.dashboard.contractBusinessStatus",
            "Contract Business Status",
          ),
          value:
            dashboardAnalytics.contractBusinessStatus === "green"
              ? t("fleet.dashboard.green", "Green")
              : dashboardAnalytics.contractBusinessStatus === "yellow"
                ? t("fleet.dashboard.yellow", "Yellow")
                : t("fleet.dashboard.red", "Red"),
          tone:
            dashboardAnalytics.contractBusinessStatus === "green"
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : dashboardAnalytics.contractBusinessStatus === "yellow"
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-800 border-rose-200",
          hoverDetails: {
            title: t(
              "fleet.dashboard.activeContractStatus",
              "Active contract status",
            ),
            rows: [
              {
                label: t("fleet.dashboard.activeOem", "Active OEM"),
                value: "Continental",
              },
              {
                label: t(
                  "fleet.dashboard.tyresUsedThisYear",
                  "Tyres used this year",
                ),
                value: "346/1000",
              },
            ],
          },
        },
        {
          label: t(
            "fleet.dashboard.serviceRequestsInProgress:",
            "Service Requests in Progress:",
          ),
          value: `${dashboardAnalytics.openRequests.length}`,
          tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
        },
        {
          label: t(
            "fleet.dashboard.estimatedCashbackYtd",
            "Estimated Cashback YTD",
          ),
          value: formatEuro(dashboardAnalytics.estimatedCashbackYtd),
          tone: "bg-amber-100 text-amber-800 border-amber-200",
        },
      ],
      icon: null,
    },
    {
      title: t(
        "fleet.dashboard.fleetSpendThisPeriod",
        "Fleet spend this period",
      ),
      value: formatEuro(dashboardAnalytics.totalSpend),
      helper: dashboardPeriodOptions.find(
        (option) => option.value === selectedDashboardPeriod,
      )?.label,
      status: "good",
      icon: CircleDollarSign,
    },
    {
      title: t("fleet.dashboard.openServiceRequests", "Open service requests"),
      value: `${dashboardAnalytics.openRequests.length}`,
      helper: t(
        "fleet.dashboard.requestsAcrossFleet",
        "Requests across the fleet",
      ),
      status: dashboardAnalytics.openRequests.length > 3 ? "warn" : "good",
      icon: Wrench,
    },
    {
      title: t("fleet.dashboard.avgCostPerRequest", "Average cost per request"),
      value: formatEuro(dashboardAnalytics.avgCostPerRequest),
      helper: t(
        "fleet.dashboard.activeDriversWithRequests",
        "{{count}} drivers with requests",
        { count: dashboardAnalytics.activeDriversWithRequests },
      ),
      status: "good",
      icon: Users,
    },
  ];
  const costTrendAxis = buildFleetAxisTicks(
    dashboardAnalytics.costPerCarTrend.map((entry) => entry.spend),
  );
  const oemTrendAxis = buildFleetAxisTicks(
    dashboardAnalytics.oemBusinessTrend.flatMap((entry) => [
      entry.continental,
      entry.michelin,
      entry.bridgestone,
      entry.goodyear,
      entry.uniroyal,
    ]),
  );

  const assignmentVehicles =
    vehicleState.vehicles.length > 0
      ? vehicleState.vehicles.map((vehicle) => ({
          id: vehicle.id,
          model: vehicle.model,
        }))
      : [
          ...dashboardAnalytics.mostCostlyVehicles.map((vehicle) => ({
            id: vehicle.id,
            model: vehicle.model,
          })),
          ...dashboardAnalytics.activeServiceRequests.map((vehicle) => ({
            id: vehicle.vehicleId,
            model: vehicle.model,
          })),
        ].filter(
          (vehicle, index, list) =>
            vehicle.id &&
            list.findIndex((item) => item.id === vehicle.id) === index,
        );

  const fleetNotifications = useMemo(() => {
    const parseTime = (value) => {
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();

    const orders = Array.isArray(serviceOrderState.orders)
      ? serviceOrderState.orders
      : [];
    const driverMessages = Array.isArray(communicationState.driverMessages)
      ? communicationState.driverMessages
      : [];
    const workshopMessages = Array.isArray(communicationState.workshopMessages)
      ? communicationState.workshopMessages
      : [];
    const tickets = Array.isArray(communicationState.tickets)
      ? communicationState.tickets
      : [];
    const invoices = Array.isArray(billingState.invoices)
      ? billingState.invoices
      : [];

    const pendingApprovalNotifications = orders
      .filter((order) => normalize(order.status).includes("pending"))
      .sort(
        (a, b) =>
          parseTime(b.updatedAt || b.requestedAt) -
          parseTime(a.updatedAt || a.requestedAt),
      )
      .slice(0, 5)
      .map((order) => ({
        id: `fleet-pending-${order.id}`,
        type: t("fleet.notifications.approvalRequired", "Approval required"),
        title: t(
          "fleet.notifications.requestNeedsApproval",
          "{{id}} needs approval",
          { id: order.id },
        ),
        detail: `${order.vehicleId} • ${order.requestTitle}`,
        iconKey: order.emergency ? "emergency" : "warning",
        levelClass: order.emergency
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-700",
        actionLabel: t("fleet.notifications.reviewRequest", "Review request"),
        actionMenu: "service_order_control",
        timestamp: order.updatedAt || order.requestedAt,
      }));

    const rejectedOrderNotifications = orders
      .filter((order) => normalize(order.status).includes("rejected"))
      .sort(
        (a, b) =>
          parseTime(b.updatedAt || b.requestedAt) -
          parseTime(a.updatedAt || a.requestedAt),
      )
      .slice(0, 4)
      .map((order) => ({
        id: `fleet-rejected-${order.id}`,
        type: t("fleet.notifications.rejectionAlert", "Rejection alert"),
        title: t("fleet.notifications.requestRejected", "{{id}} rejected", {
          id: order.id,
        }),
        detail:
          order.approval?.note ||
          `${order.vehicleId} • Review and resubmit if needed.`,
        iconKey: "approval_rejected",
        levelClass: "bg-rose-100 text-rose-700",
        actionLabel: t("fleet.notifications.openOrder", "Open order"),
        actionMenu: "service_order_control",
        timestamp: order.updatedAt || order.requestedAt,
      }));

    const settlementNotifications = orders
      .filter(
        (order) =>
          Boolean(order.settlement?.readyForSettlement) &&
          !order.settlement?.fleetAcknowledgedAt,
      )
      .sort(
        (a, b) =>
          parseTime(
            b.settlement?.completionConfirmedAt || b.updatedAt || b.requestedAt,
          ) -
          parseTime(
            a.settlement?.completionConfirmedAt || a.updatedAt || a.requestedAt,
          ),
      )
      .slice(0, 4)
      .map((order) => ({
        id: `fleet-settlement-${order.id}`,
        type: t("fleet.notifications.invoiceUpdate", "Invoice update"),
        title: t(
          "fleet.notifications.invoiceProcessing",
          "{{id}} invoice processing",
          { id: order.id },
        ),
        detail:
          order.settlement?.note ||
          `${order.vehicleId} • POS sent invoice for fleet confirmation.`,
        iconKey: "approval_ok",
        levelClass: "bg-emerald-100 text-emerald-700",
        actionLabel: t(
          "fleet.notifications.confirmCompletion",
          "Confirm completion",
        ),
        actionMenu: "service_order_control",
        timestamp:
          order.settlement?.completionConfirmedAt ||
          order.updatedAt ||
          order.requestedAt,
      }));

    const driverMessageNotifications = driverMessages
      .filter(
        (message) =>
          normalize(message.toRole) === "fleet" &&
          normalize(message.fromRole) === "driver",
      )
      .sort((a, b) => parseTime(b.sentAt) - parseTime(a.sentAt))
      .slice(0, 3)
      .map((message) => ({
        id: `fleet-driver-msg-${message.id}`,
        type: t("fleet.notifications.driverMessage", "Driver message"),
        title: t(
          "fleet.notifications.driverSentMessage",
          "{{name}} sent a message",
          { name: message.driverName },
        ),
        detail: message.message,
        iconKey: "message",
        levelClass: "bg-sky-100 text-sky-700",
        actionLabel: t("fleet.notifications.replyDriver", "Reply driver"),
        actionMenu: "communication",
        timestamp: message.sentAt,
      }));

    const workshopMessageNotifications = workshopMessages
      .filter(
        (message) =>
          normalize(message.toRole) === "fleet" &&
          normalize(message.fromRole) === "workshop",
      )
      .sort((a, b) => parseTime(b.sentAt) - parseTime(a.sentAt))
      .slice(0, 3)
      .map((message) => ({
        id: `fleet-workshop-msg-${message.id}`,
        type: t("fleet.notifications.workshopUpdate", "Workshop update"),
        title: t(
          "fleet.notifications.workshopResponded",
          "{{name}} responded",
          { name: message.workshop },
        ),
        detail: message.message,
        iconKey: "message",
        levelClass: "bg-indigo-100 text-indigo-700",
        actionLabel: t("fleet.notifications.openThread", "Open thread"),
        actionMenu: "communication",
        timestamp: message.sentAt,
      }));

    const supportTicketNotifications = tickets
      .filter((ticket) => {
        const status = normalize(ticket.status);
        return status === "open" || status === "escalated";
      })
      .sort(
        (a, b) =>
          parseTime(b.updatedAt || b.createdAt) -
          parseTime(a.updatedAt || a.createdAt),
      )
      .slice(0, 3)
      .map((ticket) => ({
        id: `fleet-ticket-${ticket.id}`,
        type: t("fleet.notifications.supportTicket", "Support ticket"),
        title: `${ticket.id} • ${ticket.status}`,
        detail: ticket.subject,
        iconKey: ticket.status === "Escalated" ? "warning" : "message",
        levelClass:
          ticket.status === "Escalated"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-200 text-slate-700",
        actionLabel: t("fleet.notifications.openSupport", "Open support"),
        actionMenu: "communication",
        timestamp: ticket.updatedAt || ticket.createdAt,
      }));

    const billingNotifications = invoices
      .filter((invoice) => {
        const status = normalize(invoice.status);
        return status === "processing" || status === "unpaid";
      })
      .sort((a, b) => parseTime(b.date) - parseTime(a.date))
      .slice(0, 3)
      .map((invoice) => ({
        id: `fleet-billing-${invoice.id}`,
        type: t("fleet.notifications.billingAlert", "Billing alert"),
        title: `${invoice.id} • ${invoice.status}`,
        detail: `${invoice.vehicleId} • $${(Number(invoice.totalAmount) || 0).toLocaleString()}`,
        iconKey: "billing",
        levelClass:
          normalize(invoice.status) === "unpaid"
            ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700",
        actionLabel: t("fleet.notifications.openBilling", "Open billing"),
        actionMenu: "billing_finance",
        timestamp: invoice.date,
      }));

    return [
      ...pendingApprovalNotifications,
      ...rejectedOrderNotifications,
      ...settlementNotifications,
      ...driverMessageNotifications,
      ...workshopMessageNotifications,
      ...supportTicketNotifications,
      ...billingNotifications,
    ]
      .sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp))
      .slice(0, 18);
  }, [
    billingState.invoices,
    communicationState.driverMessages,
    communicationState.tickets,
    communicationState.workshopMessages,
    serviceOrderState.orders,
    t,
  ]);

  const visibleFleetNotifications = useMemo(
    () =>
      fleetNotifications.filter(
        (item) => !clearedFleetNotificationIds.includes(item.id),
      ),
    [clearedFleetNotificationIds, fleetNotifications],
  );

  const handleSignOut = () => {
    clearSession();
    navigate("/signin", { replace: true });
  };

  const handleMenuNavigate = (menuKey) => {
    setIsMobileSidebarOpen(false);
    navigate(
      `/dashboard/${fleetMenuRouteMap[menuKey] || fleetMenuRouteMap.dashboard}`,
    );
  };

  const clearFleetNotification = (notificationId) => {
    if (!notificationId) {
      return;
    }
    setClearedFleetNotificationIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId],
    );
  };

  const clearAllFleetNotifications = () => {
    setClearedFleetNotificationIds(fleetNotifications.map((item) => item.id));
  };

  const handleFleetNotificationAction = (notification) => {
    const requestedMenu = notification?.actionMenu;
    const menuKey =
      requestedMenu && fleetMenuRouteMap[requestedMenu]
        ? requestedMenu
        : "dashboard";
    handleMenuNavigate(menuKey);
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      id: "",
      model: "",
      plate: "",
      type: "Truck",
      status: "Active",
      notes: "",
    });
  };

  const handlePersistVehicleUpdate = async (vehicleId, updates = {}) => {
    const existing = vehicleState.vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (!existing) {
      return null;
    }

    const nextVehicle = {
      ...existing,
      ...updates,
      tyreSpecs: {
        ...(existing.tyreSpecs || {}),
        ...(updates.tyreSpecs || {}),
      },
    };

    setVehicleApiError("");
    try {
      const saved = await updateFleetVehicleByVinApi(vehicleId, nextVehicle);
      updateVehicleStore(vehicleId, saved);
      return saved;
    } catch (error) {
      setVehicleApiError(error?.message || "Unable to update vehicle right now.");
      return null;
    }
  };

  const handlePersistBulkVehicles = async (payload = []) => {
    setVehicleApiError("");
    try {
      const result = await bulkUpsertFleetVehiclesApi(payload);
      if (Array.isArray(result?.vehicles) && result.vehicles.length > 0) {
        upsertVehicles(result.vehicles);
      }
      return result;
    } catch (error) {
      setVehicleApiError(error?.message || "Bulk vehicle sync failed.");
      return { inserted: 0, updated: 0, total: 0, vehicles: [] };
    }
  };

  const handleVehicleChange = (field) => (event) => {
    const { value } = event.target;
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleSelectChange = (field) => (value) => {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVehicle = async (event) => {
    event.preventDefault();
    setVehicleApiError("");
    setVehicleApiLoading(true);
    try {
      const created = await createFleetVehicleApi(vehicleForm);
      addVehicle(created);
      resetVehicleForm();
      setVehicleDialogOpen(false);
    } catch (error) {
      setVehicleApiError(error?.message || "Unable to create vehicle.");
    } finally {
      setVehicleApiLoading(false);
    }
  };

  const handleDriverChange = (field) => (event) => {
    const { value } = event.target;
    setDriverForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDriverSelectChange = (field) => (value) => {
    setDriverForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetDriverForm = () => {
  setDriverForm({
    id: "",
    name: "",
    email: "",
    phone: "",
    license: "",
    status: "Active",
    notes: "",
  });
};

const handleAddDriver = async (event) => {
  event.preventDefault();
  setDriverApiError("");
  setDriverApiLoading(true);
  try {
    const created = await createFleetDriverApi(driverForm);
    addDriver(created);

    const inviteStatus = String(created?.inviteStatus || "").toLowerCase();
    const inviteUrl = created?.invitation?.inviteUrl;

    if (inviteStatus === "sent" || inviteStatus === "accepted") {
      toast.success(`Driver added. Invitation SMS sent to ${created?.phone || "mobile"}.`);
    } else if (inviteStatus === "pending") {
      toast.message("Driver added. Invitation queued for delivery.");
    } else if (inviteStatus === "failed") {
      toast.warning("Driver added, but invitation SMS failed. Please retry invite.");
    } else {
      toast.success("Driver added successfully.");
    }

    if (inviteUrl && inviteStatus !== "failed") {
      toast.info("Invite link generated and attached to driver record.");
    }

    resetDriverForm();
    setDriverDialogOpen(false);
  } catch (error) {
    setDriverApiError(error?.message || "Unable to create driver.");
  } finally {
    setDriverApiLoading(false);
  }
};

const persistDriverPatch = async (driverId, updates = {}) => {
  const existing = driverState.drivers.find((driver) => driver.id === driverId);
  if (!existing) {
    return null;
  }

  const merged = {
    ...existing,
    ...updates,
    id: existing.id,
    serverId: existing.serverId,
  };

  if (!existing.serverId) {
    updateDriverStore(driverId, updates);
    return merged;
  }

  setDriverApiError("");
  try {
    const saved = await updateFleetDriverByServerIdApi(existing.serverId, merged);
    updateDriverStore(driverId, saved);
    return saved;
  } catch (error) {
    setDriverApiError(error?.message || "Unable to update driver right now.");
    return null;
  }
};

const handleDriverAssignmentChange = (driverId) => async (vehicleId) => {
  await persistDriverPatch(driverId, {
    assignedVehicleId: vehicleId === "unassigned" ? "" : vehicleId,
  });
};

const handleDriverActivityChange = (driverId) => async (activityStatus) => {
  await persistDriverPatch(driverId, {
    activityStatus,
    status: activityStatus,
  });
};

const handleDriverAccessChange = (driverId) => async (accessLevel) => {
  await persistDriverPatch(driverId, { accessLevel });
};

const handleRemoveDriver = (driverId) => async () => {
  const existing = driverState.drivers.find((driver) => driver.id === driverId);
  setDriverApiError("");

  if (!existing?.serverId) {
    removeDriver(driverId);
    return;
  }

  try {
    await deleteFleetDriverByServerIdApi(existing.serverId);
    removeDriver(driverId);
  } catch (error) {
    setDriverApiError(error?.message || "Unable to remove driver right now.");
  }
};

  const handleVehicleDetailsOpenChange = (open) => {
    setVehicleDetailsOpen(open);
    if (!open) {
      setSelectedVehicle(null);
    }
  };

  const handleVehicleCardClick = (vehicle, serviceStage) => () => {
    setSelectedVehicle({ ...vehicle, serviceStage });
    setVehicleDetailsOpen(true);
  };

  const selectedVehicleFromStore = selectedVehicle
    ? vehicleState.vehicles.find((vehicle) => vehicle.id === selectedVehicle.id)
    : null;

  const selectedVehicleModel =
    selectedVehicleFromStore?.model || selectedVehicle?.model || "Vehicle";

  const selectedVehicleIdNumber = selectedVehicle?.id
    ? Number(selectedVehicle.id.replace(/\D/g, "")) || 0
    : 0;

  const vehicleDetails = selectedVehicle
    ? {
        id: selectedVehicle.id,
        model: selectedVehicleModel,
        plate:
          selectedVehicleFromStore?.plate ||
          `TX-${9800 + selectedVehicleIdNumber}`,
        type: selectedVehicleFromStore?.type || "Truck",
        status: selectedVehicleFromStore?.status || "Active",
        vin: `1FUJGLDR${String(100000 + selectedVehicleIdNumber).slice(-6)}5`,
        year: 2020 + (selectedVehicleIdNumber % 6),
        color: ["White", "Black", "Silver", "Blue"][
          selectedVehicleIdNumber % 4
        ],
        odometer: `${(120_000 + selectedVehicleIdNumber * 37).toLocaleString()} mi`,
        engineHours: `${(3_200 + selectedVehicleIdNumber * 3).toLocaleString()} hrs`,
        fuelLevel: `${55 + (selectedVehicleIdNumber % 40)}%`,
        lastKnownLocation: [
          "Dallas, TX",
          "Austin, TX",
          "Houston, TX",
          "San Antonio, TX",
        ][selectedVehicleIdNumber % 4],
        route: ["I-35 Corridor", "Gulf Loop", "Metro Express", "Westline"][
          selectedVehicleIdNumber % 4
        ],
        driver: ["Jamie Stewart", "Avery Chen", "Morgan Patel", "Taylor Reed"][
          selectedVehicleIdNumber % 4
        ],
        driverId: `DR-${300 + (selectedVehicleIdNumber % 80)}`,
        depot: ["North Yard", "Central Yard", "South Yard"][
          selectedVehicleIdNumber % 3
        ],
        serviceStage: selectedVehicle.serviceStage || "-",
        serviceDate: selectedVehicle.date || "-",
        nextServiceDue: ["Mar 6, 2026", "Mar 14, 2026", "Mar 22, 2026"][
          selectedVehicleIdNumber % 3
        ],
        serviceCenter: [
          "Metro Service Hub",
          "Northern Fleet Works",
          "Westline Tire Care",
        ][selectedVehicleIdNumber % 3],
        invoiceId: `INV-${2040 + (selectedVehicleIdNumber % 40)}`,
        estimatedCost: `$${(1800 + (selectedVehicleIdNumber % 9) * 420).toLocaleString()}`,
        issues: [
          "Oil + filter change",
          "Brake inspection",
          "Tire rotation",
          "Coolant top-up",
        ].slice(0, 2 + (selectedVehicleIdNumber % 2)),
        inspectionDue: ["Apr 15, 2026", "May 2, 2026", "May 18, 2026"][
          selectedVehicleIdNumber % 3
        ],
        registrationExpiry: ["Jun 30, 2026", "Jul 15, 2026", "Aug 1, 2026"][
          selectedVehicleIdNumber % 3
        ],
        insuranceExpiry: ["Sep 10, 2026", "Oct 1, 2026", "Oct 20, 2026"][
          selectedVehicleIdNumber % 3
        ],
        notes:
          selectedVehicleFromStore?.notes ||
          "No additional notes. Vehicle is assigned to a standard regional route and follows the regular maintenance cycle.",
        createdAt: selectedVehicleFromStore?.createdAt || null,
      }
    : null;

  return (
    <main className="fleet-dashboard-theme h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="flex h-full w-full min-w-0">
        {isMobileSidebarOpen ? (
          <button
            aria-label={t("actions.closeMenuBackdrop", "Close menu backdrop")}
            className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-200 ease-out ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            isDesktopSidebarCollapsed
              ? "lg:w-24 lg:transition-[width] lg:duration-300 lg:ease-in-out"
              : "lg:w-72 lg:transition-[width] lg:duration-300 lg:ease-in-out"
          } lg:translate-x-0`}
        >
          <div
            className={`relative flex h-full flex-col bg-[#0D0F16] p-6 text-white shadow-xl ${
              isDesktopSidebarCollapsed ? "lg:p-3" : "lg:p-6"
            }`}
          >
            <button
              aria-label={t("actions.closeMenu", "Close menu")}
              className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full bg-white/10 text-white lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <button
              aria-label={
                isDesktopSidebarCollapsed
                  ? t("actions.expandSidebar", "Expand sidebar")
                  : t("actions.collapseSidebar", "Collapse sidebar")
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

            <div className="sidebar-scrollbar min-h-0 flex-1 space-y-10 overflow-y-auto pr-1">
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

              <div className="space-y-4">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] text-white/40 ${
                    isDesktopSidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {t("common.menu", "Menu")}
                </p>
                <nav className="space-y-2 text-sm">
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "dashboard"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("dashboard")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.dashboard", "Dashboard")
                        : undefined
                    }
                    type="button"
                  >
                    <LayoutGrid size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.dashboard", "Dashboard")}
                    </span>
                  </button>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "vehicles"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("vehicles")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.vehicles", "Vehicles")
                        : undefined
                    }
                    type="button"
                  >
                    <Van size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.vehicles", "Vehicles")}
                    </span>
                  </button>
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "drivers"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("drivers")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.drivers", "Drivers")
                        : undefined
                    }
                    type="button"
                  >
                    <User size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.drivers", "Drivers")}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "vehicle_policy"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("vehicle_policy")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.vehicle_policy", "Vehicle Policy")
                        : undefined
                    }
                    type="button"
                  >
                    <User size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.vehicle_policy", "Vehicle Policy")}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "service_order_control"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("service_order_control")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t(
                            "fleet.menu.service_order_control",
                            "Service & Order Control",
                          )
                        : undefined
                    }
                    type="button"
                  >
                    <FileUp size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t(
                        "fleet.menu.service_order_control",
                        "Service & Order Control",
                      )}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "billing_finance"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("billing_finance")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.billing_finance", "Billing & Finance")
                        : undefined
                    }
                    type="button"
                  >
                    <CircleDollarSign size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.billing_finance", "Billing & Finance")}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "reporting_analytics"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("reporting_analytics")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t(
                            "fleet.menu.reporting_analytics",
                            "Reporting & Analytics",
                          )
                        : undefined
                    }
                    type="button"
                  >
                    <Search size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t(
                        "fleet.menu.reporting_analytics",
                        "Reporting & Analytics",
                      )}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "communication"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("communication")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.communication", "Communication")
                        : undefined
                    }
                    type="button"
                  >
                    <Bell size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.communication", "Communication")}
                    </span>
                  </button>

                  {/* <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "team_access_control"
                        ? isDesktopSidebarCollapsed ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]" : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("team_access_control")}
                    type="button"
                  >
                    <Users size={18} />
                    Team &amp; Access Control
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      activeMenu === "settings_profile"
                        ? isDesktopSidebarCollapsed ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]" : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("settings_profile")}
                    type="button"
                  >
                    <Settings size={18} />
                    Settings &amp; Profile
                  </button> */}
                </nav>
              </div>

              <div className="space-y-4">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] text-white/40 ${
                    isDesktopSidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {t("common.general", "General")}
                </p>
                <nav className="space-y-2 text-sm">
                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    onClick={() => navigate("/driver-dashboard")}
                    type="button"
                  >
                    <Truck size={18} />
                    Driver Dashboard
                  </button> */}

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "team_access_control"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("team_access_control")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t(
                            "fleet.menu.team_access_control",
                            "Team & Access Control",
                          )
                        : undefined
                    }
                    type="button"
                  >
                    <Users size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t(
                        "fleet.menu.team_access_control",
                        "Team & Access Control",
                      )}
                    </span>
                  </button>

                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    } ${
                      activeMenu === "settings_profile"
                        ? isDesktopSidebarCollapsed
                          ? "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-[0_0_0_1px_rgba(131,102,214,0.2)_inset]"
                          : "border border-[#5f47a8] bg-[#2A1656] font-semibold text-white shadow-sm"
                        : "text-white/70 transition hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => handleMenuNavigate("settings_profile")}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("fleet.menu.settings_profile", "Settings & Profile")
                        : undefined
                    }
                    type="button"
                  >
                    <Settings size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("fleet.menu.settings_profile", "Settings & Profile")}
                    </span>
                  </button>

                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <Settings size={18} />
                    Settings
                  </button> */}
                  {/* <button
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    <HelpCircle size={18} />
                    Help
                  </button> */}
                  <button
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-white/70 transition hover:bg-white/10 hover:text-white ${
                      isDesktopSidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0"
                        : ""
                    }`}
                    onClick={handleSignOut}
                    title={
                      isDesktopSidebarCollapsed
                        ? t("actions.signOut", "Sign out")
                        : undefined
                    }
                    type="button"
                  >
                    <LogOut size={18} />
                    <span
                      className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}
                    >
                      {t("actions.signOut", "Sign out")}
                    </span>
                  </button>
                </nav>
              </div>
            </div>

            {/* <div className="mt-6 shrink-0 rounded-2xl bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0d12_60%)] p-4 text-sm">
              <p className="font-semibold">Mobile Ops</p>
              <p className="mt-2 text-white/60">
                Monitor vehicles and alerts on the go.
              </p>
              <button
                className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                type="button"
              >
                Download app
              </button>
            </div> */}
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0 sm:space-y-6 sm:px-6 sm:pb-6 ${
            isDesktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
          } lg:px-8 lg:pb-8`}
        >
          <Dialog
            open={vehicleDetailsOpen}
            onOpenChange={handleVehicleDetailsOpenChange}
          >
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedVehicleModel}</DialogTitle>
                <DialogDescription>
                  {selectedVehicle?.id
                    ? t("fleet.dialogs.vehicleIdLabel", "Vehicle ID: {{id}}", {
                        id: selectedVehicle.id,
                      })
                    : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid flex-1 gap-4 overflow-y-auto pr-1 text-sm">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("fleet.dialogs.overview", "Overview")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedVehicleModel}
                      </p>
                    </div>
                    {vehicleDetails?.serviceStage &&
                    vehicleDetails.serviceStage !== "-" ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {vehicleDetails.serviceStage}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.vehicleId", "Vehicle ID")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.id || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.serviceDate", "Service date")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.serviceDate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.plate", "Plate")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.plate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.type", "Type")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.type || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.status", "Status")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.status || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.added", "Added")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.createdAt
                          ? new Date(vehicleDetails.createdAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.dialogs.assignment", "Assignment")}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.driver", "Driver")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.driver || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicleDetails?.driverId || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.depot", "Depot")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.depot || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.route", "Route")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.route || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t(
                          "fleet.dialogs.lastKnownLocation",
                          "Last known location",
                        )}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.lastKnownLocation || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.dialogs.specs", "Specs")}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.vin", "VIN")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.vin || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.yearColor", "Year / color")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails
                          ? `${vehicleDetails.year} • ${vehicleDetails.color}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.odometer", "Odometer")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.odometer || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.engineHours", "Engine hours")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.engineHours || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.fuelLevel", "Fuel level")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.fuelLevel || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.dialogs.serviceCosts", "Service & costs")}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.serviceCenter", "Service center")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.serviceCenter || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.invoice", "Invoice")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.invoiceId || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.estimatedCost", "Estimated cost")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.estimatedCost || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.nextServiceDue", "Next service due")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.nextServiceDue || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {t("fleet.dialogs.workItems", "Work items")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(vehicleDetails?.issues || []).map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.dialogs.compliance", "Compliance")}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.inspectionDue", "Inspection due")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.inspectionDue || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t(
                          "fleet.dialogs.registrationExpiry",
                          "Registration expiry",
                        )}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.registrationExpiry || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("fleet.dialogs.insuranceExpiry", "Insurance expiry")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {vehicleDetails?.insuranceExpiry || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("fleet.dialogs.notes", "Notes")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {vehicleDetails?.notes || "—"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("driver.request.close", "Close")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {t("fleet.dialogs.addVehicle", "Add vehicle")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "fleet.dialogs.addVehicleDesc",
                    "Capture details to keep your fleet inventory accurate.",
                  )}
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={handleAddVehicle}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-id">
                      {t("fleet.dialogs.vehicleId", "Vehicle ID")}
                    </Label>
                    <Input
                      id="vehicle-id"
                      value={vehicleForm.id}
                      onChange={handleVehicleChange("id")}
                      placeholder="VH-482"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-plate">
                      {t("fleet.dialogs.plateNumber", "Plate number")}
                    </Label>
                    <Input
                      id="vehicle-plate"
                      value={vehicleForm.plate}
                      onChange={handleVehicleChange("plate")}
                      placeholder="TX-9842"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle-model">
                      {t("fleet.dialogs.vehicleModel", "Vehicle model")}
                    </Label>
                    <Input
                      id="vehicle-model"
                      value={vehicleForm.model}
                      onChange={handleVehicleChange("model")}
                      placeholder="Freightliner Cascadia"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>
                      {t("fleet.dialogs.vehicleType", "Vehicle type")}
                    </Label>
                    <Select
                      value={vehicleForm.type}
                      onValueChange={handleVehicleSelectChange("type")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t(
                            "fleet.dialogs.selectType",
                            "Select type",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Truck">
                          {t("fleet.dialogs.vehicleTypeTruck", "Truck")}
                        </SelectItem>
                        <SelectItem value="Van">
                          {t("fleet.dialogs.vehicleTypeVan", "Van")}
                        </SelectItem>
                        <SelectItem value="Trailer">
                          {t("fleet.dialogs.vehicleTypeTrailer", "Trailer")}
                        </SelectItem>
                        <SelectItem value="Utility">
                          {t("fleet.dialogs.vehicleTypeUtility", "Utility")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("fleet.dialogs.status", "Status")}</Label>
                    <Select
                      value={vehicleForm.status}
                      onValueChange={handleVehicleSelectChange("status")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t(
                            "fleet.dialogs.selectStatus",
                            "Select status",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">
                          {t("fleet.dialogs.statusActive", "Active")}
                        </SelectItem>
                        <SelectItem value="In service">
                          {t("fleet.dialogs.statusInService", "In service")}
                        </SelectItem>
                        <SelectItem value="Inactive">
                          {t("fleet.dialogs.statusInactive", "Inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle-notes">
                    {t("fleet.dialogs.notes", "Notes")}
                  </Label>
                  <Textarea
                    id="vehicle-notes"
                    value={vehicleForm.notes}
                    onChange={handleVehicleChange("notes")}
                    placeholder={t(
                      "fleet.dialogs.vehicleNotesPlaceholder",
                      "Add maintenance history or assignments.",
                    )}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline">
                    <FileUp />{" "}
                    {t("fleet.dialogs.importFromExcel", "Import from Excel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isVehicleReady}
                    className="w-full justify-center text-sm sm:w-auto text-white bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  >
                    {t("fleet.dialogs.addVehicle", "Add vehicle")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {t("fleet.dialogs.addDriver", "Add driver")}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    "fleet.dialogs.addDriverDesc",
                    "Add driver details to keep staffing up to date.",
                  )}
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={handleAddDriver}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="driver-id">
                      {t("fleet.dialogs.driverId", "Driver ID")}
                    </Label>
                    <Input
                      id="driver-id"
                      value={driverForm.id}
                      onChange={handleDriverChange("id")}
                      placeholder="DR-317"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-name">
                      {t("fleet.dialogs.fullName", "Full name")}
                    </Label>
                    <Input
                      id="driver-name"
                      value={driverForm.name}
                      onChange={handleDriverChange("name")}
                      placeholder="Jamie Stewart"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-email">
                      {t("fleet.dialogs.emailAddress", "Email address")}
                    </Label>
                    <Input
                      id="driver-email"
                      type="email"
                      value={driverForm.email}
                      onChange={handleDriverChange("email")}
                      placeholder="jamie@oxifleet.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-phone">
                      {t("fleet.dialogs.phoneNumber", "Phone number")}
                    </Label>
                    <Input
                      id="driver-phone"
                      value={driverForm.phone}
                      onChange={handleDriverChange("phone")}
                      placeholder="+1 (555) 284-3392"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-license">
                      {t("fleet.dialogs.license", "License")}
                    </Label>
                    <Input
                      id="driver-license"
                      value={driverForm.license}
                      onChange={handleDriverChange("license")}
                      placeholder="CDL-A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("fleet.dialogs.status", "Status")}</Label>
                    <Select
                      value={driverForm.status}
                      onValueChange={handleDriverSelectChange("status")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t(
                            "fleet.dialogs.selectStatus",
                            "Select status",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">
                          {t("fleet.dialogs.statusActive", "Active")}
                        </SelectItem>
                        <SelectItem value="On leave">
                          {t("fleet.dialogs.statusOnLeave", "On leave")}
                        </SelectItem>
                        <SelectItem value="Inactive">
                          {t("fleet.dialogs.statusInactive", "Inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="driver-notes">
                    {t("fleet.dialogs.notes", "Notes")}
                  </Label>
                  <Textarea
                    id="driver-notes"
                    value={driverForm.notes}
                    onChange={handleDriverChange("notes")}
                    placeholder={t(
                      "fleet.dialogs.driverNotesPlaceholder",
                      "Add certifications or route assignments.",
                    )}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline">
                    {t("fleet.dialogs.importFromExcel", "Import from Excel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isDriverReady}
                    className="w-full justify-center text-sm sm:w-auto text-white bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  >
                    {t("fleet.dialogs.addDriver", "Add driver")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="-mx-4 top-0 z-40 pb-3 sm:-mx-6 sm:pb-4 lg:-mx-8 lg:pb-4">
            <FleetTopbar
              displayEmail={user?.email || "john@oxifleet.com"}
              displayName={user?.name || "John Doe"}
              notifications={visibleFleetNotifications}
              onClearAllNotifications={clearAllFleetNotifications}
              onClearNotification={clearFleetNotification}
              onNotificationAction={handleFleetNotificationAction}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              pageTitle={activePageTitle}
              profileInitials={
                user?.name ? user.name.slice(0, 2).toUpperCase() : "JD"
              }
            />
          </div>

          {activeMenu === "vehicles" ? (
            <section className="space-y-4 sm:space-y-6">
              {vehicleApiError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {vehicleApiError}
                </div>
              ) : null}
              {vehicleApiLoading ? (
                <SectionLoadingCardStack
                  rows={5}
                  subtitle="Syncing vehicle data with backend..."
                  title="Loading vehicle management"
                />
              ) : (
                <VehicleManagement
                  vehicles={vehicleState.vehicles}
                  onAddVehicleClick={() => setVehicleDialogOpen(true)}
                  onPersistVehicleUpdate={handlePersistVehicleUpdate}
                  onPersistBulkVehicles={handlePersistBulkVehicles}
                />
              )}</section>
          ) : null}

          {activeMenu === "vehicle_policy" ? (
            <VehiclePolicyManagement vehicles={vehicleState.vehicles} />
          ) : null}

          {activeMenu === "service_order_control" ? (
            <ServiceOrderControl />
          ) : null}

          {activeMenu === "billing_finance" ? <BillingFinanceControl /> : null}

          {activeMenu === "reporting_analytics" ? (
            <ReportingAnalyticsControl />
          ) : null}

          {activeMenu === "communication" ? <CommunicationControl /> : null}

          {activeMenu === "team_access_control" ? <TeamAccessControl /> : null}

          {activeMenu === "settings_profile" ? (
            <SettingsProfileControl />
          ) : null}

          {activeMenu === "drivers" ? (
            <section className="space-y-4 sm:space-y-6">
              {driverApiError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {driverApiError}
                </div>
              ) : null}
              {driverApiLoading ? (
                <SectionLoadingCardStack
                  rows={5}
                  subtitle="Syncing driver data with backend..."
                  title="Loading driver management"
                />
              ) : (
                <DriverManagement
                  assignmentVehicles={assignmentVehicles}
                  drivers={driverState.drivers}
                  onAddDriverClick={() => setDriverDialogOpen(true)}
                  onDriverAccessChange={handleDriverAccessChange}
                  onDriverActivityChange={handleDriverActivityChange}
                  onDriverAssignmentChange={handleDriverAssignmentChange}
                  onRemoveDriver={handleRemoveDriver}
                  onSearchQueryChange={setDriverSearchQuery}
                  searchQuery={driverSearchQuery}
                />
              )}
            </section>
          ) : null}

          {activeMenu === "dashboard" ? (
            <>
              <section className="-mt-6 grid grid-cols-2 gap-2.5 px-1 sm:-mt-8 sm:gap-3 sm:px-2 lg:mt-0 lg:grid-cols-4 lg:px-0">
                {dashboardSummaryCards.map((card) => {
                  const Icon = card.icon;
                  if (card.kind === "status") {
                    return (
                      <article
                        className="relative overflow-visible rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
                        key={card.title}
                      >
                        <div className="relative z-10 flex items-start justify-between gap-2">
                          <div>
                            <div className="space-y-2">
                              {card.indicators.map((indicator) => (
                                <div
                                  key={indicator.label}
                                  className={`group relative flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${indicator.tone}`}
                                >
                                  <p className="text-[10px] font-medium sm:text-xs">
                                    {indicator.label}
                                  </p>
                                  {indicator.value ? (
                                    <span className="text-[10px] font-semibold sm:text-xs">
                                      {indicator.value}
                                    </span>
                                  ) : null}
                                  {indicator.hoverDetails ? (
                                    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-xl group-hover:block">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        {indicator.hoverDetails.title}
                                      </p>
                                      <div className="mt-2 space-y-2">
                                        {indicator.hoverDetails.rows.map(
                                          (row) => (
                                            <div
                                              key={row.label}
                                              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2"
                                            >
                                              <span className="text-[10px] text-slate-500 sm:text-xs">
                                                {row.label}
                                              </span>
                                              <span className="text-[10px] font-semibold text-slate-900 sm:text-xs">
                                                {row.value}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                          {Icon ? (
                            <span className="rounded-md bg-slate-100 p-1 text-slate-700">
                              <Icon size={11} />
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  }
                  return (
                    <article
                      className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
                      key={card.title}
                    >
                      <div className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-slate-100" />
                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                            {card.title}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-3xl">
                            {card.value}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                            {card.helper}
                          </p>
                        </div>
                        <span className="rounded-md bg-slate-100 p-1 text-slate-700">
                          <Icon size={11} />
                        </span>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${fleetKpiTone(
                            card.status,
                          )}`}
                        >
                          {card.status === "good"
                            ? t("fleet.dashboard.onTrack", "On track")
                            : card.status === "warn"
                              ? t(
                                  "fleet.dashboard.needsAttention",
                                  "Needs attention",
                                )
                              : t(
                                  "fleet.dashboard.actionRequired",
                                  "Action required",
                                )}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <div
                  className="p-4 shadow-sm backdrop-blur-sm sm:p-6"
                  style={figmaChartCardStyle}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2
                        className="text-sm font-semibold sm:text-lg"
                        style={{ color: figmaChartTheme.title }}
                      >
                        {t("fleet.dashboard.costTrend", "Fleet Cost Trend")}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        onValueChange={setSelectedCostTrendVehicleType}
                        value={selectedCostTrendVehicleType}
                      >
                        <SelectTrigger className="h-8 w-[130px] rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypeFilterOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={setSelectedCostTrendHorizon}
                        value={selectedCostTrendHorizon}
                      >
                        <SelectTrigger className="h-8 w-[136px] rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {costTrendHorizonOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {t("fleet.dashboard.currentMonth", "Current month")}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 sm:text-2xl">
                        {formatEuro(dashboardAnalytics.currentMonthCostPerCar)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {t(
                          "fleet.dashboard.averageCostPerCar",
                          "Average cost per car",
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {t("fleet.dashboard.ytd", "YTD")}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 sm:text-2xl">
                        {formatEuro(dashboardAnalytics.ytdCostPerCar)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {t(
                          "fleet.dashboard.averageCostPerCar",
                          "Average cost per car",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-44 sm:mt-4 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dashboardAnalytics.costPerCarTrend}
                        margin={{ left: -16, right: 8 }}
                      >
                        <defs>
                          <linearGradient
                            id="spendFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="10%"
                              stopColor={figmaChartTheme.areaStart}
                              stopOpacity={1}
                            />
                            <stop
                              offset="60%"
                              stopColor={figmaChartTheme.areaMid}
                              stopOpacity={1}
                            />
                            <stop
                              offset="95%"
                              stopColor={figmaChartTheme.areaEnd}
                              stopOpacity={1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke={figmaChartTheme.grid}
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: figmaChartTheme.axis, fontSize: 12 }}
                        />
                        <YAxis
                          domain={[0, costTrendAxis.domainMax]}
                          ticks={costTrendAxis.ticks}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: figmaChartTheme.axis, fontSize: 12 }}
                          tickFormatter={formatFleetAxisEuro}
                        />
                        <Tooltip
                          content={renderFleetSpendTooltip}
                          cursor={{ fill: figmaChartTheme.cursorFill }}
                        />
                        <Area
                          type="monotone"
                          dataKey="spend"
                          stroke={figmaChartTheme.linePrimary}
                          strokeWidth={3}
                          fill="url(#spendFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div
                  className="p-4 shadow-sm backdrop-blur-sm sm:p-6"
                  style={{
                    ...figmaChartCardStyle,
                    border: "1px solid #D3CFDB",
                    minHeight: "342px",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      className="text-sm font-semibold sm:text-lg"
                      style={{ color: figmaChartTheme.title }}
                    >
                      {t("fleet.dashboard.oemBusinessTrend", "Business by OEM")}
                    </h2>
                    <Select
                      onValueChange={setSelectedCostTrendHorizon}
                      value={selectedCostTrendHorizon}
                    >
                      <SelectTrigger className="h-8 w-[136px] rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {costTrendHorizonOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p
                    className="mt-1 text-xs sm:text-xs"
                    style={{ color: "#9E9FA2" }}
                  >
                    {t(
                      "fleet.dashboard.oemBusinessTrendDesc",
                      "Monthly tyre-related business split by OEM across the selected timeline.",
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                    {[
                      [
                        "#2E3A87",
                        t("fleet.dashboard.oemContinental", "Continental"),
                      ],
                      ["#F57C00", t("fleet.dashboard.oemMichelin", "Michelin")],
                      [
                        "#6D4C41",
                        t("fleet.dashboard.oemBridgestone", "Bridgestone"),
                      ],
                      ["#1E88E5", t("fleet.dashboard.oemGoodyear", "Goodyear")],
                      ["#7B1FA2", t("fleet.dashboard.oemUniroyal", "Uniroyal")],
                    ].map(([color, label]) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 h-48 sm:mt-4 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardAnalytics.oemBusinessTrend}
                        barGap={4}
                        barSize={10}
                        margin={{ left: -14, right: 8, top: 4 }}
                      >
                        <CartesianGrid
                          stroke={figmaChartTheme.grid}
                          strokeDasharray="2 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: figmaChartTheme.axis, fontSize: 12 }}
                        />
                        <YAxis
                          domain={[0, oemTrendAxis.domainMax]}
                          ticks={oemTrendAxis.ticks}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: figmaChartTheme.axis, fontSize: 12 }}
                          tickFormatter={formatFleetAxisEuro}
                        />
                        <Tooltip
                          content={renderFleetOemTooltip}
                          cursor={{ fill: "rgba(36, 17, 77, 0.04)" }}
                        />
                        <Bar
                          dataKey="continental"
                          name={t(
                            "fleet.dashboard.oemContinental",
                            "Continental",
                          )}
                          radius={[8, 8, 0, 0]}
                          fill="#2E3A87"
                        />
                        <Bar
                          dataKey="michelin"
                          name={t("fleet.dashboard.oemMichelin", "Michelin")}
                          radius={[8, 8, 0, 0]}
                          fill="#F57C00"
                        />
                        <Bar
                          dataKey="bridgestone"
                          name={t(
                            "fleet.dashboard.oemBridgestone",
                            "Bridgestone",
                          )}
                          radius={[8, 8, 0, 0]}
                          fill="#6D4C41"
                        />
                        <Bar
                          dataKey="goodyear"
                          name={t("fleet.dashboard.oemGoodyear", "Goodyear")}
                          radius={[8, 8, 0, 0]}
                          fill="#1E88E5"
                        />
                        <Bar
                          dataKey="uniroyal"
                          name={t("fleet.dashboard.oemUniroyal", "Uniroyal")}
                          radius={[8, 8, 0, 0]}
                          fill="#7B1FA2"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 sm:text-lg">
                      {t(
                        "fleet.dashboard.serviceRequestsByDriver",
                        "Service requests by driver",
                      )}
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {dashboardAnalytics.requestsByDriver.length}{" "}
                      {t("fleet.dashboard.drivers", "drivers")}
                    </span>
                  </div>
                  <div className="card-list-scrollbar mt-4 max-h-[23.5rem] space-y-3 overflow-y-auto pr-1">
                    {dashboardAnalytics.requestsByDriver.map((driver) => (
                      <div
                        key={driver.name}
                        className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-xs sm:p-4 sm:text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 sm:text-base">
                              {driver.name}
                            </p>
                            <p className="text-[10px] text-slate-500 sm:text-xs">
                              {driver.requests}{" "}
                              {t("fleet.dashboard.requests", "requests")}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
                            {driver.requests}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                          <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-amber-700">
                            <p className="font-semibold">
                              {t("fleet.dashboard.pending", "Pending")}
                            </p>
                            <p className="mt-1">{driver.pending}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-emerald-700">
                            <p className="font-semibold">
                              {t("fleet.dashboard.approved", "Approved")}
                            </p>
                            <p className="mt-1">{driver.approved}</p>
                          </div>
                          <div className="rounded-xl bg-rose-50 px-2.5 py-2 text-rose-700">
                            <p className="font-semibold">
                              {t("fleet.dashboard.rejected", "Rejected")}
                            </p>
                            <p className="mt-1">{driver.rejected}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 sm:text-lg">
                      {t(
                        "fleet.dashboard.invoicesRequiringAction",
                        "Invoices requiring action",
                      )}
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      {t("fleet.dashboard.review", "Review")}
                    </span>
                  </div>
                  <div className="card-list-scrollbar mt-4 max-h-[23.5rem] space-y-3 overflow-y-auto pr-1">
                    {dashboardAnalytics.invoicesRequiringAction.map(
                      (invoice) => (
                        <div
                          key={invoice.id}
                          className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-xs sm:p-4 sm:text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                              {invoice.id}
                            </p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                              {invoice.status}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] font-semibold text-slate-900 sm:text-sm">
                            {invoice.vehicleModel}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                            {invoice.driverName} • {invoice.date}
                          </p>
                          <p className="mt-2.5 text-sm font-semibold text-slate-900 sm:mt-3 sm:text-base">
                            {formatEuro(invoice.totalAmount)}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 sm:text-lg">
                      {t(
                        "fleet.dashboard.activeServiceRequests",
                        "Active service requests",
                      )}
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      {t("fleet.dashboard.openRequests", "Open")}
                    </span>
                  </div>
                  <div className="card-list-scrollbar mt-4 max-h-[23.5rem] space-y-3 overflow-y-auto pr-1">
                    {dashboardAnalytics.activeServiceRequests.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100/80 bg-sky-50 px-3 py-2.5 text-left text-xs transition hover:bg-sky-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 sm:px-4 sm:py-3 sm:text-sm"
                        onClick={handleVehicleCardClick(
                          {
                            id: vehicle.vehicleId,
                            model: vehicle.model,
                            date: vehicle.date,
                          },
                          vehicle.status,
                        )}
                        type="button"
                      >
                        <div>
                          <p className="text-[13px] font-semibold text-slate-900 sm:text-base">
                            {vehicle.requestTitle}
                          </p>
                          <p className="text-[10px] text-slate-500 sm:text-xs">
                            {vehicle.vehicleId} • {vehicle.requestedBy}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-slate-700 sm:text-sm">
                            {vehicle.date}
                          </p>
                          <p className="text-[10px] text-slate-500 sm:text-xs">
                            {vehicle.status}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-4 text-default shadow-lg sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold sm:text-sm">
                        {t(
                          "fleet.dashboard.mostCostlyVehicles",
                          "Most costly vehicles",
                        )}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                        {t(
                          "fleet.dashboard.mostCostlyVehiclesDesc",
                          "Highest service cost by vehicle in the selected period.",
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {dashboardPeriodOptions.find(
                        (option) => option.value === selectedDashboardPeriod,
                      )?.label ||
                        t("fleet.dashboard.last90Days", "Last 90 days")}
                    </span>
                  </div>
                  <div className="card-list-scrollbar mt-5 max-h-[23.5rem] space-y-3 overflow-y-auto pr-1 text-xs sm:mt-6 sm:space-y-4 sm:text-sm">
                    {dashboardAnalytics.mostCostlyVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3"
                      >
                        <div>
                          <p className="text-[12px] font-semibold sm:text-sm">
                            {vehicle.model}
                          </p>
                          <p className="text-[10px] sm:text-xs">
                            {vehicle.id} • {vehicle.requestCount}{" "}
                            {t("fleet.dashboard.requests", "requests")}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold shadow-sm">
                          {formatEuro(vehicle.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;




























