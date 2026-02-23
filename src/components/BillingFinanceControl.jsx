import { useMemo, useState, useSyncExternalStore } from "react";
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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Billing & Finance</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consolidated invoices, credit notes, status tracking, spend analytics,
          payment methods, billing/tax details, and accounting export.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total spend</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(totals.totalSpend)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Paid</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {formatCurrency(totals.paid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Unpaid</p>
          <p className="mt-3 text-3xl font-semibold text-rose-700">
            {formatCurrency(totals.unpaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Processing</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">
            {formatCurrency(totals.processing)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Consolidated invoices
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by invoice, order, vehicle, driver, location"
                value={searchQuery}
              />
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

            <div className="mt-4 space-y-3">
              {filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isSelected = selectedInvoice?.id === invoice.id;
                  return (
                    <button
                      key={invoice.id}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
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
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Credit note visibility
            </h3>
            <div className="mt-4 space-y-2">
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
                <div className="space-y-2">
                  {selectedInvoice.services.map((line, index) => (
                    <div
                      key={`${selectedInvoice.id}-line-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{line.name}</p>
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
                <div className="mt-2 space-y-2">
                  {spendByVehicle.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">{formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Driver
                </p>
                <div className="mt-2 space-y-2">
                  {spendByDriver.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">{formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
                </p>
                <div className="mt-2 space-y-2">
                  {spendByLocation.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">{item.key}</p>
                      <p className="text-slate-600">{formatCurrency(item.amount)}</p>
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
          <div className="mt-4 space-y-3">
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
                setPaymentForm((prev) => ({ ...prev, label: event.target.value }))
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
                setPaymentForm((prev) => ({ ...prev, last4: event.target.value }))
              }
              placeholder="Last 4 digits"
              value={paymentForm.last4}
            />
            <Button onClick={handleAddPaymentMethod} type="button" variant="outline">
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
                setBillingDraft((prev) => ({ ...prev, city: event.target.value }))
              }
              placeholder="City"
              value={billingDraft.city}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({ ...prev, state: event.target.value }))
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
                setBillingDraft((prev) => ({ ...prev, country: event.target.value }))
              }
              placeholder="Country"
              value={billingDraft.country}
            />
            <Input
              onChange={(event) =>
                setBillingDraft((prev) => ({ ...prev, taxId: event.target.value }))
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
            <Button onClick={handleSaveBillingProfile} type="button">
              Save billing profile
            </Button>
            <Button onClick={handleExportAccountingData} type="button" variant="outline">
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
