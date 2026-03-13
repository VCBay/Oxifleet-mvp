import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CalendarClock, CheckCircle2, CreditCard, FileWarning, History } from "lucide-react";
import { Button } from "./ui/button";
import {
  getBillingFinanceState,
  subscribeBillingFinance,
} from "../data/billingFinanceStore";
import {
  getPosOrderState,
  subscribePosOrders,
} from "../data/posOrderStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }
  return parsed.toLocaleDateString("en-US");
};

const toTime = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const addDays = (value, days) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString();
};

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

const extractPosOrderId = (serviceOrder) => {
  const title = String(serviceOrder?.requestTitle || "");
  const notes = String(serviceOrder?.orderDetails?.notes || "");
  const match = `${title} ${notes}`.match(/POS\s+Order\s+([A-Z0-9-]+)/i);
  return match ? String(match[1]).trim() : "";
};

const getLatestRequestByPosOrder = (serviceOrders) => {
  const map = new Map();
  serviceOrders.forEach((order) => {
    const posOrderId = extractPosOrderId(order);
    if (!posOrderId) {
      return;
    }
    const existing = map.get(posOrderId);
    const currentTs = toTime(order.updatedAt || order.requestedAt);
    const existingTs = existing ? toTime(existing.updatedAt || existing.requestedAt) : -1;
    if (!existing || currentTs >= existingTs) {
      map.set(posOrderId, order);
    }
  });
  return map;
};

