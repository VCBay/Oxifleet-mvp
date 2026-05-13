import { useMemo, useState, useSyncExternalStore } from "react";
import { MapPin, Send, Settings, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { SearchableSelect } from "./ui/searchable-select";
import {
  getCommunicationState,
  sendWorkshopMessage,
  subscribeCommunication,
} from "../data/communicationStore";
import { useTranslation } from "../i18n/useTranslation";

const defaultWorkshopProfile = {
  workshopName: "Oxifleet POS Service Hub",
  contactEmail: "pos.support@oxifleet.com",
  contactPhone: "+1 (800) 410-2040",
  workshopType: "Authorized service center",
  certifications: "ISO 9001, OEM Tyre Fitment Certified",
  taxRegistration: "TX-POS-88217",
};

const initialStaffMembers = [
  {
    id: "STF-001",
    name: "Nina Carter",
    role: "POS Supervisor",
    shift: "Morning",
    status: "Active",
  },
  {
    id: "STF-002",
    name: "Ravi Kumar",
    role: "Service Advisor",
    shift: "General",
    status: "Active",
  },
  {
    id: "STF-003",
    name: "Liam Brooks",
    role: "Technician",
    shift: "Evening",
    status: "On leave",
  },
];

const defaultWorkingHours = [
  { day: "Monday", open: "08:00", close: "20:00", closed: false },
  { day: "Tuesday", open: "08:00", close: "20:00", closed: false },
  { day: "Wednesday", open: "08:00", close: "20:00", closed: false },
  { day: "Thursday", open: "08:00", close: "20:00", closed: false },
  { day: "Friday", open: "08:00", close: "20:00", closed: false },
  { day: "Saturday", open: "09:00", close: "16:00", closed: false },
  { day: "Sunday", open: "00:00", close: "00:00", closed: true },
];

const defaultLocationSettings = {
  locationName: "Dallas Central POS",
  addressLine1: "2108 Elm Street",
  addressLine2: "Suite 420",
  city: "Dallas",
  state: "TX",
  postalCode: "75201",
  timezone: "America/Chicago",
  geoFenceRadiusKm: "35",
  serviceCoverageKm: "120",
  emergencyDispatchEnabled: "Yes",
};

const ROLE_OPTIONS = [
  { value: "POS Supervisor", label: "POS Supervisor" },
  { value: "Service Advisor", label: "Service Advisor" },
  { value: "Technician", label: "Technician" },
  { value: "Billing Staff", label: "Billing Staff" },
];

const SHIFT_OPTIONS = [
  { value: "Morning", label: "Morning" },
  { value: "Evening", label: "Evening" },
  { value: "Night", label: "Night" },
  { value: "General", label: "General" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "On leave", label: "On leave" },
];

const CHANNEL_OPTIONS = [
  { value: "Portal", label: "Portal" },
  { value: "Email", label: "Email" },
  { value: "Call", label: "Call" },
];

const URGENCY_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "High", label: "High" },
  { value: "Emergency", label: "Emergency" },
];

