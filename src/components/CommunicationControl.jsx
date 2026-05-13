import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  Search,
  Send,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { getDriverState, subscribeDrivers } from "../data/driverStore";
import { getServiceOrderState, subscribeServiceOrders } from "../data/serviceOrderStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  createSupportTicket,
  escalateSupportTicket,
  getCommunicationState,
  reopenSupportTicket,
  resolveSupportTicket,
  sendDriverMessage,
  sendWorkshopMessage,
  subscribeCommunication,
} from "../data/communicationStore";

const NONE = "__none__";

const parseTime = (value) => new Date(value).getTime() || 0;

const formatDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatListTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }
  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("resolved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value.includes("escalated")) {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
};

const listRowIconForTab = (tab) => {
  if (tab === "workshop") {
    return Wrench;
  }
  if (tab === "support") {
    return LifeBuoy;
  }
  return UserRound;
};

const translateCommunicationStatus = (t, value) => {
  const labels = {
    Open: t("fleet.communication.statusOpen", "Open"),
    Resolved: t("fleet.communication.statusResolved", "Resolved"),
    Escalated: t("fleet.communication.statusEscalated", "Escalated"),
  };
  return labels[value] || value;
};

const translateCommunicationChannel = (t, value) => {
  const labels = {
    "In-app": t("fleet.communication.channelInApp", "In-app"),
    SMS: t("fleet.communication.channelSms", "SMS"),
    Email: t("fleet.communication.channelEmail", "Email"),
    Portal: t("fleet.communication.channelPortal", "Portal"),
    Call: t("fleet.communication.channelCall", "Call"),
  };
  return labels[value] || value;
};

const translateCommunicationUrgency = (t, value) => {
  const labels = {
    Normal: t("fleet.communication.urgencyNormal", "Normal"),
    High: t("fleet.communication.urgencyHigh", "High"),
    Emergency: t("fleet.communication.urgencyEmergency", "Emergency"),
  };
  return labels[value] || value;
};

const translateCommunicationPriority = (t, value) => {
  const labels = {
    Low: t("fleet.communication.priorityLow", "Low"),
    Medium: t("fleet.communication.priorityMedium", "Medium"),
    High: t("fleet.communication.priorityHigh", "High"),
    Critical: t("fleet.communication.priorityCritical", "Critical"),
  };
  return labels[value] || value;
};

const translateCommunicationCategory = (t, value) => {
  const labels = {
    "Driver support": t("fleet.communication.categoryDriverSupport", "Driver support"),
    "Workshop coordination": t(
      "fleet.communication.categoryWorkshopCoordination",
      "Workshop coordination",
    ),
    Billing: t("fleet.communication.categoryBilling", "Billing"),
    Technical: t("fleet.communication.categoryTechnical", "Technical"),
  };
  return labels[value] || value;
};

const translateCommunicationActor = (t, value) => {
  const labels = {
    "Ops Control": t("fleet.communication.actorOpsControl", "Ops Control"),
    "Service Desk": t("fleet.communication.actorServiceDesk", "Service Desk"),
    "Support Team": t("fleet.communication.actorSupportTeam", "Support Team"),
  };
  return labels[value] || value;
};

