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
  createSupportRequest,
  getSettingsProfileState,
  setSupportRequestStatus,
  subscribeSettingsProfile,
  updateCompanyProfile,
  updateContractDetails,
  updateIntegrationSettings,
  updateNotificationPreferences,
} from "../data/settingsProfileStore";

const parseEmails = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

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

const supportStatusClassName = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("resolved")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("progress")) {
    return "bg-sky-100 text-sky-700";
  }
  if (normalized.includes("open")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
};

function SettingsProfileControl() {
  const settingsState = useSyncExternalStore(
    subscribeSettingsProfile,
    getSettingsProfileState,
    getSettingsProfileState,
  );

  const [companyDraft, setCompanyDraft] = useState(
    () => getSettingsProfileState().companyProfile,
  );
  const [contractDraft, setContractDraft] = useState(
    () => getSettingsProfileState().contractDetails,
  );
  const [integrationDraft, setIntegrationDraft] = useState(
    () => getSettingsProfileState().integrationSettings,
  );
  const [notificationDraft, setNotificationDraft] = useState(() => {
    const current = getSettingsProfileState().notificationPreferences;
    return {
      ...current,
      recipientsText: current.recipients.join(", "),
    };
  });
  const [supportForm, setSupportForm] = useState({
    subject: "",
    category: "General",
    priority: "Medium",
    message: "",
    createdBy: "Ops Control",
  });

  const tickets = useMemo(
    () =>
      [...settingsState.helpSupport.tickets].sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime() || 0;
        const timeB = new Date(b.updatedAt).getTime() || 0;
        return timeB - timeA;
      }),
    [settingsState.helpSupport.tickets],
  );

  const saveCompanyProfile = () => {
    updateCompanyProfile(companyDraft);
  };

  const saveContractDetails = () => {
    updateContractDetails(contractDraft);
  };

  const saveIntegrationSettings = () => {
    updateIntegrationSettings(integrationDraft);
  };

  const saveNotificationPreferences = () => {
    updateNotificationPreferences({
      ...notificationDraft,
      recipients: parseEmails(notificationDraft.recipientsText),
    });
  };

  const createSupportTicket = () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      return;
    }
    createSupportRequest({
      subject: supportForm.subject,
      category: supportForm.category,
      priority: supportForm.priority,
      message: supportForm.message,
      createdBy: supportForm.createdBy || "Ops Control",
      status: "Open",
    });
    setSupportForm((prev) => ({
      ...prev,
      subject: "",
      message: "",
    }));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-6 shadow-sm">
        <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
          Settings & Profile
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Maintain company profile, contract controls, integrations,
          notification preferences, and support workflows.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Company profile details
          </h3>
          <div className="mt-4 grid gap-3">
            <Input
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  companyName: event.target.value,
                }))
              }
              placeholder="Company name"
              value={companyDraft.companyName}
            />
            <Input
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  legalName: event.target.value,
                }))
              }
              placeholder="Legal name"
              value={companyDraft.legalName}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setCompanyDraft((prev) => ({
                    ...prev,
                    registrationNumber: event.target.value,
                  }))
                }
                placeholder="Registration number"
                value={companyDraft.registrationNumber}
              />
              <Input
                onChange={(event) =>
                  setCompanyDraft((prev) => ({
                    ...prev,
                    taxId: event.target.value,
                  }))
                }
                placeholder="Tax ID"
                value={companyDraft.taxId}
              />
            </div>
            <Input
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  website: event.target.value,
                }))
              }
              placeholder="Website URL"
              value={companyDraft.website}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setCompanyDraft((prev) => ({
                    ...prev,
                    contactEmail: event.target.value,
                  }))
                }
                placeholder="Contact email"
                value={companyDraft.contactEmail}
              />
              <Input
                onChange={(event) =>
                  setCompanyDraft((prev) => ({
                    ...prev,
                    supportEmail: event.target.value,
                  }))
                }
                placeholder="Support email"
                value={companyDraft.supportEmail}
              />
            </div>
            <Input
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  contactPhone: event.target.value,
                }))
              }
              placeholder="Contact phone"
              value={companyDraft.contactPhone}
            />
            <Textarea
              onChange={(event) =>
                setCompanyDraft((prev) => ({
                  ...prev,
                  headquartersAddress: event.target.value,
                }))
              }
              placeholder="Headquarters address"
              rows={3}
              value={companyDraft.headquartersAddress}
            />
            <Button
              onClick={saveCompanyProfile}
              type="button"
              className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
            >
              Save company profile
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Contract details
          </h3>
          <div className="mt-4 grid gap-3">
            <Input
              onChange={(event) =>
                setContractDraft((prev) => ({
                  ...prev,
                  agreementId: event.target.value,
                }))
              }
              placeholder="Agreement ID"
              value={contractDraft.agreementId}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setContractDraft((prev) => ({
                    ...prev,
                    contractType: event.target.value,
                  }))
                }
                placeholder="Contract type"
                value={contractDraft.contractType}
              />
              <Select
                onValueChange={(value) =>
                  setContractDraft((prev) => ({ ...prev, status: value }))
                }
                value={contractDraft.status}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Contract status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="contract-start-date">Start date</Label>
                <Input
                  id="contract-start-date"
                  onChange={(event) =>
                    setContractDraft((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={contractDraft.startDate}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="contract-end-date">End date</Label>
                <Input
                  id="contract-end-date"
                  onChange={(event) =>
                    setContractDraft((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={contractDraft.endDate}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setContractDraft((prev) => ({
                    ...prev,
                    renewalType: event.target.value,
                  }))
                }
                placeholder="Renewal type"
                value={contractDraft.renewalType}
              />
              <Input
                onChange={(event) =>
                  setContractDraft((prev) => ({
                    ...prev,
                    slaTier: event.target.value,
                  }))
                }
                placeholder="SLA tier"
                value={contractDraft.slaTier}
              />
            </div>
            <Input
              onChange={(event) =>
                setContractDraft((prev) => ({
                  ...prev,
                  paymentTerms: event.target.value,
                }))
              }
              placeholder="Payment terms"
              value={contractDraft.paymentTerms}
            />
            <Textarea
              onChange={(event) =>
                setContractDraft((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              placeholder="Contract notes"
              rows={3}
              value={contractDraft.notes}
            />
            <Button
              onClick={saveContractDetails}
              type="button"
              variant="outline"
            >
              Save contract details
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Integration settings
          </h3>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(event) =>
                  setIntegrationDraft((prev) => ({
                    ...prev,
                    telematicsProvider: event.target.value,
                  }))
                }
                placeholder="Telematics provider"
                value={integrationDraft.telematicsProvider}
              />
              <Input
                onChange={(event) =>
                  setIntegrationDraft((prev) => ({
                    ...prev,
                    erpSystem: event.target.value,
                  }))
                }
                placeholder="ERP system"
                value={integrationDraft.erpSystem}
              />
            </div>
            <Input
              onChange={(event) =>
                setIntegrationDraft((prev) => ({
                  ...prev,
                  accountingSystem: event.target.value,
                }))
              }
              placeholder="Accounting system"
              value={integrationDraft.accountingSystem}
            />
            <Input
              onChange={(event) =>
                setIntegrationDraft((prev) => ({
                  ...prev,
                  apiKeyMasked: event.target.value,
                }))
              }
              placeholder="API key (masked)"
              value={integrationDraft.apiKeyMasked}
            />
            <Input
              onChange={(event) =>
                setIntegrationDraft((prev) => ({
                  ...prev,
                  webhookUrl: event.target.value,
                }))
              }
              placeholder="Webhook URL"
              value={integrationDraft.webhookUrl}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                onClick={() =>
                  setIntegrationDraft((prev) => ({
                    ...prev,
                    syncEnabled: !prev.syncEnabled,
                  }))
                }
                type="button"
                variant={integrationDraft.syncEnabled ? "default" : "outline"}
                  className={integrationDraft.syncEnabled ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Sync {integrationDraft.syncEnabled ? "On" : "Off"}
              </Button>
              <Button
                onClick={() =>
                  setIntegrationDraft((prev) => ({
                    ...prev,
                    autoInvoiceSync: !prev.autoInvoiceSync,
                  }))
                }
                type="button"
                variant={
                  integrationDraft.autoInvoiceSync ? "default" : "outline"
                }
                className={integrationDraft.autoInvoiceSync ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Invoice {integrationDraft.autoInvoiceSync ? "On" : "Off"}
              </Button>
              <Button
                onClick={() =>
                  setIntegrationDraft((prev) => ({
                    ...prev,
                    autoDriverSync: !prev.autoDriverSync,
                  }))
                }
                type="button"
                variant={
                  integrationDraft.autoDriverSync ? "default" : "outline"
                }
                className={integrationDraft.autoDriverSync ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Driver {integrationDraft.autoDriverSync ? "On" : "Off"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Last sync:{" "}
              {formatDateTime(settingsState.integrationSettings.lastSyncAt)}
            </p>
            <Button onClick={saveIntegrationSettings} type="button">
              Save integration settings
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Notification preferences
          </h3>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    emailAlerts: !prev.emailAlerts,
                  }))
                }
                className={notificationDraft.emailAlerts ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
                // className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
                type="button"
                variant={notificationDraft.emailAlerts ? "default" : "outline"} //show green button on place default  
              >
                Email alerts
              </Button>
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    smsAlerts: !prev.smsAlerts,
                  }))
                }
                type="button"
                variant={notificationDraft.smsAlerts ? "default" : "outline"}
                className={notificationDraft.smsAlerts ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                SMS alerts
              </Button>
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    pushAlerts: !prev.pushAlerts,
                  }))
                }
                type="button"
                variant={notificationDraft.pushAlerts ? "default" : "outline"}
                className={notificationDraft.pushAlerts ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Push alerts
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    criticalIncidentsOnly: !prev.criticalIncidentsOnly,
                  }))
                }
                className={notificationDraft.criticalIncidentsOnly ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
                type="button"
                variant={
                  notificationDraft.criticalIncidentsOnly
                    ? "default"
                    : "outline"
                }
              >
                Critical only
              </Button>
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    weeklySummary: !prev.weeklySummary,
                  }))
                }
                type="button"
                variant={
                  notificationDraft.weeklySummary ? "default" : "outline"
                }
                className={notificationDraft.weeklySummary ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Weekly summary
              </Button>
              <Button
                onClick={() =>
                  setNotificationDraft((prev) => ({
                    ...prev,
                    monthlyComplianceDigest: !prev.monthlyComplianceDigest,
                  }))
                }
                type="button"
                variant={
                  notificationDraft.monthlyComplianceDigest
                    ? "default"
                    : "outline"
                }
                className={notificationDraft.monthlyComplianceDigest ? "text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]" : ""}
              >
                Monthly digest
              </Button>
            </div>
            <Textarea
              onChange={(event) =>
                setNotificationDraft((prev) => ({
                  ...prev,
                  recipientsText: event.target.value,
                }))
              }
              placeholder="Notification recipients (comma separated emails)"
              rows={3}
              value={notificationDraft.recipientsText}
            />
            <Button
              onClick={saveNotificationPreferences}
              type="button"
              variant="outline"
            >
              Save notification preferences
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Help & support</h3>
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">Support contacts</p>
              <p className="mt-2 text-slate-600">
                Email: {settingsState.helpSupport.supportEmail}
              </p>
              <p className="mt-1 text-slate-600">
                Phone: {settingsState.helpSupport.supportPhone}
              </p>
              <p className="mt-1 text-slate-600">
                Knowledge base: {settingsState.helpSupport.knowledgeBaseUrl}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">
                Create support request
              </p>
              <div className="mt-3 grid gap-3">
                <Input
                  onChange={(event) =>
                    setSupportForm((prev) => ({
                      ...prev,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Support subject"
                  value={supportForm.subject}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    onValueChange={(value) =>
                      setSupportForm((prev) => ({ ...prev, category: value }))
                    }
                    value={supportForm.category}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Integration">Integration</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Help">Help</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) =>
                      setSupportForm((prev) => ({ ...prev, priority: value }))
                    }
                    value={supportForm.priority}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  onChange={(event) =>
                    setSupportForm((prev) => ({
                      ...prev,
                      createdBy: event.target.value,
                    }))
                  }
                  placeholder="Requested by"
                  value={supportForm.createdBy}
                />
                <Textarea
                  onChange={(event) =>
                    setSupportForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Describe your issue"
                  rows={4}
                  value={supportForm.message}
                />
                <Button onClick={createSupportTicket} type="button">
                  Create support request
                </Button>
              </div>
            </div>
          </div>

          <div className="card-list-scrollbar max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No support requests available.
              </p>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {ticket.id} - {ticket.subject}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${supportStatusClassName(
                        ticket.status,
                      )}`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {ticket.category} | {ticket.priority} | {ticket.createdBy}
                  </p>
                  <p className="mt-1 text-slate-600">{ticket.message}</p>
                  <p className="mt-1 text-slate-500">
                    Updated: {formatDateTime(ticket.updatedAt)}
                  </p>
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) =>
                        setSupportRequestStatus(ticket.id, value)
                      }
                      value={ticket.status}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SettingsProfileControl;
