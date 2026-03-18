import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  addPaymentMethod,
  getBillingFinanceState,
  removePaymentMethod,
  setDefaultPaymentMethod,
  setInvoiceStatus,
  subscribeBillingFinance,
  updateBillingProfile,
} from "../data/billingFinanceStore";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const escapeCsvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const buildInvoiceCsv = (invoice) => {
  const summaryHeaders = [
    "Invoice ID",
    "Order ID",
    "Vehicle ID",
    "Vehicle Model",
    "Driver",
    "Location",
    "Date",
    "Status",
    "Total Amount",
  ];

  const summaryValues = [
    invoice.id,
    invoice.orderId,
    invoice.vehicleId,
    invoice.vehicleModel,
    invoice.driverName,
    invoice.location,
    invoice.date,
    invoice.status,
    Number(invoice.totalAmount) || 0,
  ];

  const serviceRows = (invoice.services || []).map((line) =>
    [line.name, Number(line.cost) || 0].map(escapeCsvCell).join(",")
  );

  return [
    "Invoice Summary",
    summaryHeaders.map(escapeCsvCell).join(","),
    summaryValues.map(escapeCsvCell).join(","),
    "",
    "Service Lines",
    ["Line Item", "Cost"].map(escapeCsvCell).join(","),
    ...serviceRows,
    ["Total", Number(invoice.totalAmount) || 0].map(escapeCsvCell).join(","),
  ].join("\n");
};

const statusClassName = (status) => {
  if (status === "Paid") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Unpaid") {
    return "bg-rose-100 text-rose-700";
  }
  if (status === "Processing") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
};