function CommunicationControl() {
  const { t } = useTranslation();
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const serviceOrderState = useSyncExternalStore(
    subscribeServiceOrders,
    getServiceOrderState,
    getServiceOrderState
  );
  const communicationState = useSyncExternalStore(
    subscribeCommunication,
    getCommunicationState,
    getCommunicationState
  );

  const drivers = useMemo(
    () =>
      [...driverState.drivers].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      ),
    [driverState.drivers]
  );

  const workshops = useMemo(() => {
    const fromOrders = serviceOrderState.orders
      .map((order) => order.orderDetails?.vendor)
      .filter(Boolean);
    const defaults = [
      "Metro Service Hub",
      "Westline Tire Care",
      "Northern Fleet Works",
      "RapidTow Services",
    ];
    return Array.from(new Set([...fromOrders, ...defaults]));
  }, [serviceOrderState.orders]);

  const driverThreads = useMemo(() => {
    const map = new Map();
    communicationState.driverMessages.forEach((row) => {
      const threadId = row.threadId || `DRV-${row.driverId || "UNASSIGNED"}`;
      const current = map.get(threadId) || [];
      current.push(row);
      map.set(threadId, current);
    });

    return Array.from(map.entries())
      .map(([id, rows]) => {
        const messages = [...rows].sort((a, b) => parseTime(a.sentAt) - parseTime(b.sentAt));
        const latest = messages[messages.length - 1];
        return {
          id,
          title:
            latest?.driverName ||
            latest?.driverId ||
            t("fleet.communication.unknownDriver", "Unknown driver"),
          ref: latest?.driverId || t("fleet.communication.notAvailable", "N/A"),
          latestMessage: latest?.message || "",
          latestAt: latest?.sentAt || "",
          messages,
        };
      })
      .sort((a, b) => parseTime(b.latestAt) - parseTime(a.latestAt));
  }, [communicationState.driverMessages, t]);

  const workshopThreads = useMemo(() => {
    const map = new Map();
    communicationState.workshopMessages.forEach((row) => {
      const threadId = row.threadId || `WSH-${row.workshop || "UNASSIGNED"}`;
      const current = map.get(threadId) || [];
      current.push(row);
      map.set(threadId, current);
    });

    return Array.from(map.entries())
      .map(([id, rows]) => {
        const messages = [...rows].sort((a, b) => parseTime(a.sentAt) - parseTime(b.sentAt));
        const latest = messages[messages.length - 1];
        return {
          id,
          title:
            latest?.workshop ||
            t("fleet.communication.unknownWorkshop", "Unknown workshop"),
          ref: `${translateCommunicationUrgency(
            t,
            latest?.urgency || "Normal",
          )} ${t("fleet.communication.prioritySuffix", "priority")}`,
          latestMessage: latest?.message || "",
          latestAt: latest?.sentAt || "",
          messages,
        };
      })
      .sort((a, b) => parseTime(b.latestAt) - parseTime(a.latestAt));
  }, [communicationState.workshopMessages, t]);

  const tickets = useMemo(
    () => [...communicationState.tickets].sort((a, b) => parseTime(b.updatedAt) - parseTime(a.updatedAt)),
    [communicationState.tickets]
  );

  const [activeTab, setActiveTab] = useState("driver");
  const [searchText, setSearchText] = useState("");

  const [activeDriverThreadId, setActiveDriverThreadId] = useState("");
  const [activeWorkshopThreadId, setActiveWorkshopThreadId] = useState("");
  const [activeTicketId, setActiveTicketId] = useState("");

  const [driverTargetId, setDriverTargetId] = useState(NONE);
  const [workshopTarget, setWorkshopTarget] = useState(NONE);
  const [driverChannel, setDriverChannel] = useState("In-app");
  const [workshopChannel, setWorkshopChannel] = useState("Email");
  const [workshopUrgency, setWorkshopUrgency] = useState("Normal");
  const [driverDraft, setDriverDraft] = useState("");
  const [workshopDraft, setWorkshopDraft] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "Driver support",
    priority: "Medium",
    relatedRef: "",
    description: "",
    assignee: "Support Team",
  });

  const currentDriverThreadId = driverThreads.some((row) => row.id === activeDriverThreadId)
    ? activeDriverThreadId
    : driverThreads[0]?.id || "";
  const currentWorkshopThreadId = workshopThreads.some(
    (row) => row.id === activeWorkshopThreadId
  )
    ? activeWorkshopThreadId
    : workshopThreads[0]?.id || "";
  const currentTicketId = tickets.some((row) => row.id === activeTicketId)
    ? activeTicketId
    : tickets[0]?.id || "";

  const activeDriverThread = driverThreads.find((row) => row.id === currentDriverThreadId) || null;
  const activeWorkshopThread =
    workshopThreads.find((row) => row.id === currentWorkshopThreadId) || null;
  const activeTicket = tickets.find((row) => row.id === currentTicketId) || null;

  const selectedDriverTargetId =
    driverTargetId !== NONE ? driverTargetId : activeDriverThread?.ref || NONE;
  const selectedWorkshopTarget =
    workshopTarget !== NONE ? workshopTarget : activeWorkshopThread?.title || NONE;
  const hasSelectedDriverOption = drivers.some((driver) => driver.id === selectedDriverTargetId);
  const hasSelectedWorkshopOption = workshops.includes(selectedWorkshopTarget);

  const filteredDrivers = useMemo(() => {
    if (!searchText.trim()) {
      return driverThreads;
    }
    const search = searchText.trim().toLowerCase();
    return driverThreads.filter((row) =>
      [row.title, row.ref, row.latestMessage].join(" ").toLowerCase().includes(search)
    );
  }, [driverThreads, searchText]);

  const filteredWorkshops = useMemo(() => {
    if (!searchText.trim()) {
      return workshopThreads;
    }
    const search = searchText.trim().toLowerCase();
    return workshopThreads.filter((row) =>
      [row.title, row.ref, row.latestMessage].join(" ").toLowerCase().includes(search)
    );
  }, [searchText, workshopThreads]);

  const filteredTickets = useMemo(() => {
    if (!searchText.trim()) {
      return tickets;
    }
    const search = searchText.trim().toLowerCase();
    return tickets.filter((row) =>
      [row.id, row.subject, row.status, row.priority, row.relatedRef]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [searchText, tickets]);

  const sendDriver = () => {
    if (selectedDriverTargetId === NONE || !driverDraft.trim()) {
      return;
    }
    const driver = drivers.find((item) => item.id === selectedDriverTargetId);
    const threadId = `DRV-${selectedDriverTargetId}`;
    sendDriverMessage({
      driverId: selectedDriverTargetId,
      driverName: driver?.name || selectedDriverTargetId,
      channel: driverChannel,
      message: driverDraft.trim(),
      sentBy: "Ops Control",
      fromRole: "fleet",
      toRole: "driver",
      threadId,
    });
    setActiveDriverThreadId(threadId);
    setDriverDraft("");
    setNotice(
      t("fleet.communication.noticeMessageSentTo", {
        defaultValue: "Message sent to {{target}}.",
        target: driver?.name || selectedDriverTargetId,
      }),
    );
  };

  const sendWorkshop = () => {
    if (selectedWorkshopTarget === NONE || !workshopDraft.trim()) {
      return;
    }
    const threadId = `WSH-${selectedWorkshopTarget}`;
    sendWorkshopMessage({
      workshop: selectedWorkshopTarget,
      channel: workshopChannel,
      urgency: workshopUrgency,
      message: workshopDraft.trim(),
      sentBy: "Service Desk",
      fromRole: "fleet",
      toRole: "workshop",
      threadId,
    });
    setActiveWorkshopThreadId(threadId);
    setWorkshopDraft("");
    setNotice(
      t("fleet.communication.noticeMessageSentTo", {
        defaultValue: "Message sent to {{target}}.",
        target: selectedWorkshopTarget,
      }),
    );
  };

  const createTicket = () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      return;
    }
    const created = createSupportTicket({
      subject: ticketForm.subject,
      category: ticketForm.category,
      priority: ticketForm.priority,
      relatedRef: ticketForm.relatedRef,
      description: ticketForm.description,
      assignee: ticketForm.assignee,
      createdBy: "Ops Control",
      status: "Open",
      escalationLevel: 0,
    });
    setActiveTab("support");
    setActiveTicketId(created.id);
    setTicketForm((prev) => ({ ...prev, subject: "", relatedRef: "", description: "" }));
    setNotice(
      t("fleet.communication.noticeTicketCreated", {
        defaultValue: "Ticket {{id}} created.",
        id: created.id,
      }),
    );
  };

  const escalate = () => {
    if (!activeTicket) {
      return;
    }
    const updated = escalateSupportTicket(activeTicket.id, note);
    if (updated) {
      setNotice(
        t("fleet.communication.noticeTicketEscalated", {
          defaultValue: "{{id}} escalated.",
          id: updated.id,
        }),
      );
    }
    setNote("");
  };

  const resolve = () => {
    if (!activeTicket) {
      return;
    }
    const updated = resolveSupportTicket(activeTicket.id, note);
    if (updated) {
      setNotice(
        t("fleet.communication.noticeTicketResolved", {
          defaultValue: "{{id}} resolved.",
          id: updated.id,
        }),
      );
    }
    setNote("");
  };

  const reopen = () => {
    if (!activeTicket) {
      return;
    }
    const updated = reopenSupportTicket(activeTicket.id);
    if (updated) {
      setNotice(
        t("fleet.communication.noticeTicketReopened", {
          defaultValue: "{{id}} reopened.",
          id: updated.id,
        }),
      );
    }
    setNote("");
  };

  const listRows =
    activeTab === "driver"
      ? filteredDrivers
      : activeTab === "workshop"
      ? filteredWorkshops
      : filteredTickets;

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <header
          className="hidden overflow-hidden rounded-right-top bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-5 text-white shadow-lg sm:p-7 lg:block"
          // className="border-b border-slate-200 px-5 py-4"
        >
          <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
            {t("fleet.communication.hubTitle", "Communication Hub")}
          </h2>
          <p className="text-xs text-white/50">
            {t(
              "fleet.communication.hubDesc",
              "Chat-style view while keeping existing message and ticket flow.",
            )}
          </p>
        </header>

        <div className="grid min-h-[620px] min-w-0 grid-cols-1 md:min-h-[680px] md:grid-cols-[300px_1fr] lg:grid-cols-[330px_1fr]">
          <aside className="min-w-0 border-b border-slate-200 bg-white md:border-b-0 md:border-r">
            <div className="space-y-3 border-b border-slate-200 bg-white p-3 sm:p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <Input
                  className="h-8 rounded-full border-slate-200 bg-slate-50 pl-9 pr-9 text-xs sm:h-9 sm:text-sm"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={t("fleet.communication.search", "Search")}
                />
                {searchText ? (
                  <button
                    aria-label={t("fleet.communication.clearSearch", "Clear search")}
                    className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    onClick={() => setSearchText("")}
                    type="button"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["driver", t("fleet.communication.tabDrivers", "Drivers")],
                  ["workshop", t("fleet.communication.tabWorkshop", "Workshop")],
                  ["support", t("fleet.communication.tabSupport", "Support")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                      activeTab === key
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-list-scrollbar max-h-[260px] space-y-1 overflow-y-auto p-2 pr-1 md:max-h-[600px]">
              {listRows.length === 0 ? (
                <div className="m-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                  {t("fleet.communication.noItemsFound", "No items found.")}
                </div>
              ) : null}

              {activeTab === "driver"
                ? listRows.map((row) => {
                    const RowIcon = listRowIconForTab("driver");
                    return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setActiveDriverThreadId(row.id)}
                      className={`w-full min-w-0 rounded-2xl border px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                        activeDriverThread?.id === row.id
                          ? "border-slate-300 bg-slate-100 shadow-sm"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 sm:size-9">
                            <RowIcon size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                              {row.title}
                            </p>
                            <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">
                              {row.ref}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 sm:text-[11px]">
                          {formatListTime(row.latestAt)}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-1 text-[11px] text-slate-600 sm:text-xs">
                        {row.latestMessage}
                      </p>
                    </button>
                  )})
                : null}

              {activeTab === "workshop"
                ? listRows.map((row) => {
                    const RowIcon = listRowIconForTab("workshop");
                    return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setActiveWorkshopThreadId(row.id)}
                      className={`w-full min-w-0 rounded-2xl border px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                        activeWorkshopThread?.id === row.id
                          ? "border-slate-300 bg-slate-100 shadow-sm"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 sm:size-9">
                            <RowIcon size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                              {row.title}
                            </p>
                            <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">
                              {row.ref}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 sm:text-[11px]">
                          {formatListTime(row.latestAt)}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-1 text-[11px] text-slate-600 sm:text-xs">
                        {row.latestMessage}
                      </p>
                    </button>
                  )})
                : null}

              {activeTab === "support"
                ? listRows.map((row) => {
                    const RowIcon = listRowIconForTab("support");
                    return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setActiveTicketId(row.id)}
                      className={`w-full min-w-0 rounded-2xl border px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                        activeTicket?.id === row.id
                          ? "border-slate-300 bg-slate-100 shadow-sm"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 sm:size-9">
                            <RowIcon size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                              {row.id}
                            </p>
                            <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">
                              {row.priority} priority
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                            row.status,
                          )}`}
                        >
                        {translateCommunicationStatus(t, row.status)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-1 text-[11px] text-slate-600 sm:text-xs">
                        {row.subject}
                      </p>
                    </button>
                  )})
                : null}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-slate-50">
            {activeTab === "driver" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                      <UserRound size={16} />
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {activeDriverThread?.title ||
                        t("fleet.communication.selectDriver", "Select driver")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={selectedDriverTargetId}
                      onValueChange={setDriverTargetId}
                    >
                      <SelectTrigger className="w-[180px] bg-slate-50">
                        <SelectValue placeholder={t("fleet.communication.driver", "Driver")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("fleet.communication.selectDriver", "Select driver")}</SelectItem>
                        {selectedDriverTargetId !== NONE &&
                        !hasSelectedDriverOption ? (
                          <SelectItem value={selectedDriverTargetId}>
                            {selectedDriverTargetId}
                          </SelectItem>
                        ) : null}
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name} ({driver.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={driverChannel}
                      onValueChange={setDriverChannel}
                    >
                      <SelectTrigger className="w-[120px] bg-slate-50">
                        <SelectValue placeholder={t("fleet.communication.channel", "Channel")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In-app">{translateCommunicationChannel(t, "In-app")}</SelectItem>
                        <SelectItem value="SMS">{translateCommunicationChannel(t, "SMS")}</SelectItem>
                        <SelectItem value="Email">{translateCommunicationChannel(t, "Email")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="card-list-scrollbar max-h-[460px] flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 pr-1 sm:max-h-[500px] sm:p-4">
                  {activeDriverThread?.messages?.map((message) => {
                    const mine =
                      String(message.fromRole || "").toLowerCase() !== "driver";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm sm:max-w-[78%] sm:text-sm ${
                            mine
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              mine ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {translateCommunicationActor(t, message.sentBy)}
                          </p>
                          <p className="mt-1">{message.message}</p>
                          <p
                            className={`mt-1 text-right text-[10px] ${
                              mine ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {formatDateTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
                  <div className="flex gap-2">
                    <Textarea
                      rows={1}
                      value={driverDraft}
                      onChange={(event) => setDriverDraft(event.target.value)}
                      placeholder={t("fleet.communication.typeMessage", "Type message")}
                      className="min-h-[44px] resize-none bg-slate-50"
                    />
                    <Button className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" onClick={sendDriver} type="button">
                      <Send className="mr-2" size={14} />
                      {t("fleet.communication.send", "Send")}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "workshop" ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                      <Wrench size={16} />
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {activeWorkshopThread?.title ||
                        t("fleet.communication.selectWorkshop", "Select workshop")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={selectedWorkshopTarget}
                      onValueChange={setWorkshopTarget}
                    >
                      <SelectTrigger className="w-[210px] bg-slate-50">
                        <SelectValue placeholder={t("fleet.communication.workshop", "Workshop")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("fleet.communication.selectWorkshop", "Select workshop")}</SelectItem>
                        {selectedWorkshopTarget !== NONE &&
                        !hasSelectedWorkshopOption ? (
                          <SelectItem value={selectedWorkshopTarget}>
                            {selectedWorkshopTarget}
                          </SelectItem>
                        ) : null}
                        {workshops.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={workshopChannel}
                      onValueChange={setWorkshopChannel}
                    >
                      <SelectTrigger className="w-[110px] bg-slate-50">
                        <SelectValue placeholder={t("fleet.communication.channel", "Channel")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">{translateCommunicationChannel(t, "Email")}</SelectItem>
                        <SelectItem value="Portal">{translateCommunicationChannel(t, "Portal")}</SelectItem>
                        <SelectItem value="Call">{translateCommunicationChannel(t, "Call")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={workshopUrgency}
                      onValueChange={setWorkshopUrgency}
                    >
                      <SelectTrigger className="w-[120px] bg-slate-50">
                        <SelectValue placeholder={t("fleet.communication.urgency", "Urgency")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">{translateCommunicationUrgency(t, "Normal")}</SelectItem>
                        <SelectItem value="High">{translateCommunicationUrgency(t, "High")}</SelectItem>
                        <SelectItem value="Emergency">{translateCommunicationUrgency(t, "Emergency")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="card-list-scrollbar max-h-[460px] flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 pr-1 sm:max-h-[500px] sm:p-4">
                  {activeWorkshopThread?.messages?.map((message) => {
                    const mine =
                      String(message.fromRole || "").toLowerCase() !==
                      "workshop";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm sm:max-w-[78%] sm:text-sm ${
                            mine
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              mine ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {translateCommunicationActor(t, message.sentBy)}
                          </p>
                          <p className="mt-1">{message.message}</p>
                          <p
                            className={`mt-1 text-[10px] ${mine ? "text-slate-300" : "text-slate-500"}`}
                          >
                            {translateCommunicationChannel(t, message.channel)} | {translateCommunicationUrgency(t, message.urgency)}
                          </p>
                          <p
                            className={`text-right text-[10px] ${
                              mine ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {formatDateTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
                  <div className="flex gap-2">
                    <Textarea
                      rows={1}
                      value={workshopDraft}
                      onChange={(event) => setWorkshopDraft(event.target.value)}
                      placeholder={t("fleet.communication.typeWorkshopMessage", "Type workshop message")}
                      className="min-h-[44px] resize-none bg-slate-50"
                    />
                    <Button
                      className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                      onClick={sendWorkshop}
                      type="button"
                    >
                      <Send className="mr-2" size={14} />
                      {t("fleet.communication.send", "Send")}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "support" ? (
              <div className="grid flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[1.1fr_1fr]">
                <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {activeTicket
                          ? `${activeTicket.id} - ${activeTicket.subject}`
                          : t("fleet.communication.selectTicket", "Select ticket")}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {activeTicket
                          ? `${translateCommunicationCategory(
                              t,
                              activeTicket.category,
                            )} | ${translateCommunicationPriority(
                              t,
                              activeTicket.priority,
                            )} | ${t("fleet.communication.refLabel", "Ref")}: ${
                              activeTicket.relatedRef ||
                              t("fleet.communication.notAvailableShort", "NA")
                            }`
                          : t("fleet.communication.chooseFromLeftList", "Choose from the left list")}
                      </p>
                    </div>
                    {activeTicket ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          activeTicket.status,
                        )}`}
                      >
                        {translateCommunicationStatus(t, activeTicket.status)}
                      </span>
                    ) : null}
                  </div>

                  {activeTicket ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p>{activeTicket.description}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {t("fleet.communication.createdBy", "Created by")} {translateCommunicationActor(t, activeTicket.createdBy)} | {t("fleet.communication.assignedTo", "Assigned to")}{" "}
                          {translateCommunicationActor(t, activeTicket.assignee)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("fleet.communication.updated", "Updated")} {formatDateTime(activeTicket.updatedAt)} |
                          {" "}{t("fleet.communication.escalationLevel", "Escalation L")}{activeTicket.escalationLevel}
                        </p>
                      </div>
                      <Textarea
                        rows={3}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={t("fleet.communication.escalationResolutionNote", "Escalation or resolution note")}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={escalate}
                          type="button"
                          variant="destructive"
                        >
                          <AlertTriangle className="mr-2" size={14} />
                          {t("fleet.communication.escalate", "Escalate")}
                        </Button>
                        <Button
                          onClick={resolve}
                          type="button"
                          variant="outline"
                        >
                          <CheckCircle2 className="mr-2" size={14} />
                          {t("fleet.communication.resolve", "Resolve")}
                        </Button>
                        <Button
                          onClick={reopen}
                          type="button"
                          variant="secondary"
                        >
                          {t("fleet.communication.reopen", "Reopen")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">
                    {t("fleet.communication.createSupportTicket", "Create support ticket")}
                  </h3>
                  <div className="mt-3 space-y-3">
                    <Input
                      value={ticketForm.subject}
                      onChange={(event) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          subject: event.target.value,
                        }))
                      }
                      placeholder={t("fleet.communication.ticketSubject", "Ticket subject")}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={ticketForm.category}
                        onValueChange={(value) =>
                          setTicketForm((prev) => ({
                            ...prev,
                            category: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fleet.communication.category", "Category")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Driver support">
                            {translateCommunicationCategory(t, "Driver support")}
                          </SelectItem>
                          <SelectItem value="Workshop coordination">
                            {translateCommunicationCategory(t, "Workshop coordination")}
                          </SelectItem>
                          <SelectItem value="Billing">{translateCommunicationCategory(t, "Billing")}</SelectItem>
                          <SelectItem value="Technical">{translateCommunicationCategory(t, "Technical")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={ticketForm.priority}
                        onValueChange={(value) =>
                          setTicketForm((prev) => ({
                            ...prev,
                            priority: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fleet.communication.priority", "Priority")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">{translateCommunicationPriority(t, "Low")}</SelectItem>
                          <SelectItem value="Medium">{translateCommunicationPriority(t, "Medium")}</SelectItem>
                          <SelectItem value="High">{translateCommunicationPriority(t, "High")}</SelectItem>
                          <SelectItem value="Critical">{translateCommunicationPriority(t, "Critical")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={ticketForm.relatedRef}
                      onChange={(event) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          relatedRef: event.target.value,
                        }))
                      }
                      placeholder={t("fleet.communication.relatedReference", "Related reference")}
                    />
                    <Input
                      value={ticketForm.assignee}
                      onChange={(event) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          assignee: event.target.value,
                        }))
                      }
                      placeholder={t("fleet.communication.assignee", "Assignee")}
                    />
                    <Textarea
                      rows={4}
                      value={ticketForm.description}
                      onChange={(event) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t("fleet.communication.issueDescription", "Issue description")}
                    />
                    <Button
                      className="w-full"
                      onClick={createTicket}
                      type="button"
                    >
                      <LifeBuoy className="mr-2" size={14} />
                      {t("fleet.communication.createTicket", "Create ticket")}
                    </Button>
                  </div>
                </article>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {t("fleet.communication.dismiss", "Dismiss")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default CommunicationControl;
