import { useMemo, useState } from "react";
import { MapPin, Settings, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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

const createStaffId = () =>
  `STF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function POSProfileSettingsControl({ session = null }) {
  const [workshopProfile, setWorkshopProfile] = useState(defaultWorkshopProfile);
  const [staffMembers, setStaffMembers] = useState(initialStaffMembers);
  const [staffDraft, setStaffDraft] = useState({
    name: "",
    role: "Service Advisor",
    shift: "General",
    status: "Active",
  });
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours);
  const [locationSettings, setLocationSettings] = useState(defaultLocationSettings);
  const [feedback, setFeedback] = useState("");

  const staffSummary = useMemo(() => {
    const active = staffMembers.filter((member) => member.status === "Active").length;
    const onLeave = staffMembers.filter((member) => member.status === "On leave").length;
    return {
      total: staffMembers.length,
      active,
      onLeave,
    };
  }, [staffMembers]);

  const addStaffMember = () => {
    if (!staffDraft.name.trim()) {
      setFeedback("Staff name is required.");
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
    setFeedback("Staff member added.");
  };

  const removeStaffMember = (staffId) => () => {
    setStaffMembers((prev) => prev.filter((member) => member.id !== staffId));
    setFeedback("Staff member removed.");
  };

  const updateWorkingDay = (day) => (patch) => {
    setWorkingHours((prev) =>
      prev.map((item) => (item.day === day ? { ...item, ...patch } : item))
    );
  };

  const saveAllSettings = () => {
    setFeedback("Profile and settings saved.");
  };

  return (
    <section className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Workshop profile owner</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {session?.name || "POS User"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Staff count</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{staffSummary.total}</p>
          <p className="text-xs text-slate-500">
            Active {staffSummary.active} | On leave {staffSummary.onLeave}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Primary location</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {locationSettings.locationName}
          </p>
          <p className="text-xs text-slate-500">{locationSettings.city}, {locationSettings.state}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Settings size={18} />
            Workshop profile
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Workshop name</Label>
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
              <Label>Workshop type</Label>
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
              <Label>Contact email</Label>
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
              <Label>Contact phone</Label>
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
              <Label>Certifications</Label>
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
              <Label>Tax registration</Label>
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
            Staff management
          </h2>
          <div className="mt-4 grid gap-2">
            <Input
              onChange={(event) =>
                setStaffDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Staff name"
              value={staffDraft.name}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Select
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, role: value }))
                }
                value={staffDraft.role}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POS Supervisor">POS Supervisor</SelectItem>
                  <SelectItem value="Service Advisor">Service Advisor</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                  <SelectItem value="Billing Staff">Billing Staff</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, shift: value }))
                }
                value={staffDraft.shift}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  setStaffDraft((prev) => ({ ...prev, status: value }))
                }
                value={staffDraft.status}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On leave">On leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addStaffMember} type="button" variant="outline">
              Add staff member
            </Button>
          </div>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar]:w-1.5">
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
                    Remove
                  </button>
                </div>
                <p className="text-slate-600">
                  {member.role} | {member.shift} | {member.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Working hours</h2>
          <div className="mt-4 space-y-2">
            {workingHours.map((item) => (
              <div
                key={item.day}
                className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_120px_120px_90px]"
              >
                <p className="self-center text-sm font-semibold text-slate-900">{item.day}</p>
                <Input
                  disabled={item.closed}
                  onChange={(event) =>
                    updateWorkingDay(item.day)({ open: event.target.value })
                  }
                  type="time"
                  value={item.open}
                />
                <Input
                  disabled={item.closed}
                  onChange={(event) =>
                    updateWorkingDay(item.day)({ close: event.target.value })
                  }
                  type="time"
                  value={item.close}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    checked={item.closed}
                    onChange={(event) =>
                      updateWorkingDay(item.day)({ closed: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MapPin size={18} />
            POS location settings
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Location name</Label>
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
              <Label>Address line 1</Label>
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
              <Label>Address line 2</Label>
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
              <Label>City</Label>
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
              <Label>State</Label>
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
              <Label>Postal code</Label>
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
              <Label>Timezone</Label>
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
              <Label>Geo-fence radius (km)</Label>
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
              <Label>Service coverage (km)</Label>
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
        <Button onClick={saveAllSettings} type="button">
          Save profile & settings
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