const toArrayTotals = (items, keySelector, valueSelector) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keySelector(item);
    const value = Number(valueSelector(item)) || 0;
    map.set(key, (map.get(key) || 0) + value);
  });
  return Array.from(map.entries())
    .map(([key, amount]) => ({ key, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const billingOverviewToneClass = (tone) => {
  if (tone === "good") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (tone === "warn") {
    return "bg-amber-100 text-amber-700";
  }
  if (tone === "danger") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-sky-100 text-sky-700";
};

function BillingFinanceControl() {
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    type: "Card",
    label: "",
    holderName: "",
    last4: "",
  });
  const [billingDraft, setBillingDraft] = useState(() => ({
    ...getBillingFinanceState().billingProfile,
  }));
  const [exportMessage, setExportMessage] = useState("");

  const consolidatedInvoices = useMemo(
    () =>
      [...billingState.invoices].sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeB - timeA;
      }),
    [billingState.invoices]
  );

  const filteredInvoices = useMemo(() => {
    return consolidatedInvoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) {
        return true;
      }
      const blob = [
        invoice.id,
        invoice.orderId,
        invoice.vehicleId,
        invoice.vehicleModel,
        invoice.driverName,
        invoice.location,
        invoice.status,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(searchQuery.trim().toLowerCase());
    });
  }, [consolidatedInvoices, searchQuery, statusFilter]);

  const selectedInvoice = useMemo(() => {
    const explicit = consolidatedInvoices.find(
      (invoice) => invoice.id === selectedInvoiceId
    );
    if (explicit) {
      return explicit;
    }
    return filteredInvoices[0] || null;
  }, [consolidatedInvoices, filteredInvoices, selectedInvoiceId]);

  const selectedId = selectedInvoice?.id || "";

  const totals = useMemo(() => {
    const totalSpend = consolidatedInvoices.reduce(
      (sum, invoice) => sum + invoice.totalAmount,
      0
    );
    const paid = consolidatedInvoices
      .filter((invoice) => invoice.status === "Paid")
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const unpaid = consolidatedInvoices
      .filter((invoice) => invoice.status === "Unpaid")
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const processing = consolidatedInvoices
      .filter((invoice) => invoice.status === "Processing")
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    return {
      totalSpend,
      paid,
      unpaid,
      processing,
    };
  }, [consolidatedInvoices]);

  const overviewCards = [
    {
      key: "total",
      title: "Total spend",
      value: formatCurrency(totals.totalSpend),
      helper: `${consolidatedInvoices.length} consolidated invoices`,
      status: "Ledger synced",
      tone: "good",
      icon: CircleDollarSign,
    },
    {
      key: "paid",
      title: "Paid",
      value: formatCurrency(totals.paid),
      helper: "Cleared invoices",
      status: "Settled",
      tone: "good",
      icon: BadgeCheck,
    },
    {
      key: "unpaid",
      title: "Unpaid",
      value: formatCurrency(totals.unpaid),
      helper: "Pending settlement",
      status: totals.unpaid > 0 ? "Follow up" : "No due amount",
      tone: totals.unpaid > 0 ? "danger" : "good",
      icon: Receipt,
    },
    {
      key: "processing",
      title: "Processing",
      value: formatCurrency(totals.processing),
      helper: "Under verification",
      status: totals.processing > 0 ? "In progress" : "Up to date",
      tone: totals.processing > 0 ? "warn" : "info",
      icon: Clock3,
    },
    {
      key: "methods",
      title: "Payment methods",
      value: `${billingState.paymentMethods.length}`,
      helper: "Configured methods",
      status: billingState.paymentMethods.length > 0 ? "Ready to pay" : "Add method",
      tone: billingState.paymentMethods.length > 0 ? "info" : "warn",
      icon: CreditCard,
    },
  ];

  const spendByVehicle = useMemo(
    () =>
      toArrayTotals(
        consolidatedInvoices,
        (invoice) => `${invoice.vehicleId} - ${invoice.vehicleModel}`,
        (invoice) => invoice.totalAmount
      ).slice(0, 5),
    [consolidatedInvoices]
  );

  const spendByDriver = useMemo(
    () =>
      toArrayTotals(
        consolidatedInvoices,
        (invoice) => invoice.driverName || "Unassigned",
        (invoice) => invoice.totalAmount
      ).slice(0, 5),
    [consolidatedInvoices]
  );

  const spendByLocation = useMemo(
    () =>
      toArrayTotals(
        consolidatedInvoices,
        (invoice) => invoice.location || "Unknown",
        (invoice) => invoice.totalAmount
      ).slice(0, 5),
    [consolidatedInvoices]
  );

  const handleInvoiceStatusChange = (invoiceId) => (value) => {
    setInvoiceStatus(invoiceId, value);
  };

  const handleAddPaymentMethod = () => {
    if (!paymentForm.label.trim()) {
      return;
    }
    addPaymentMethod({
      type: paymentForm.type,
      label: paymentForm.label,
      holderName: paymentForm.holderName,
      last4: paymentForm.last4,
      isDefault: billingState.paymentMethods.length === 0,
    });
    setPaymentForm({
      type: "Card",
      label: "",
      holderName: "",
      last4: "",
    });
  };

  const handleSaveBillingProfile = () => {
    updateBillingProfile(billingDraft);
  };

  const handleExportAccountingData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      invoices: billingState.invoices,
      creditNotes: billingState.creditNotes,
      paymentMethods: billingState.paymentMethods,
      billingProfile: billingState.billingProfile,
    };
    const content = JSON.stringify(exportData, null, 2);

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `accounting-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportMessage("Accounting export downloaded.");
      return;
    }

    setExportMessage("Export is available in browser runtime only.");
  };

  const handleDownloadInvoice = (invoice) => {
    if (!invoice || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const content = buildInvoiceCsv(invoice);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoice.id || "invoice"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div
        className="hidden overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-5 text-white shadow-lg sm:p-7 lg:block"
        // className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
          Billing & Finance
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Consolidated invoices, credit notes, status tracking, spend analytics,
          payment methods, billing/tax details, and accounting export.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
              key={card.key}
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
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Icon size={13} />
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${billingOverviewToneClass(
                    card.tone,
                  )}`}
                >
                  {card.status}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Consolidated invoices
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by invoice, order, vehicle, driver, location"
                  value={searchQuery}
                />
                {searchQuery ? (
                  <button
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <Select onValueChange={setStatusFilter} value={statusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isSelected = selectedInvoice?.id === invoice.id;
                  return (
                    <div
                      key={invoice.id}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        type="button"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {invoice.id} - {invoice.vehicleId}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : statusClassName(invoice.status)
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs opacity-80">
                          {invoice.driverName} | {invoice.location}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                      </button>
                      <div className="mt-2 flex justify-end">
                        <Button
                          className={
                            isSelected
                              ? "border-white/30 text-white hover:bg-green-600"
                              : ""
                          }
                          onClick={() => handleDownloadInvoice(invoice)}
                          size="sm"
                          type="button"
                          variant="outline"
                          style={{
                            backgroundColor: isSelected ? "green" : undefined,
                          }}
                        >
                          Download invoice
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
              Credit note visibility
            </h3>
            <div className="card-list-scrollbar mt-4 max-h-[20rem] space-y-2 overflow-y-auto pr-1">
              {billingState.creditNotes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No credit notes available.
                </p>
              ) : (
                billingState.creditNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {note.id} | {note.invoiceId}
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-slate-700">
                        {note.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{note.reason}</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      -{formatCurrency(note.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Cost breakdown per service
            </h3>
            {selectedInvoice ? (
              <div className="mt-4 grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Invoice</p>
                    <p className="font-semibold text-slate-900">
                      {selectedInvoice.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Order</p>
                    <p className="font-semibold text-slate-900">
                      {selectedInvoice.orderId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="font-semibold text-slate-900">
                      {selectedInvoice.date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <Select
                      onValueChange={handleInvoiceStatusChange(selectedId)}
                      value={selectedInvoice.status}
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Download invoice
                  </Button>
                </div>
                <div className="card-list-scrollbar max-h-[18rem] space-y-2 overflow-y-auto pr-1">
                  {selectedInvoice.services.map((line, index) => (
                    <div
                      key={`${selectedInvoice.id}-line-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">
                        {line.name}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(line.cost)}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
                    <p className="font-semibold text-slate-900">Total</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(selectedInvoice.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Select an invoice to view cost breakdown.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Spend by vehicle / driver / location
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vehicle
                </p>
                <div className="card-list-scrollbar mt-2 max-h-[16.5rem] space-y-2 overflow-y-auto pr-1">
                  {spendByVehicle.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Driver
                </p>
                <div className="card-list-scrollbar mt-2 max-h-[16.5rem] space-y-2 overflow-y-auto pr-1">
                  {spendByDriver.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
                </p>
                <div className="card-list-scrollbar mt-2 max-h-[16.5rem] space-y-2 overflow-y-auto pr-1">
                  {spendByLocation.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Payment methods management
          </h3>
          <div className="card-list-scrollbar mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {billingState.paymentMethods.map((method) => (
              <div
                key={method.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {method.label} ({method.type})
                    </p>
                    <p className="text-slate-600">
                      {method.holderName || "No holder"}{" "}
                      {method.last4 ? `| ****${method.last4}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {method.isDefault ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        Default
                      </span>
                    ) : (
                      <Button
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      onClick={() => removePaymentMethod(method.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
            <Select
              onValueChange={(value) =>
                setPaymentForm((prev) => ({ ...prev, type: value }))
              }
              value={paymentForm.type}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                <SelectItem value="ACH">ACH</SelectItem>
                <SelectItem value="Wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
            <Input
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
              placeholder="Label (e.g. Corporate Mastercard)"
              value={paymentForm.label}
            />
            <Input
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  holderName: event.target.value,
                }))
              }
              placeholder="Holder name"
              value={paymentForm.holderName}
            />
            <Input
              maxLength={4}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  last4: event.target.value,
                }))
              }
              placeholder="Last 4 digits"
              value={paymentForm.last4}
            />
            <Button
              onClick={handleAddPaymentMethod}
              type="button"
              variant="outline"
            >
              Add payment method
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Billing address & tax info
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  companyName: event.target.value,
                }))
              }
              placeholder="Company name"
              value={billingDraft.companyName}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  billingEmail: event.target.value,
                }))
              }
              placeholder="Billing email"
              value={billingDraft.billingEmail}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  addressLine1: event.target.value,
                }))
              }
              placeholder="Address line 1"
              value={billingDraft.addressLine1}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  addressLine2: event.target.value,
                }))
              }
              placeholder="Address line 2"
              value={billingDraft.addressLine2}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
              placeholder="City"
              value={billingDraft.city}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  state: event.target.value,
                }))
              }
              placeholder="State"
              value={billingDraft.state}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  postalCode: event.target.value,
                }))
              }
              placeholder="Postal code"
              value={billingDraft.postalCode}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  country: event.target.value,
                }))
              }
              placeholder="Country"
              value={billingDraft.country}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  taxId: event.target.value,
                }))
              }
              placeholder="Tax ID"
              value={billingDraft.taxId}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({
                  ...prev,
                  vatNumber: event.target.value,
                }))
              }
              placeholder="VAT/GST number"
              value={billingDraft.vatNumber}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSaveBillingProfile}
              type="button"
              className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
            >
              Save billing profile
            </Button>
            <Button
              onClick={handleExportAccountingData}
              type="button"
              variant="outline"
            >
              Export accounting data
            </Button>
            {exportMessage ? (
              <p className="text-sm text-slate-600">{exportMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default BillingFinanceControl;
