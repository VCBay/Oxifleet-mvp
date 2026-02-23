const STORAGE_KEY = "oxifleet:team-access-control";

const ROLE_TEMPLATES = {
  Admin: [
    "Users",
    "Vehicles",
    "Policies",
    "Service Orders",
    "Billing",
    "Reporting",
    "Communication",
  ],
  "Fleet Manager": [
    "Vehicles",
    "Policies",
    "Service Orders",
    "Reporting",
    "Communication",
  ],
  "Operations Lead": ["Vehicles", "Service Orders", "Drivers", "Communication"],
  Finance: ["Billing", "Reporting"],
  Viewer: ["Reporting"],
};

const readStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStorage = (value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};

const toIsoString = (value) => {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const createMemberId = () =>
  `TM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const createEventId = (prefix = "EVT") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const parseLocations = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizePermissions = (role, permissions) => {
  const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.Viewer;
  if (!permissions) {
    return [...template];
  }
  const normalized = Array.from(
    new Set(
      (Array.isArray(permissions) ? permissions : [permissions])
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
    )
  );
  if (normalized.length === 0) {
    return [...template];
  }
  return normalized;
};

const normalizeMember = (member = {}) => {
  const role = String(member.role || "Viewer").trim() || "Viewer";
  return {
    id: String(member.id || createMemberId()).trim(),
    name: String(member.name || "Unnamed member").trim() || "Unnamed member",
    email: String(member.email || "unknown@oxifleet.com").trim().toLowerCase(),
    role,
    permissions: normalizePermissions(role, member.permissions),
    locations: parseLocations(member.locations),
    status: String(member.status || "Active").trim() || "Active",
    createdAt: toIsoString(member.createdAt),
    updatedAt: toIsoString(member.updatedAt || member.createdAt),
    lastActiveAt: toIsoString(member.lastActiveAt || member.updatedAt),
  };
};

const normalizeActivityLog = (log = {}) => ({
  id: String(log.id || createEventId("ACT")).trim(),
  action: String(log.action || "Updated team member").trim(),
  actor: String(log.actor || "System").trim() || "System",
  targetId: String(log.targetId || "").trim(),
  summary: String(log.summary || "").trim(),
  time: toIsoString(log.time),
});

const normalizeAuditEvent = (event = {}) => ({
  id: String(event.id || createEventId("AUD")).trim(),
  eventType: String(event.eventType || "Access update").trim(),
  actor: String(event.actor || "System").trim() || "System",
  targetId: String(event.targetId || "").trim(),
  before: String(event.before || "").trim(),
  after: String(event.after || "").trim(),
  note: String(event.note || "").trim(),
  time: toIsoString(event.time),
});

const minusHours = (hours) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const getDefaultState = () => ({
  members: [
    normalizeMember({
      id: "TM-1001",
      name: "Ava Carter",
      email: "ava.carter@oxifleet.com",
      role: "Admin",
      status: "Active",
      locations: ["Dallas", "Austin", "Houston"],
      createdAt: minusHours(520),
      updatedAt: minusHours(12),
      lastActiveAt: minusHours(2),
    }),
    normalizeMember({
      id: "TM-1002",
      name: "Noah Jenkins",
      email: "noah.jenkins@oxifleet.com",
      role: "Fleet Manager",
      status: "Active",
      locations: ["Dallas", "San Antonio"],
      createdAt: minusHours(340),
      updatedAt: minusHours(30),
      lastActiveAt: minusHours(5),
    }),
    normalizeMember({
      id: "TM-1003",
      name: "Mia Flores",
      email: "mia.flores@oxifleet.com",
      role: "Finance",
      status: "Inactive",
      locations: ["Phoenix"],
      createdAt: minusHours(280),
      updatedAt: minusHours(80),
      lastActiveAt: minusHours(80),
    }),
  ],
  activityLogs: [
    normalizeActivityLog({
      id: "ACT-1001",
      action: "Role updated",
      actor: "Ava Carter",
      targetId: "TM-1002",
      summary: "Role changed to Fleet Manager with policy and reporting access.",
      time: minusHours(30),
    }),
    normalizeActivityLog({
      id: "ACT-1002",
      action: "Multi-location access updated",
      actor: "Ava Carter",
      targetId: "TM-1002",
      summary: "Added San Antonio location access.",
      time: minusHours(28),
    }),
    normalizeActivityLog({
      id: "ACT-1003",
      action: "Team member invited",
      actor: "Ava Carter",
      targetId: "TM-1003",
      summary: "Finance user added with billing permissions.",
      time: minusHours(260),
    }),
  ],
  auditTrail: [
    normalizeAuditEvent({
      id: "AUD-1001",
      eventType: "Role permission change",
      actor: "Ava Carter",
      targetId: "TM-1002",
      before: "Operations Lead",
      after: "Fleet Manager",
      note: "Expanded role for multi-location approval workflow.",
      time: minusHours(30),
    }),
    normalizeAuditEvent({
      id: "AUD-1002",
      eventType: "Location scope change",
      actor: "Ava Carter",
      targetId: "TM-1002",
      before: "Dallas",
      after: "Dallas, San Antonio",
      note: "Temporary branch coverage enabled.",
      time: minusHours(28),
    }),
  ],
});

const normalizeState = (value = {}) => ({
  members: Array.isArray(value.members)
    ? value.members.map(normalizeMember)
    : [],
  activityLogs: Array.isArray(value.activityLogs)
    ? value.activityLogs.map(normalizeActivityLog)
    : [],
  auditTrail: Array.isArray(value.auditTrail)
    ? value.auditTrail.map(normalizeAuditEvent)
    : [],
});

const initializeState = () => {
  const stored = readStorage();
  if (stored) {
    const normalized = normalizeState(stored);
    writeStorage(normalized);
    return normalized;
  }
  const defaults = getDefaultState();
  writeStorage(defaults);
  return defaults;
};

let state = initializeState();

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (nextState) => {
  state = nextState;
  writeStorage(state);
  emit();
};

const appendEvents = ({
  actor = "System",
  action,
  targetId,
  summary,
  eventType,
  before = "",
  after = "",
  note = "",
}) => {
  const activityLog = normalizeActivityLog({
    action,
    actor,
    targetId,
    summary,
  });
  const auditEvent = normalizeAuditEvent({
    eventType: eventType || action,
    actor,
    targetId,
    before,
    after,
    note: note || summary,
  });
  return {
    activityLogs: [activityLog, ...state.activityLogs].slice(0, 80),
    auditTrail: [auditEvent, ...state.auditTrail].slice(0, 200),
  };
};

const replaceMember = (memberId, updater) => {
  const targetId = String(memberId || "").trim();
  if (!targetId) {
    return { updated: null, nextMembers: state.members };
  }
  let updated = null;
  const nextMembers = state.members.map((member) => {
    if (member.id !== targetId) {
      return member;
    }
    const next = normalizeMember(
      updater({
        ...member,
        id: member.id,
        createdAt: member.createdAt,
      })
    );
    updated = next;
    return next;
  });
  return { updated, nextMembers };
};

export const getTeamAccessState = () => state;

export const addTeamMember = (member, actor = "Admin Console") => {
  const nextMember = normalizeMember(member);
  const events = appendEvents({
    actor,
    action: "Team member added",
    targetId: nextMember.id,
    summary: `${nextMember.name} added with ${nextMember.role} role.`,
    eventType: "Member creation",
    after: `${nextMember.role} | ${nextMember.locations.join(", ") || "No location"}`,
  });
  setState({
    ...state,
    members: [nextMember, ...state.members],
    activityLogs: events.activityLogs,
    auditTrail: events.auditTrail,
  });
  return nextMember;
};

export const updateTeamMember = (memberId, updates = {}, actor = "Admin Console") => {
  const { updated, nextMembers } = replaceMember(memberId, (member) => ({
    ...member,
    ...updates,
    updatedAt: new Date().toISOString(),
    lastActiveAt: member.lastActiveAt,
  }));
  if (!updated) {
    return null;
  }
  const events = appendEvents({
    actor,
    action: "Team member updated",
    targetId: updated.id,
    summary: `${updated.name} profile details updated.`,
    eventType: "Member update",
    after: `${updated.role} | ${updated.status}`,
  });
  setState({
    ...state,
    members: nextMembers,
    activityLogs: events.activityLogs,
    auditTrail: events.auditTrail,
  });
  return updated;
};

export const setMemberRolePermissions = (
  memberId,
  { role, permissions },
  actor = "Admin Console"
) => {
  const current = state.members.find((member) => member.id === memberId);
  if (!current) {
    return null;
  }
  const nextRole = String(role || current.role).trim() || current.role;
  const nextPermissions = normalizePermissions(nextRole, permissions);
  const updated = updateTeamMember(
    memberId,
    {
      role: nextRole,
      permissions: nextPermissions,
      updatedAt: new Date().toISOString(),
    },
    actor
  );
  if (!updated) {
    return null;
  }
  const events = appendEvents({
    actor,
    action: "Role-based permissions updated",
    targetId: updated.id,
    summary: `${updated.name} permissions set for ${updated.role}.`,
    eventType: "Role permission change",
    before: `${current.role}: ${current.permissions.join(", ")}`,
    after: `${updated.role}: ${updated.permissions.join(", ")}`,
  });
  setState({
    ...state,
    activityLogs: events.activityLogs,
    auditTrail: events.auditTrail,
  });
  return updated;
};

export const setMemberLocations = (memberId, locations, actor = "Admin Console") => {
  const current = state.members.find((member) => member.id === memberId);
  if (!current) {
    return null;
  }
  const nextLocations = parseLocations(locations);
  const updated = updateTeamMember(
    memberId,
    {
      locations: nextLocations,
      updatedAt: new Date().toISOString(),
    },
    actor
  );
  if (!updated) {
    return null;
  }
  const events = appendEvents({
    actor,
    action: "Multi-location access updated",
    targetId: updated.id,
    summary: `${updated.name} access scope changed to ${updated.locations.join(", ") || "No location"}.`,
    eventType: "Location scope change",
    before: current.locations.join(", "),
    after: updated.locations.join(", "),
  });
  setState({
    ...state,
    activityLogs: events.activityLogs,
    auditTrail: events.auditTrail,
  });
  return updated;
};

export const toggleTeamMemberStatus = (memberId, actor = "Admin Console") => {
  const current = state.members.find((member) => member.id === memberId);
  if (!current) {
    return null;
  }
  const nextStatus = current.status === "Active" ? "Inactive" : "Active";
  const updated = updateTeamMember(
    memberId,
    {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      lastActiveAt:
        nextStatus === "Active" ? new Date().toISOString() : current.lastActiveAt,
    },
    actor
  );
  if (!updated) {
    return null;
  }
  const events = appendEvents({
    actor,
    action: "Member status changed",
    targetId: updated.id,
    summary: `${updated.name} set to ${updated.status}.`,
    eventType: "Status change",
    before: current.status,
    after: updated.status,
  });
  setState({
    ...state,
    activityLogs: events.activityLogs,
    auditTrail: events.auditTrail,
  });
  return updated;
};

export const subscribeTeamAccess = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const teamAccessRoleTemplates = ROLE_TEMPLATES;
