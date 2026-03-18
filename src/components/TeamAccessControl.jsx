import { useMemo, useState, useSyncExternalStore } from "react";
import { Building2, MapPin, ShieldCheck, UserCheck, Users } from "lucide-react";
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
  addTeamMember,
  getTeamAccessState,
  setMemberLocations,
  setMemberRolePermissions,
  subscribeTeamAccess,
  teamAccessRoleTemplates,
  toggleTeamMemberStatus,
} from "../data/teamAccessStore";

const roleOptions = Object.keys(teamAccessRoleTemplates);

const permissionCatalog = Array.from(
  new Set(
    Object.values(teamAccessRoleTemplates).flatMap((permissions) => permissions)
  )
);

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
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

const statusClassName = (status) => {
  if (String(status || "").toLowerCase() === "active") {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-slate-100 text-slate-700";
};

const teamOverviewToneClass = (tone) => {
  if (tone === "good") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (tone === "info") {
    return "bg-sky-100 text-sky-700";
  }
  if (tone === "warn") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-200 text-slate-700";
};

function TeamAccessControl() {
  const teamAccessState = useSyncExternalStore(
    subscribeTeamAccess,
    getTeamAccessState,
    getTeamAccessState
  );

  const members = useMemo(
    () =>
      [...teamAccessState.members].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      ),
    [teamAccessState.members]
  );

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "Viewer",
    locations: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState("__none__");
  const [roleForm, setRoleForm] = useState({
    role: "Viewer",
    permissions: [...(teamAccessRoleTemplates.Viewer || [])],
  });
  const [locationForm, setLocationForm] = useState("");
  const [actor, setActor] = useState("Access Admin");

  const selectedMember = useMemo(() => {
    if (selectedMemberId && selectedMemberId !== "__none__") {
      const explicit = members.find((member) => member.id === selectedMemberId);
      if (explicit) {
        return explicit;
      }
    }
    return members[0] || null;
  }, [members, selectedMemberId]);

  const activeMembers = members.filter((member) => member.status === "Active").length;
  const multiLocationMembers = members.filter(
    (member) => (member.locations || []).length > 1
  ).length;
  const uniqueLocations = Array.from(
    new Set(members.flatMap((member) => member.locations || []))
  ).length;

  const overviewCards = [
    {
      key: "members",
      title: "Team members",
      value: `${members.length}`,
      helper: "Total onboarded users",
      status: "Directory synced",
      tone: "good",
      icon: Users,
    },
    {
      key: "active",
      title: "Active members",
      value: `${activeMembers}`,
      helper: "Currently enabled",
      status: "Operational",
      tone: "good",
      icon: UserCheck,
    },
    {
      key: "multi-location",
      title: "Multi-location users",
      value: `${multiLocationMembers}`,
      helper: "Access in multiple sites",
      status: multiLocationMembers > 0 ? "Distributed access" : "Single-site only",
      tone: multiLocationMembers > 0 ? "info" : "warn",
      icon: Building2,
    },
    {
      key: "locations",
      title: "Covered locations",
      value: `${uniqueLocations}`,
      helper: "Distinct managed locations",
      status: uniqueLocations > 0 ? "Coverage mapped" : "No coverage",
      tone: uniqueLocations > 0 ? "info" : "warn",
      icon: MapPin,
    },
    {
      key: "roles",
      title: "Role templates",
      value: `${roleOptions.length}`,
      helper: "Configured permission templates",
      status: "Policy ready",
      tone: "good",
      icon: ShieldCheck,
    },
  ];

  const handleAddMember = () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      return;
    }
    const next = addTeamMember(
      {
        name: memberForm.name,
        email: memberForm.email,
        role: memberForm.role,
        locations: parseCsv(memberForm.locations),
        status: "Active",
      },
      actor
    );
    setSelectedMemberId(next.id);
    setRoleForm({
      role: next.role,
      permissions: [...next.permissions],
    });
    setLocationForm(next.locations.join(", "));
    setMemberForm((prev) => ({
      ...prev,
      name: "",
      email: "",
      locations: "",
    }));
  };

  const handlePickMember = (memberId) => {
    setSelectedMemberId(memberId);
    const picked = members.find((member) => member.id === memberId);
    if (!picked) {
      return;
    }
    setRoleForm({
      role: picked.role,
      permissions: [...picked.permissions],
    });
    setLocationForm((picked.locations || []).join(", "));
  };

  const togglePermission = (permission) => {
    setRoleForm((prev) => {
      const hasPermission = prev.permissions.includes(permission);
      const nextPermissions = hasPermission
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission];
      return {
        ...prev,
        permissions: nextPermissions,
      };
    });
  };

  const applyRoleTemplate = (role) => {
    const template = teamAccessRoleTemplates[role] || [];
    setRoleForm({
      role,
      permissions: [...template],
    });
  };

  const handleSaveRolePermissions = () => {
    if (!selectedMember) {
      return;
    }
    setMemberRolePermissions(
      selectedMember.id,
      {
        role: roleForm.role,
        permissions: roleForm.permissions,
      },
      actor
    );
  };

  const handleSaveLocations = () => {
    if (!selectedMember) {
      return;
    }
    setMemberLocations(selectedMember.id, parseCsv(locationForm), actor);
  };

  const handleToggleStatus = (memberId) => {
    toggleTeamMemberStatus(memberId, actor);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-[radial-gradient(circle_at_top_right,#223447_0%,#0E1729_42%,#05070f_100%)] p-6 shadow-sm">
        <h2 className="font-semibold uppercase tracking-[0.24em] text-white/70">
          Team & Access Control
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Add team members, configure role-based permissions, manage multi-location
          access, and review activity and audit records.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-4"
              key={card.key}
            >
              <div className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-slate-100" />
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                    {card.title}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-3xl">
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                    {card.helper}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Icon size={13} />
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${teamOverviewToneClass(
                    card.tone,
                  )}`}
                >
                  {card.status}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div>
            <Label htmlFor="access-actor">Change actor</Label>
            <Input
              id="access-actor"
              onChange={(event) => setActor(event.target.value)}
              placeholder="Who is making this change?"
              value={actor}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Actions are written to activity logs and audit trail.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add team members</h3>
          <div className="mt-4 grid gap-3">
            <Input
              onChange={(event) =>
                setMemberForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              value={memberForm.name}
            />
            <Input
              onChange={(event) =>
                setMemberForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email address"
              value={memberForm.email}
            />
            <Select
              onValueChange={(value) =>
                setMemberForm((prev) => ({ ...prev, role: value }))
              }
              value={memberForm.role}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              onChange={(event) =>
                setMemberForm((prev) => ({
                  ...prev,
                  locations: event.target.value,
                }))
              }
              placeholder="Locations (comma separated)"
              rows={3}
              value={memberForm.locations}
            />
            <Button onClick={handleAddMember} type="button" className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]">
              Add team member
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Team roster</h3>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No team members yet.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {member.name} ({member.id})
                      </p>
                      <p className="text-slate-600">
                        {member.email} | {member.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                      <Button
                        onClick={() => handleToggleStatus(member.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {member.status === "Active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-slate-600">
                    Locations:{" "}
                    {member.locations.length > 0
                      ? member.locations.join(", ")
                      : "No location assigned"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Role-based permissions
          </h3>
          <div className="mt-4 grid gap-3">
            <Select
              onValueChange={handlePickMember}
              value={selectedMember?.id || "__none__"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <SelectItem value="__none__">No team members</SelectItem>
                ) : (
                  members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select onValueChange={applyRoleTemplate} value={roleForm.role}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role template" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permissions
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {permissionCatalog.map((permission) => {
                  const selected = roleForm.permissions.includes(permission);
                  return (
                    <button
                      key={permission}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        selected
                          ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                      onClick={() => togglePermission(permission)}
                      type="button"
                    >
                      {permission}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSaveRolePermissions} type="button" variant="outline">
              Save role and permissions
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Multi-location access
          </h3>
          <div className="mt-4 grid gap-3">
            <Label htmlFor="location-scope">Location scope</Label>
            <Textarea
              id="location-scope"
              onChange={(event) => setLocationForm(event.target.value)}
              placeholder="Dallas, Austin, Houston"
              rows={4}
              value={locationForm}
            />
            <Button onClick={handleSaveLocations} type="button" className="text-white rounded-lg bg-[linear-gradient(180deg,#6848e1_0%,#45278f_56%,#24114d_100%)] px-3 py-2 hover:bg-[linear-gradient(180deg,#7456e9_0%,#4f2ea0_56%,#2a1459_100%)]">
              Save location access
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Activity logs</h3>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {teamAccessState.activityLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No activity logs available.
              </p>
            ) : (
              teamAccessState.activityLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <p className="font-semibold text-slate-800">{log.action}</p>
                  <p className="mt-1 text-slate-600">{log.summary}</p>
                  <p className="mt-1 text-slate-500">
                    {log.actor} | {log.targetId || "N/A"} |{" "}
                    {formatDateTime(log.time)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Audit trail</h3>
          <div className="card-list-scrollbar mt-4 max-h-[23rem] space-y-2 overflow-y-auto pr-1">
            {teamAccessState.auditTrail.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No audit events available.
              </p>
            ) : (
              teamAccessState.auditTrail.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                >
                  <p className="font-semibold text-slate-800">{event.eventType}</p>
                  <p className="mt-1 text-slate-600">
                    {event.before ? `Before: ${event.before}` : "Before: N/A"}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {event.after ? `After: ${event.after}` : "After: N/A"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {event.actor} | {event.targetId || "N/A"} |{" "}
                    {formatDateTime(event.time)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TeamAccessControl;