const createStaffId = () =>
  `STF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function POSProfileSettingsControl({ session = null }) {
  const { t } = useTranslation();
  const communicationState = useSyncExternalStore(
    subscribeCommunication,
    getCommunicationState,
    getCommunicationState,
  );
  const [workshopProfile, setWorkshopProfile] = useState(
    defaultWorkshopProfile,
  );
  const [staffMembers, setStaffMembers] = useState(initialStaffMembers);
  const [staffDraft, setStaffDraft] = useState({
    name: "",
    role: "Service Advisor",
    shift: "General",
    status: "Active",
  });
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours);
  const [locationSettings, setLocationSettings] = useState(
    defaultLocationSettings,
  );
  const [feedback, setFeedback] = useState("");
  const [fleetMessageDraft, setFleetMessageDraft] = useState("");
  const [fleetMessageMeta, setFleetMessageMeta] = useState({
    channel: "Portal",
    urgency: "Normal",
  });
  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((option) => ({
        ...option,
        label: t(`pos.profile.roles.${option.value}`, option.label),
      })),
    [t],
  );
  const shiftOptions = useMemo(
    () =>
      SHIFT_OPTIONS.map((option) => ({
        ...option,
        label: t(`pos.profile.shifts.${option.value}`, option.label),
      })),
    [t],
  );
  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        ...option,
        label: t(`pos.profile.statusOptions.${option.value}`, option.label),
      })),
    [t],
  );
  const translatedWorkingHours = useMemo(
    () =>
      workingHours.map((item) => ({
        ...item,
        label: t(`pos.profile.days.${item.day}`, item.day),
      })),
    [t, workingHours],
  );

  const formatDateTime = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t("common.notAvailable", "N/A");
    }
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const staffSummary = useMemo(() => {
    const active = staffMembers.filter(
      (member) => member.status === "Active",
    ).length;
    const onLeave = staffMembers.filter(
      (member) => member.status === "On leave",
    ).length;
    return {
      total: staffMembers.length,
      active,
      onLeave,
    };
  }, [staffMembers]);

  const workshopIdentity = useMemo(
    () =>
      String(
        workshopProfile.workshopName ||
          locationSettings.locationName ||
          session?.name ||
          "Workshop Desk",
      ).trim(),
    [
      locationSettings.locationName,
      session?.name,
      workshopProfile.workshopName,
    ],
  );

  const fleetConversation = useMemo(
    () =>
      communicationState.workshopMessages
        .filter(
          (message) =>
            String(message.workshop || "")
              .trim()
              .toLowerCase() === workshopIdentity.toLowerCase(),
        )
        .sort(
          (a, b) =>
            (new Date(a.sentAt).getTime() || 0) -
            (new Date(b.sentAt).getTime() || 0),
        ),
    [communicationState.workshopMessages, workshopIdentity],
  );

  const addStaffMember = () => {
    if (!staffDraft.name.trim()) {
      setFeedback(t("pos.profile.feedback.staffNameRequired", "Staff name is required."));
      return;
    }
    const nextMember = {
      id: createStaffId(),
      name: staffDraft.name.trim(),
      role: staffDraft.role,
      shift: staffDraft.shift,
      status: staffDraft.status,
    };
    setStaffMembers((prev) => [nextMember, ...prev]);
    setStaffDraft({
      name: "",
      role: "Service Advisor",
      shift: "General",
      status: "Active",
    });
    setFeedback(t("pos.profile.feedback.staffAdded", "Staff member added."));
  };

  const removeStaffMember = (staffId) => () => {
    setStaffMembers((prev) => prev.filter((member) => member.id !== staffId));
    setFeedback(t("pos.profile.feedback.staffRemoved", "Staff member removed."));
  };

  const updateWorkingDay = (day) => (patch) => {
    setWorkingHours((prev) =>
      prev.map((item) => (item.day === day ? { ...item, ...patch } : item)),
    );
  };

  const saveAllSettings = () => {
    setFeedback(t("pos.profile.feedback.saved", "Profile and settings saved."));
  };

  const sendFleetMessage = () => {
    const message = fleetMessageDraft.trim();
    if (!message) {
      setFeedback(t("pos.profile.feedback.writeMessage", "Write message before sending to fleet."));
      return;
    }
    sendWorkshopMessage({
      workshop: workshopIdentity,
      channel: fleetMessageMeta.channel,
      urgency: fleetMessageMeta.urgency,
      message,
      sentBy: session?.name || workshopIdentity,
      fromRole: "workshop",
      toRole: "fleet",
    });
    setFleetMessageDraft("");
    setFeedback(t("pos.profile.feedback.messageSent", "Message sent to fleet control."));
  };

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">
            {t("pos.profile.workshopProfileOwner", "Workshop profile owner")}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {session?.name || "POS User"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">{t("pos.profile.staffCount", "Staff count")}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {staffSummary.total}
          </p>
          <p className="text-xs text-slate-500">
            {t("pos.profile.staffStatusSummary", "Active {{active}} | On leave {{onLeave}}", {
              active: staffSummary.active,
              onLeave: staffSummary.onLeave,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">
            {t("pos.profile.primaryLocation", "Primary location")}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {locationSettings.locationName}
          </p>
          <p className="text-xs text-slate-500">
            {locationSettings.city}, {locationSettings.state}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Settings size={18} />
            {t("pos.profile.workshopProfile", "Workshop profile")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("pos.profile.workshopName", "Workshop name")}</Label>
              <Input
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    workshopName: event.target.value,
                  }))
                }
                value={workshopProfile.workshopName}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.workshopType", "Workshop type")}</Label>
              <Input
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    workshopType: event.target.value,
                  }))
                }
                value={workshopProfile.workshopType}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.contactEmail", "Contact email")}</Label>
              <Input
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    contactEmail: event.target.value,
                  }))
                }
                value={workshopProfile.contactEmail}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.contactPhone", "Contact phone")}</Label>
              <Input
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    contactPhone: event.target.value,
                  }))
                }
                value={workshopProfile.contactPhone}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.profile.certifications", "Certifications")}</Label>
              <Textarea
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    certifications: event.target.value,
                  }))
                }
                rows={2}
                value={workshopProfile.certifications}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.profile.taxRegistration", "Tax registration")}</Label>
              <Input
                onChange={(event) =>
                  setWorkshopProfile((prev) => ({
                    ...prev,
                    taxRegistration: event.target.value,
                  }))
                }
                value={workshopProfile.taxRegistration}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Users size={18} />
            {t("pos.profile.staffManagement", "Staff management")}
          </h2>
          <div className="mt-4 grid gap-2">
            <Input
              onChange={(event) =>
                setStaffDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={t("pos.profile.staffName", "Staff name")}
              value={staffDraft.name}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <SearchableSelect
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, role: value }))
                }
                options={roleOptions}
                value={staffDraft.role || ""}
                placeholder={t("pos.profile.role", "Role")}
                searchPlaceholder={t("pos.profile.searchRoles", "Search roles")}
                emptyLabel={t("pos.profile.noRoles", "No roles")}
                noMatchLabel={t("pos.profile.noMatchingRoles", "No matching roles")}
                triggerClassName="w-full"
              />

              <SearchableSelect
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, shift: value }))
                }
                options={shiftOptions}
                value={staffDraft.shift || ""}
                placeholder={t("pos.profile.shift", "Shift")}
                searchPlaceholder={t("pos.profile.searchShifts", "Search shifts")}
                emptyLabel={t("pos.profile.noShifts", "No shifts")}
                noMatchLabel={t("pos.profile.noMatchingShifts", "No matching shifts")}
                triggerClassName="w-full"
              />

              <SearchableSelect
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, status: value }))
                }
                options={statusOptions}
                value={staffDraft.status || ""}
                placeholder={t("pos.profile.status", "Status")}
                searchPlaceholder={t("pos.profile.searchStatus", "Search status")}
                emptyLabel={t("pos.profile.noStatusOptions", "No status options")}
                noMatchLabel={t("pos.profile.noMatchingStatus", "No matching status")}
                triggerClassName="w-full"
              />
            </div>
            <Button onClick={addStaffMember} type="button" variant="outline">
              {t("pos.profile.addStaffMember", "Add staff member")}
            </Button>
          </div>

          <div className="card-list-scrollbar mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
            {staffMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{member.name}</p>
                  <button
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                    onClick={removeStaffMember(member.id)}
                    type="button"
                  >
                    {t("pos.profile.remove", "Remove")}
                  </button>
                </div>
                <p className="text-slate-600">
                  {t(`pos.profile.roles.${member.role}`, member.role)} |{" "}
                  {t(`pos.profile.shifts.${member.shift}`, member.shift)} |{" "}
                  {t(`pos.profile.statusOptions.${member.status}`, member.status)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("pos.profile.workingHours", "Working hours")}
          </h2>
          <div className="card-list-scrollbar mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            {translatedWorkingHours.map((item) => (
              <div
                key={item.day}
                className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
              >
                <p className="self-center text-sm font-semibold text-slate-900 sm:col-span-2 lg:col-span-1">
                  {item.label}
                </p>
                <Input
                  className="min-w-0"
                  disabled={item.closed}
                  onChange={(event) =>
                    updateWorkingDay(item.day)({ open: event.target.value })
                  }
                  type="time"
                  value={item.open}
                />
                <Input
                  className="min-w-0"
                  disabled={item.closed}
                  onChange={(event) =>
                    updateWorkingDay(item.day)({ close: event.target.value })
                  }
                  type="time"
                  value={item.close}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2 sm:justify-end lg:col-span-1 lg:justify-start">
                  <input
                    checked={item.closed}
                    onChange={(event) =>
                      updateWorkingDay(item.day)({
                        closed: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  {t("pos.profile.closed", "Closed")}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MapPin size={18} />
            {t("pos.profile.locationSettings", "POS location settings")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.profile.locationName", "Location name")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    locationName: event.target.value,
                  }))
                }
                value={locationSettings.locationName}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.profile.addressLine1", "Address line 1")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    addressLine1: event.target.value,
                  }))
                }
                value={locationSettings.addressLine1}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("pos.profile.addressLine2", "Address line 2")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    addressLine2: event.target.value,
                  }))
                }
                value={locationSettings.addressLine2}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.city", "City")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    city: event.target.value,
                  }))
                }
                value={locationSettings.city}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.state", "State")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    state: event.target.value,
                  }))
                }
                value={locationSettings.state}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.postalCode", "Postal code")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    postalCode: event.target.value,
                  }))
                }
                value={locationSettings.postalCode}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.timezone", "Timezone")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    timezone: event.target.value,
                  }))
                }
                value={locationSettings.timezone}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.geoFenceRadius", "Geo-fence radius (km)")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    geoFenceRadiusKm: event.target.value,
                  }))
                }
                value={locationSettings.geoFenceRadiusKm}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("pos.profile.serviceCoverage", "Service coverage (km)")}</Label>
              <Input
                onChange={(event) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    serviceCoverageKm: event.target.value,
                  }))
                }
                value={locationSettings.serviceCoverageKm}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={saveAllSettings}
          type="button"
          className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]"
        >
          {t("pos.profile.save", "Save profile & settings")}
        </Button>
        {feedback ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default POSProfileSettingsControl;
