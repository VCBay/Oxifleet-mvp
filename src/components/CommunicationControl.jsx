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
import { getDriverState, subscribeDrivers } from "../data/driverStore";
import {
  getServiceOrderState,
  subscribeServiceOrders,
} from "../data/serviceOrderStore";
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

const statusClassName = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("resolved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("escalated")) {
    return "bg-rose-100 text-rose-700";
  }
  if (normalized.includes("open")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
};

function CommunicationControl() {
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

  const tickets = useMemo(
    () =>
      [...communicationState.tickets].sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime() || 0;
        const timeB = new Date(b.updatedAt).getTime() || 0;
        return timeB - timeA;
      }),
    [communicationState.tickets]
  );

  const [driverMessageForm, setDriverMessageForm] = useState({
    driverId: "__none__",
    channel: "In-app",
    message: "",
  });
  const [workshopMessageForm, setWorkshopMessageForm] = useState({
    workshop: "__none__",
    channel: "Email",
    urgency: "Normal",
    message: "",
  });
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "Driver support",
    priority: "Medium",
    relatedRef: "",
    description: "",
    assignee: "Support Team",
  });
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [escalationNote, setEscalationNote] = useState("");

  const selectedTicket = useMemo(() => {
    const explicit = tickets.find((ticket) => ticket.id === selectedTicketId);
    if (explicit) {
      return explicit;
    }
    return tickets[0] || null;
  }, [selectedTicketId, tickets]);

  const openTickets = tickets.filter((ticket) =>
    String(ticket.status || "").toLowerCase().includes("open")
  );
  const escalatedTickets = tickets.filter((ticket) =>
    String(ticket.status || "").toLowerCase().includes("escalated")
  );
  const resolvedTickets = tickets.filter((ticket) =>
    String(ticket.status || "").toLowerCase().includes("resolved")
  );

  const handleSendDriverMessage = () => {
    if (
      driverMessageForm.driverId === "__none__" ||
      !driverMessageForm.message.trim()
    ) {
      return;
    }
    const driver = drivers.find((item) => item.id === driverMessageForm.driverId);
    sendDriverMessage({
      driverId: driverMessageForm.driverId,
      driverName: driver?.name || driverMessageForm.driverId,
      channel: driverMessageForm.channel,
      message: driverMessageForm.message,
      sentBy: "Ops Control",
    });
    setDriverMessageForm((prev) => ({
      ...prev,
      message: "",
    }));
  };

  const handleSendWorkshopMessage = () => {
    if (
      workshopMessageForm.workshop === "__none__" ||
      !workshopMessageForm.message.trim()
    ) {
      return;
    }
    sendWorkshopMessage({
      workshop: workshopMessageForm.workshop,
      channel: workshopMessageForm.channel,
      urgency: workshopMessageForm.urgency,
      message: workshopMessageForm.message,
      sentBy: "Service Desk",
    });
    setWorkshopMessageForm((prev) => ({
      ...prev,
      message: "",
    }));
  };

  const handleCreateTicket = () => {
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
    setSelectedTicketId(created.id);
    setTicketForm((prev) => ({
      ...prev,
      subject: "",
      relatedRef: "",
      description: "",
    }));
  };

  const handleEscalate = () => {
    if (!selectedTicket) {
      return;
    }
    escalateSupportTicket(selectedTicket.id, escalationNote);
    setEscalationNote("");
  };

  const handleResolve = () => {
    if (!selectedTicket) {
      return;
    }
    resolveSupportTicket(selectedTicket.id, escalationNote);
    setEscalationNote("");
  };

  const handleReopen = () => {
    if (!selectedTicket) {
      return;
    }
    reopenSupportTicket(selectedTicket.id);
    setEscalationNote("");
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Communication</h2>
        <p className="mt-1 text-sm text-slate-500">
          Message drivers and workshops, create support tickets, and manage
          escalations in one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Message driver</h3>
          <div className="mt-4 grid gap-3">
            <Select
              onValueChange={(value) =>
                setDriverMessageForm((prev) => ({ ...prev, driverId: value }))
              }
              value={driverMessageForm.driverId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select driver</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name} ({driver.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setDriverMessageForm((prev) => ({ ...prev, channel: value }))
              }
              value={driverMessageForm.channel}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In-app">In-app</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              onChange={(event) =>
                setDriverMessageForm((prev) => ({
                  ...prev,
                  message: event.target.value,
                }))
              }
              placeholder="Write message to driver"
              rows={4}
              value={driverMessageForm.message}
            />
            <Button onClick={handleSendDriverMessage} type="button">
              Send driver message
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Message workshop</h3>
          <div className="mt-4 grid gap-3">
            <Select
              onValueChange={(value) =>
                setWorkshopMessageForm((prev) => ({ ...prev, workshop: value }))
              }
              value={workshopMessageForm.workshop}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select workshop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select workshop</SelectItem>
                {workshops.map((workshop) => (
                  <SelectItem key={workshop} value={workshop}>
                    {workshop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                onValueChange={(value) =>
                  setWorkshopMessageForm((prev) => ({ ...prev, channel: value }))
                }
                value={workshopMessageForm.channel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Portal">Portal</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  setWorkshopMessageForm((prev) => ({ ...prev, urgency: value }))
                }
                value={workshopMessageForm.urgency}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              onChange={(event) =>
                setWorkshopMessageForm((prev) => ({
                  ...prev,
                  message: event.target.value,
                }))
              }
              placeholder="Write message to workshop"
              rows={4}
              value={workshopMessageForm.message}
            />
            <Button onClick={handleSendWorkshopMessage} type="button" variant="outline">
              Send workshop message
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Support ticket creation
          </h3>
          <div className="mt-4 grid gap-3">
            <Input
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              placeholder="Ticket subject"
              value={ticketForm.subject}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                onValueChange={(value) =>
                  setTicketForm((prev) => ({ ...prev, category: value }))
                }
                value={ticketForm.category}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Driver support">Driver support</SelectItem>
                  <SelectItem value="Workshop coordination">
                    Workshop coordination
                  </SelectItem>
                  <SelectItem value="Billing">Billing</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  setTicketForm((prev) => ({ ...prev, priority: value }))
                }
                value={ticketForm.priority}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setTicketForm((prev) => ({
                    ...prev,
                    relatedRef: event.target.value,
                  }))
                }
                placeholder="Related ref (vehicle/order/invoice)"
                value={ticketForm.relatedRef}
              />
              <Input
                onChange={(event) =>
                  setTicketForm((prev) => ({
                    ...prev,
                    assignee: event.target.value,
                  }))
                }
                placeholder="Assignee"
                value={ticketForm.assignee}
              />
            </div>
            <Textarea
              onChange={(event) =>
                setTicketForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Describe the issue and expected action"
              rows={4}
              value={ticketForm.description}
            />
            <Button onClick={handleCreateTicket} type="button">
              Create support ticket
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Escalation management
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Open</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {openTickets.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Escalated</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">
                {escalatedTickets.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">
                {resolvedTickets.length}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <Label htmlFor="escalation-ticket">Select ticket</Label>
            <Select
              onValueChange={setSelectedTicketId}
              value={selectedTicket?.id || "__none__"}
            >
              <SelectTrigger id="escalation-ticket" className="w-full">
                <SelectValue placeholder="Select ticket" />
              </SelectTrigger>
              <SelectContent>
                {tickets.length === 0 ? (
                  <SelectItem value="__none__">No tickets</SelectItem>
                ) : (
                  tickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.id} - {ticket.subject}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Textarea
              onChange={(event) => setEscalationNote(event.target.value)}
              placeholder="Escalation or resolution note"
              rows={3}
              value={escalationNote}
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleEscalate} type="button" variant="destructive">
                Escalate
              </Button>
              <Button onClick={handleResolve} type="button" variant="outline">
                Mark resolved
              </Button>
              <Button onClick={handleReopen} type="button" variant="secondary">
                Reopen
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent driver messages
          </h3>
          <div className="mt-4 space-y-2">
            {communicationState.driverMessages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No driver messages sent yet.
              </p>
            ) : (
              communicationState.driverMessages.slice(0, 5).map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {message.driverName}
                    </p>
                    <p className="text-slate-500">{message.channel}</p>
                  </div>
                  <p className="mt-1 text-slate-700">{message.message}</p>
                  <p className="mt-2 text-slate-500">
                    {message.sentBy} | {formatDateTime(message.sentAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Workshop messages & tickets
          </h3>
          <div className="mt-4 space-y-2">
            {communicationState.workshopMessages.slice(0, 3).map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800">{message.workshop}</p>
                <p className="mt-1 text-slate-700">
                  {message.urgency} | {message.channel}
                </p>
                <p className="mt-1 text-slate-600">{message.message}</p>
                <p className="mt-1 text-slate-500">{formatDateTime(message.sentAt)}</p>
              </div>
            ))}
            {tickets.slice(0, 4).map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {ticket.id} - {ticket.subject}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">
                  {ticket.category} | {ticket.priority} | Escalation L
                  {ticket.escalationLevel}
                </p>
                <p className="mt-1 text-slate-500">{formatDateTime(ticket.updatedAt)}</p>
              </div>
            ))}
            {communicationState.workshopMessages.length === 0 && tickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No workshop communication activity yet.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommunicationControl;