function POSBillingSettlementControl({
  initialFocus = "",
  initialInvoiceId = "",
}) {
  const billingState = useSyncExternalStore(
    subscribeBillingFinance,
    getBillingFinanceState,
    getBillingFinanceState
  );
  const posOrderState = useSyncExternalStore(
    subscribePosOrders,
    getPosOrderState,
    getPosOrderState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );

  const submittedOrders = useMemo(
    () =>
      [...posOrderState.submittedOrders].sort(
        (a, b) => toTime(b.submittedAt || b.updatedAt) - toTime(a.submittedAt || a.updatedAt)
      ),
    [posOrderState.submittedOrders]
  );

  const latestRequestByPosOrder = useMemo(
    () => getLatestRequestByPosOrder(serviceOrderState.orders),
    [serviceOrderState.orders]
  );

  const submittedOrdersList = useMemo(
    () =>
      submittedOrders.map((order) => {
        const linkedRequest = latestRequestByPosOrder.get(order.id) || null;
        const approvalStatus = linkedRequest ? linkedRequest.status : "Not requested";
        return {
          ...order,
          approvalStatus,
          linkedRequestId: linkedRequest?.id || "",
        };
      }),
    [latestRequestByPosOrder, submittedOrders]
  );

  const validatedOrders = useMemo(
    () =>
      submittedOrdersList.filter((order) => {
        const status = normalize(order.approvalStatus);
        return status.includes("approved");
      }),
    [submittedOrdersList]
  );

  const rejectedOrders = useMemo(
    () =>
      submittedOrdersList
        .map((order) => {
          const linkedRequest = latestRequestByPosOrder.get(order.id);
          if (!linkedRequest) {
            return null;
          }
          const status = normalize(linkedRequest.status);
          if (!status.includes("rejected")) {
            return null;
          }
          const latestLifecycleNote =
            [...(linkedRequest.lifecycle || [])]
              .reverse()
              .find((entry) => normalize(entry.stage).includes("rejected"))?.note || "";
          const reason =
            linkedRequest.approval?.note ||
            latestLifecycleNote ||
            "No rejection reason recorded.";
          return {
            id: order.id,
            serviceType: order.serviceType,
            total: order.total,
            requestId: linkedRequest.id,
            rejectedAt: linkedRequest.approval?.decidedAt || linkedRequest.updatedAt,
            reason,
          };
        })
        .filter(Boolean),
    [latestRequestByPosOrder, submittedOrdersList]
  );

  const creditMemoRows = useMemo(
    () =>
      [...billingState.creditNotes]
        .map((note) => {
          const invoice = billingState.invoices.find((item) => item.id === note.invoiceId) || null;
          return {
            ...note,
            invoiceId: note.invoiceId,
            orderId: invoice?.orderId || "N/A",
            vehicleId: invoice?.vehicleId || "N/A",
          };
        })
        .sort((a, b) => toTime(b.date) - toTime(a.date)),
    [billingState.creditNotes, billingState.invoices]
  );

  const paymentSchedule = useMemo(
    () =>
      [...billingState.invoices]
        .map((invoice) => {
          const dueDate = addDays(invoice.date, 15);
          const dueTs = toTime(dueDate);
          const todayTs = toTime(new Date().toISOString());
          const isOverdue = invoice.status !== "Paid" && dueTs > 0 && dueTs < todayTs;
          const scheduleStatus =
            invoice.status === "Paid"
              ? "Settled"
              : isOverdue
              ? "Overdue"
              : invoice.status === "Processing"
              ? "In processing"
              : "Upcoming";
          return {
            id: invoice.id,
            orderId: invoice.orderId,
            amount: invoice.totalAmount,
            invoiceDate: invoice.date,
            dueDate,
            scheduleStatus,
          };
        })
        .sort((a, b) => toTime(a.dueDate) - toTime(b.dueDate)),
    [billingState.invoices]
  );

  const settlementHistory = useMemo(() => {
    const paidEntries = billingState.invoices
      .filter((invoice) => invoice.status === "Paid")
      .map((invoice) => ({
        id: `SETTLE-${invoice.id}`,
        type: "Settlement",
        ref: invoice.id,
        details: `Order ${invoice.orderId} settled`,
        amount: invoice.totalAmount,
        date: invoice.date,
      }));

    const creditEntries = billingState.creditNotes.map((note) => ({
      id: `CREDIT-${note.id}`,
      type: "Credit Memo",
      ref: note.id,
      details: `${note.reason} (${note.invoiceId})`,
      amount: -Math.abs(Number(note.amount) || 0),
      date: note.date,
    }));

    return [...paidEntries, ...creditEntries].sort((a, b) => toTime(b.date) - toTime(a.date));
  }, [billingState.creditNotes, billingState.invoices]);

  const invoiceById = useMemo(
    () => new Map(billingState.invoices.map((invoice) => [invoice.id, invoice])),
    [billingState.invoices]
  );

  const invoiceByOrderId = useMemo(
    () => new Map(billingState.invoices.map((invoice) => [invoice.orderId, invoice])),
    [billingState.invoices]
  );

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

  const paymentScheduleSectionRef = useRef(null);
  const settlementHistorySectionRef = useRef(null);

  useEffect(() => {
    if (!initialFocus) {
      return;
    }
    const focusMap = {
      "payment-schedule": paymentScheduleSectionRef,
      "settlement-history": settlementHistorySectionRef,
    };
    const targetRef = focusMap[String(initialFocus).toLowerCase()];
    if (!targetRef?.current) {
      return;
    }
    window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [initialFocus]);

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Submitted orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{submittedOrdersList.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Validated orders</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{validatedOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Rejected orders</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{rejectedOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Credit memos</p>
          <p className="mt-2 text-2xl font-semibold text-violet-700">{creditMemoRows.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div
          className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
          ref={paymentScheduleSectionRef}
        >
          <h2 className="text-lg font-semibold text-slate-900">Submitted orders list</h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {submittedOrdersList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No submitted orders found.
              </p>
            ) : (
              submittedOrdersList.map((order) => {
                const linkedInvoice =
                  invoiceByOrderId.get(order.linkedRequestId) || invoiceByOrderId.get(order.id) || null;
                return (
                  <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {order.id} - {order.serviceType}
                    </p>
                    <p className="text-slate-600">
                      Total: {formatCurrency(order.total)} | Status: {order.approvalStatus}
                    </p>
                    <p className="text-xs text-slate-500">
                      Linked request: {order.linkedRequestId || "Not created"}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Button
                        disabled={!linkedInvoice}
                        onClick={() => handleDownloadInvoice(linkedInvoice)}
                        size="sm"
                        type="button"
                        variant="outline"
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
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CheckCircle2 size={18} />
            Validated orders
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {validatedOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No validated orders yet.
              </p>
            ) : (
              validatedOrders.map((order) => {
                const linkedInvoice =
                  invoiceByOrderId.get(order.linkedRequestId) || invoiceByOrderId.get(order.id) || null;
                return (
                  <div key={order.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                    <p className="font-semibold text-emerald-900">
                      {order.id} - {order.serviceType}
                    </p>
                    <p className="text-emerald-700">
                      Approved amount: {formatCurrency(order.total)} | {order.approvalStatus}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Button
                        disabled={!linkedInvoice}
                        onClick={() => handleDownloadInvoice(linkedInvoice)}
                        size="sm"
                        type="button"
                        variant="outline"
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
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileWarning size={18} />
            Rejected orders with reason
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {rejectedOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No rejected orders.
              </p>
            ) : (
              rejectedOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
                  <p className="font-semibold text-rose-900">
                    {order.id} - {order.serviceType}
                  </p>
                  <p className="text-rose-700">Reason: {order.reason}</p>
                  <p className="text-xs text-rose-600">
                    Request {order.requestId} | {formatDate(order.rejectedAt)}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      disabled={!invoiceByOrderId.get(order.requestId)}
                      onClick={() => handleDownloadInvoice(invoiceByOrderId.get(order.requestId))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Download invoice
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CreditCard size={18} />
            Credit memo tracking
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {creditMemoRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No credit memos found.
              </p>
            ) : (
              creditMemoRows.map((memo) => (
                <div key={memo.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">
                    {memo.id} - {memo.status}
                  </p>
                  <p className="text-slate-700">
                    {memo.reason} | {formatCurrency(memo.amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Invoice: {memo.invoiceId} | Order: {memo.orderId} | {formatDate(memo.date)}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      disabled={!invoiceById.get(memo.invoiceId)}
                      onClick={() => handleDownloadInvoice(invoiceById.get(memo.invoiceId))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Download invoice
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarClock size={18} />
            Payment schedule tracking
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {paymentSchedule.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No payment schedule available.
              </p>
            ) : (
              paymentSchedule.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-xl border p-3 text-sm ${
                    row.id === initialInvoiceId
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">
                    {row.id} - {row.orderId}
                  </p>
                  <p className="text-slate-700">
                    {formatCurrency(row.amount)} | {row.scheduleStatus}
                  </p>
                  <p className="text-xs text-slate-500">
                    Invoice: {formatDate(row.invoiceDate)} | Due: {formatDate(row.dueDate)}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      disabled={!invoiceById.get(row.id)}
                      onClick={() => handleDownloadInvoice(invoiceById.get(row.id))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Download invoice
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm"
          ref={settlementHistorySectionRef}
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <History size={18} />
            Settlement history
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {settlementHistory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No settlement history yet.
              </p>
            ) : (
              settlementHistory.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 text-sm ${
                    item.ref === initialInvoiceId
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">
                    {item.type} - {item.ref}
                  </p>
                  <p className="text-slate-700">{item.details}</p>
                  <p
                    className={`text-xs font-semibold ${
                      item.amount < 0 ? "text-violet-700" : "text-emerald-700"
                    }`}
                  >
                    {item.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(item.amount))}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      disabled={item.type !== "Settlement" || !invoiceById.get(item.ref)}
                      onClick={() => handleDownloadInvoice(invoiceById.get(item.ref))}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Download invoice
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

export default POSBillingSettlementControl;
