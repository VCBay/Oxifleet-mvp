import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Building2, Search, Send, UserRound, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useIsMobile } from "../hooks/use-mobile";
import { getDriverState, subscribeDrivers } from "../data/driverStore";
import {
  getDriverOperationsState,
  subscribeDriverOperations,
} from "../data/driverOperationsStore";
import {
  getCommunicationState,
  sendDriverMessage,
  sendWorkshopMessage,
  subscribeCommunication,
} from "../data/communicationStore";

const normalize = (value) => String(value || "").trim().toLowerCase();
const toTimestamp = (value) => new Date(value).getTime() || 0;

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

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const fallbackFleetOwners = [
  {
    id: "fleet-main",
    name: "Fleet Control",
    subtitle: "Primary fleet owner channel",
  },
  {
    id: "fleet-regional",
    name: "Regional Fleet Owner",
    subtitle: "Regional approvals and escalation",
  },
];

function POSCommunicationControl({ session = null }) {
  const isMobile = useIsMobile();
  const driverState = useSyncExternalStore(
    subscribeDrivers,
    getDriverState,
    getDriverState
  );
  const opsState = useSyncExternalStore(
    subscribeDriverOperations,
    getDriverOperationsState,
    getDriverOperationsState
  );
  const communicationState = useSyncExternalStore(
    subscribeCommunication,
    getCommunicationState,
    getCommunicationState
  );

  const workshopIdentity = session?.name || "POS Service Hub";
  const fleetThreadPrefix = `WSH-${workshopIdentity}::`;

  const [activeTab, setActiveTab] = useState("drivers");
  const [searchText, setSearchText] = useState("");
  const [activeDriverContactId, setActiveDriverContactId] = useState("");
  const [activeFleetContactId, setActiveFleetContactId] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  const driverThreadMap = useMemo(() => {
    const grouped = new Map();
    communicationState.driverMessages.forEach((row) => {
      const key = String(row.driverId || "").trim();
      if (!key) {
        return;
      }
      const current = grouped.get(key) || [];
      current.push(row);
      grouped.set(key, current);
    });
    return grouped;
  }, [communicationState.driverMessages]);

  const driverContacts = useMemo(() => {
    const contacts = new Map();
    [...driverState.drivers]
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .forEach((driver) => {
        const key = String(driver.id || "").trim();
        if (!key) {
          return;
        }
        const threadRows = [...(driverThreadMap.get(key) || [])].sort(
          (a, b) => toTimestamp(a.sentAt) - toTimestamp(b.sentAt)
        );
        const latest = threadRows[threadRows.length - 1];
        contacts.set(key, {
          id: key,
          refId: key,
          name: driver.name || key,
          subtitle:
            `${key}${driver.assignedVehicleId ? ` | ${driver.assignedVehicleId}` : ""}`.trim(),
          type: "driver",
          threadId: `DRV-${key}`,
          messages: threadRows,
          latestAt: latest?.sentAt || "",
          latestMessage: latest?.message || "Start conversation",
        });
      });

    driverThreadMap.forEach((rows, key) => {
      if (contacts.has(key)) {
        return;
      }
      const threadRows = [...rows].sort((a, b) => toTimestamp(a.sentAt) - toTimestamp(b.sentAt));
      const latest = threadRows[threadRows.length - 1];
      contacts.set(key, {
        id: key,
        refId: key,
        name: latest?.driverName || key,
        subtitle: key,
        type: "driver",
        threadId: `DRV-${key}`,
        messages: threadRows,
        latestAt: latest?.sentAt || "",
        latestMessage: latest?.message || "Start conversation",
      });
    });

    return Array.from(contacts.values()).sort(
      (a, b) => toTimestamp(b.latestAt) - toTimestamp(a.latestAt)
    );
  }, [driverState.drivers, driverThreadMap]);

  const baseFleetOwners = useMemo(() => {
    const byId = new Map();
    opsState.tenants.forEach((tenant) => {
      const id = `fleet-${slugify(tenant.name || tenant.id || "owner")}`;
      byId.set(id, {
        id,
        name: tenant.name || "Fleet owner",
        subtitle: tenant.region || "Fleet channel",
      });
    });
    fallbackFleetOwners.forEach((item) => {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });
    return Array.from(byId.values());
  }, [opsState.tenants]);

  const fleetContacts = useMemo(() => {
    const rows = communicationState.workshopMessages.filter((message) => {
      const workshop = normalize(message.workshop);
      const threadId = String(message.threadId || "");
      return workshop === normalize(workshopIdentity) || threadId.startsWith(fleetThreadPrefix);
    });

    const map = new Map(
      baseFleetOwners.map((item) => [
        item.id,
        {
          ...item,
          type: "fleet",
          threadId: `${fleetThreadPrefix}${item.id}`,
          messages: [],
          latestAt: "",
          latestMessage: "Start conversation",
        },
      ])
    );

    rows.forEach((row) => {
      const explicitId = String(row.threadId || "").startsWith(fleetThreadPrefix)
        ? String(row.threadId || "").slice(fleetThreadPrefix.length)
        : "";
      const derivedId =
        explicitId || `fleet-${slugify(row.fromRole === "fleet" ? row.sentBy : "control")}`;
      const existing = map.get(derivedId) || {
        id: derivedId,
        name: row.fromRole === "fleet" ? row.sentBy : "Fleet owner",
        subtitle: "Fleet channel",
        type: "fleet",
        threadId: `${fleetThreadPrefix}${derivedId}`,
        messages: [],
        latestAt: "",
        latestMessage: "Start conversation",
      };
      const nextMessages = [...existing.messages, row].sort(
        (a, b) => toTimestamp(a.sentAt) - toTimestamp(b.sentAt)
      );
      const latest = nextMessages[nextMessages.length - 1];
      map.set(derivedId, {
        ...existing,
        name:
          existing.name ||
          (row.fromRole === "fleet" ? row.sentBy : "Fleet owner"),
        messages: nextMessages,
        latestAt: latest?.sentAt || existing.latestAt,
        latestMessage: latest?.message || existing.latestMessage,
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => toTimestamp(b.latestAt) - toTimestamp(a.latestAt)
    );
  }, [
    baseFleetOwners,
    communicationState.workshopMessages,
    fleetThreadPrefix,
    workshopIdentity,
  ]);

  const filteredDrivers = useMemo(() => {
    if (!searchText.trim()) {
      return driverContacts;
    }
    const q = normalize(searchText);
    return driverContacts.filter((contact) =>
      [contact.name, contact.subtitle, contact.latestMessage].some((value) =>
        normalize(value).includes(q)
      )
    );
  }, [driverContacts, searchText]);

  const filteredFleets = useMemo(() => {
    if (!searchText.trim()) {
      return fleetContacts;
    }
    const q = normalize(searchText);
    return fleetContacts.filter((contact) =>
      [contact.name, contact.subtitle, contact.latestMessage].some((value) =>
        normalize(value).includes(q)
      )
    );
  }, [fleetContacts, searchText]);

  const currentDriverContact =
    filteredDrivers.find((item) => item.id === activeDriverContactId) ||
    driverContacts.find((item) => item.id === activeDriverContactId) ||
    filteredDrivers[0] ||
    driverContacts[0] ||
    null;
  const currentFleetContact =
    filteredFleets.find((item) => item.id === activeFleetContactId) ||
    fleetContacts.find((item) => item.id === activeFleetContactId) ||
    filteredFleets[0] ||
    fleetContacts[0] ||
    null;

  const activeContact = activeTab === "drivers" ? currentDriverContact : currentFleetContact;
  const activeMessages = activeContact?.messages || [];

  const chatMessages = useMemo(
    () =>
      activeMessages.map((message) => ({
        id: message.id,
        text: message.message,
        sender: message.sentBy,
        createdAt: message.sentAt,
        mine:
          normalize(message.fromRole) === "workshop" ||
          normalize(message.sentBy) === normalize(workshopIdentity),
      })),
    [activeMessages, workshopIdentity]
  );

  const listRows = activeTab === "drivers" ? filteredDrivers : filteredFleets;
  const showListPane = !isMobile || !isMobileThreadOpen;
  const showChatPane = !isMobile || isMobileThreadOpen;

  const handleContactSelect = (contactId) => {
    if (activeTab === "drivers") {
      setActiveDriverContactId(contactId);
    } else {
      setActiveFleetContactId(contactId);
    }
    if (isMobile) {
      setIsMobileThreadOpen(true);
    }
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !activeContact) {
      return;
    }
    if (activeTab === "drivers") {
      sendDriverMessage({
        driverId: activeContact.refId,
        driverName: activeContact.name,
        channel: "In-app",
        message: text,
        sentBy: workshopIdentity,
        fromRole: "workshop",
        toRole: "driver",
        threadId: activeContact.threadId,
      });
      setNotice(`Message sent to ${activeContact.name}.`);
    } else {
      sendWorkshopMessage({
        workshop: workshopIdentity,
        channel: "Portal",
        urgency: "Normal",
        message: text,
        sentBy: workshopIdentity,
        fromRole: "workshop",
        toRole: "fleet",
        threadId: activeContact.threadId,
      });
      setNotice(`Message sent to ${activeContact.name}.`);
    }
    setDraft("");
  };

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Communication</h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            POS chat with multiple drivers and fleet owners in one view.
          </p>
        </header>

        <div className="grid min-h-[620px] min-w-0 grid-cols-1 md:min-h-[680px] md:grid-cols-[320px_1fr]">
          {showListPane ? (
            <aside className="min-w-0 border-b border-slate-200 bg-white md:border-b-0 md:border-r">
              <div className="space-y-3 border-b border-slate-200 bg-white p-3 sm:p-4">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <Input
                    className="h-8 rounded-full border-slate-200 bg-slate-50 pl-9 pr-9 text-xs sm:h-9 sm:text-sm"
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search contact"
                    value={searchText}
                  />
                  {searchText ? (
                    <button
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      onClick={() => setSearchText("")}
                      type="button"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                      activeTab === "drivers"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveTab("drivers")}
                    type="button"
                  >
                    Drivers
                  </button>
                  <button
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                      activeTab === "fleets"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveTab("fleets")}
                    type="button"
                  >
                    Fleet owners
                  </button>
                </div>
              </div>

              <div className="card-list-scrollbar max-h-[560px] space-y-1 overflow-y-auto p-2 pr-1">
                {listRows.length === 0 ? (
                  <div className="m-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                    No contacts found.
                  </div>
                ) : (
                  listRows.map((contact) => {
                    const isActive = activeContact?.id === contact.id;
                    return (
                      <button
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-slate-300 bg-slate-100 shadow-sm"
                            : "border-transparent bg-white hover:border-slate-200"
                        }`}
                        key={`${activeTab}-${contact.id}`}
                        onClick={() => handleContactSelect(contact.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                              {contact.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">
                              {contact.subtitle}
                            </p>
                          </div>
                          <p className="shrink-0 text-[10px] text-slate-400 sm:text-[11px]">
                            {formatListTime(contact.latestAt)}
                          </p>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-600 sm:text-xs">
                          {contact.latestMessage}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          ) : null}

          {showChatPane ? (
            <div className="flex min-h-0 min-w-0 flex-col bg-slate-50">
              {isMobile ? (
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      aria-label="Back to contacts"
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600"
                      onClick={() => setIsMobileThreadOpen(false)}
                      type="button"
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {activeContact?.name || "Select contact"}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {activeContact?.subtitle || "Communication"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-700">
                      {activeTab === "drivers" ? <UserRound size={16} /> : <Building2 size={16} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {activeContact?.name || "Select contact"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {activeContact?.subtitle || "Communication channel"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card-list-scrollbar max-h-[470px] flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 pr-1 sm:max-h-[510px] sm:p-4">
                {chatMessages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-3 text-xs text-slate-500">
                    No messages yet.
                  </p>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                      key={message.id}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm sm:max-w-[76%] sm:text-sm ${
                          message.mine
                            ? "rounded-br-md bg-slate-900 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-wide ${
                            message.mine ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {message.sender}
                        </p>
                        <p className="mt-1">{message.text}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            message.mine ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    className="min-h-[44px] resize-none bg-slate-50 text-xs sm:text-sm"
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      activeTab === "drivers"
                        ? "Message driver..."
                        : "Message fleet owner..."
                    }
                    rows={1}
                    value={draft}
                  />
                  <Button
                    // className="w-full sm:w-auto"
                    disabled={!activeContact || !draft.trim()}
                    onClick={sendMessage}
                    type="button"
                    className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                  // disabled={isCompletionSubmitting}
                  >
                    <Send className="mr-2" size={14} />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 shadow-sm sm:text-sm">
          {notice}
        </div>
      ) : null}
    </section>
  );
}

export default POSCommunicationControl;
