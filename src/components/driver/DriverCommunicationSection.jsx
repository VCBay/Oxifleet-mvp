import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Headset,
  MessageSquare,
  PhoneCall,
  Search,
  Send,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useIsMobile } from "../../hooks/use-mobile";

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
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const showContactsPane = !isMobile || !isMobileThreadOpen;
  const showConversationPane = !isMobile || isMobileThreadOpen;

  const handleContactSelect = (contactId) => {
    setActiveCommunicationContact(contactId);
    if (isMobile) {
      setIsMobileThreadOpen(true);
    }
  };

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Communication</h2>
          {/* <p className="text-xs text-slate-500">
            Fleet-style chat view while keeping driver communication flow unchanged.
          </p> */}
        </header>

        <div className="grid min-h-[620px] min-w-0 grid-cols-1 md:min-h-[680px] md:grid-cols-[300px_1fr] lg:grid-cols-[330px_1fr]">
          {showContactsPane ? (
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
            </div>

            <div className="card-list-scrollbar max-h-[260px] space-y-1 overflow-y-auto p-2 pr-1 md:max-h-[600px]">
              {filteredContacts.map((contact) => {
                const Icon = getContactIcon(contact.id);
                const isActive = activeCommunicationContact === contact.id;
                return (
                  <button
                    className={`w-full min-w-0 rounded-2xl border px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                      isActive
                        ? "border-slate-300 bg-slate-100 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 sm:size-9">
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">{contact.name}</p>
                          <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">{contact.subtitle}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-1 text-[11px] text-slate-600 sm:text-xs">
                      {previewByContact[contact.id]}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>
          ) : null}

          {showConversationPane ? (
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
                      {activeContact?.name || activeCommunicationDetails?.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {activeContact?.subtitle || activeCommunicationDetails?.subtitle}
                    </p>
                  </div>
                </div>
                {activeCommunicationDetails?.phone ? (
                  <Button
                    className="h-8 px-2 text-[10px]"
                    onClick={() => handleCallContact(activeCommunicationDetails.phone)}
                    type="button"
                    variant="outline"
                  >
                    <PhoneCall className="mr-1.5" size={12} />
                    Call
                  </Button>
                ) : null}
              </div>
            ) : null}
            {activeCommunicationContact === "support" ? (
              <div className="grid flex-1 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4 xl:grid-cols-[1.1fr_1fr]">
                <article className="rounded-3xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Support history</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    View support updates and send quick support message.
                  </p>

                  <div className="card-list-scrollbar mt-4 max-h-[280px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-1 sm:max-h-[360px]">
                    {supportMessages.length === 0 ? (
                      <p className="text-xs text-slate-500 sm:text-sm">No support updates yet.</p>
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

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      className="text-xs sm:text-sm"
                      onChange={(event) => setCommunicationDraft(event.target.value)}
                      placeholder="Quick support message"
                      value={communicationDraft}
                    />
                    <Button className="w-full sm:w-auto" onClick={handleSendCommunicationMessage} type="button">
                      <Send className="mr-2" size={14} />
                      Send
                    </Button>
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Create support request</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Pick topic and write one short issue note.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {supportTopicOptions.map((topic) => (
                      <button
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition sm:text-xs ${
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
                      className="text-xs sm:text-sm"
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
                <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:flex sm:px-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 sm:size-10">
                      {activeCommunicationContact === "fleet_manager" ? (
                        <UserRound size={16} />
                      ) : (
                        <Wrench size={16} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                        {activeContact?.name || activeCommunicationDetails?.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                        {activeContact?.subtitle || activeCommunicationDetails?.subtitle}
                      </p>
                    </div>
                  </div>
                  {activeCommunicationDetails?.phone ? (
                    <Button
                      className="w-full text-xs sm:w-auto sm:text-sm"
                      onClick={() => handleCallContact(activeCommunicationDetails.phone)}
                      type="button"
                      variant="outline"
                    >
                      <PhoneCall className="mr-2" size={14} />
                      {activeCommunicationDetails.phone}
                    </Button>
                  ) : null}
                </div>

                <div className="card-list-scrollbar max-h-[460px] flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 pr-1 sm:max-h-[500px] sm:p-4">
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
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs shadow-sm sm:max-w-[78%] sm:text-sm ${
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
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quickPhrases.map((phrase) => (
                      <button
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-200 sm:text-xs"
                        key={phrase}
                        onClick={() => handleQuickMessage(phrase)}
                        type="button"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      className="text-xs sm:text-sm"
                      onChange={(event) => setCommunicationDraft(event.target.value)}
                      placeholder="Type simple message here..."
                      value={communicationDraft}
                    />
                    <Button className="w-full sm:w-auto" onClick={handleSendCommunicationMessage} type="button">
                      <Send className="mr-2" size={14} />
                      Send
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          ) : null}
        </div>
      </div>

      {communicationNotice ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 shadow-sm sm:text-sm">
          {communicationNotice}
        </div>
      ) : null}
    </section>
  );
}

export default DriverCommunicationSection;
