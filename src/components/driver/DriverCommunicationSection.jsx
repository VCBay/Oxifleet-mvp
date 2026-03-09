import { useMemo, useState } from "react";
import {
  Headset,
  MessageSquare,
  PhoneCall,
  Search,
  Send,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const quickPhrases = [
  "Need approval for service request",
  "Vehicle stopped, need workshop help",
  "Please check booking status",
];

function DriverCommunicationSection({
  activeCommunicationContact,
  setActiveCommunicationContact,
  activeCommunicationDetails,
  activeCommunicationMessages,
  handleCallContact,
  communicationDraft,
  setCommunicationDraft,
  handleSendCommunicationMessage,
  handleQuickMessage,
  supportTopicOptions,
  supportRequest,
  setSupportRequest,
  handleSupportRequestSubmit,
  supportMessages,
  communicationContacts,
  communicationNotice,
  formatDateTime,
}) {
  const [searchText, setSearchText] = useState("");

  const contacts = useMemo(() => {
    if (Array.isArray(communicationContacts) && communicationContacts.length > 0) {
      return communicationContacts;
    }
    return [
      {
        id: "fleet_manager",
        title: "Chat with fleet manager",
        name: "Fleet Manager",
        subtitle: "Approval and policy support",
        phone: "",
      },
      {
        id: "workshop_pos",
        title: "Contact workshop/POS",
        name: "Workshop Desk",
        subtitle: "Booking and workshop coordination",
        phone: "",
      },
      {
        id: "support",
        title: "Support/help request",
        name: "Support Team",
        subtitle: "Technical and booking help",
        phone: "",
      },
    ];
  }, [communicationContacts]);

  const activeContact =
    contacts.find((item) => item.id === activeCommunicationContact) || contacts[0];

  const filteredContacts = useMemo(() => {
    if (!searchText.trim()) {
      return contacts;
    }
    const query = searchText.trim().toLowerCase();
    return contacts.filter((item) =>
      [item.title, item.name, item.subtitle].join(" ").toLowerCase().includes(query)
    );
  }, [contacts, searchText]);

  const getContactIcon = (id) => {
    if (id === "fleet_manager") {
      return UserRound;
    }
    if (id === "workshop_pos") {
      return Wrench;
    }
    return Headset;
  };

  const previewByContact = {
    fleet_manager:
      activeCommunicationContact === "fleet_manager"
        ? activeCommunicationMessages[activeCommunicationMessages.length - 1]?.text
        : "Driver to fleet chat",
    workshop_pos:
      activeCommunicationContact === "workshop_pos"
        ? activeCommunicationMessages[activeCommunicationMessages.length - 1]?.text
        : "Driver to workshop/POS chat",
    support:
      supportMessages?.[0]?.text ||
      "Need help? Send your issue to support for quick response.",
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Communication</h2>
          {/* <p className="text-xs text-slate-500">
            Fleet-style chat view while keeping driver communication flow unchanged.
          </p> */}
        </header>

        <div className="grid min-h-[680px] grid-cols-1 md:grid-cols-[330px_1fr]">
          <aside className="border-r border-slate-200 bg-white">
            <div className="space-y-3 border-b border-slate-200 bg-white p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <Input
                  className="h-9 rounded-full border-slate-200 bg-slate-50 pl-9"
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search contact"
                  value={searchText}
                />
              </div>
            </div>

            <div className="max-h-[600px] space-y-1 overflow-y-auto p-2">
              {filteredContacts.map((contact) => {
                const Icon = getContactIcon(contact.id);
                const isActive = activeCommunicationContact === contact.id;
                return (
                  <button
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-slate-300 bg-slate-100 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                    key={contact.id}
                    onClick={() => setActiveCommunicationContact(contact.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-700">
                          <Icon size={14} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                          <p className="text-[11px] text-slate-500">{contact.subtitle}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-slate-600">
                      {previewByContact[contact.id]}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-slate-50">
            {activeCommunicationContact === "support" ? (
              <div className="grid flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[1.1fr_1fr]">
                <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Support history</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    View support updates and send quick support message.
                  </p>

                  <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {supportMessages.length === 0 ? (
                      <p className="text-sm text-slate-500">No support updates yet.</p>
                    ) : (
                      supportMessages.map((item) => (
                        <div
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                          key={item.id}
                        >
                          <p className="text-xs font-semibold text-slate-700">
                            {item.sender} | {formatDateTime(item.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">{item.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      onChange={(event) => setCommunicationDraft(event.target.value)}
                      placeholder="Quick support message"
                      value={communicationDraft}
                    />
                    <Button onClick={handleSendCommunicationMessage} type="button">
                      <Send className="mr-2" size={14} />
                      Send
                    </Button>
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">Create support request</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Pick topic and write one short issue note.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {supportTopicOptions.map((topic) => (
                      <button
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          supportRequest.topic === topic
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300"
                        }`}
                        key={topic}
                        onClick={() =>
                          setSupportRequest((prev) => ({
                            ...prev,
                            topic,
                          }))
                        }
                        type="button"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 space-y-3">
                    <Textarea
                      onChange={(event) =>
                        setSupportRequest((prev) => ({
                          ...prev,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Describe your issue in simple words..."
                      rows={5}
                      value={supportRequest.message}
                    />
                    <Button className="w-full" onClick={handleSupportRequestSubmit} type="button">
                      <Headset className="mr-2" size={14} />
                      Send support request
                    </Button>
                  </div>
                </article>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                      {activeCommunicationContact === "fleet_manager" ? (
                        <UserRound size={16} />
                      ) : (
                        <Wrench size={16} />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {activeContact?.name || activeCommunicationDetails?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeContact?.subtitle || activeCommunicationDetails?.subtitle}
                      </p>
                    </div>
                  </div>
                  {activeCommunicationDetails?.phone ? (
                    <Button
                      onClick={() => handleCallContact(activeCommunicationDetails.phone)}
                      type="button"
                      variant="outline"
                    >
                      <PhoneCall className="mr-2" size={14} />
                      {activeCommunicationDetails.phone}
                    </Button>
                  ) : null}
                </div>

                <div className="max-h-[500px] flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
                  {activeCommunicationMessages.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-3 text-xs text-slate-500">
                      No messages yet.
                    </p>
                  ) : (
                    activeCommunicationMessages.map((message) => (
                      <div
                        className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                        key={message.id}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
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

                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quickPhrases.map((phrase) => (
                      <button
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-200"
                        key={phrase}
                        onClick={() => handleQuickMessage(phrase)}
                        type="button"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      onChange={(event) => setCommunicationDraft(event.target.value)}
                      placeholder="Type simple message here..."
                      value={communicationDraft}
                    />
                    <Button onClick={handleSendCommunicationMessage} type="button">
                      <Send className="mr-2" size={14} />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {communicationNotice ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {communicationNotice}
        </div>
      ) : null}
    </section>
  );
}

export default DriverCommunicationSection;
