import { authHttp } from "./httpClient";

const parseAxiosErrorMessage = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length) {
    return apiErrors.join(", ");
  }

  const apiDetails = error?.response?.data?.details;
  if (Array.isArray(apiDetails) && apiDetails.length) {
    return apiDetails
      .slice(0, 3)
      .map((item) => `L${item.lineNumber || "?"}: ${item.reason || "Invalid row"}`)
      .join(" | ");
  }

  const apiMessage = error?.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  return error?.message || "Unable to process fleet driver request.";
};

const parseNumber = (value, fallback = 80) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fallbackDriverId = (serverId = "") => {
  const suffix = String(serverId || "").slice(-4).toUpperCase();
  return `DR-${suffix || "0000"}`;
};

const resolveInviteStatus = (driver) => {
  const deliveryStatus = String(driver?.invitation?.deliveryStatus || "").toLowerCase();
  if (deliveryStatus === "failed") {
    return "failed";
  }
  if (deliveryStatus === "queued" || deliveryStatus === "pending") {
    return "pending";
  }
  if (deliveryStatus === "sent" || deliveryStatus === "delivered") {
    return "sent";
  }

  const authText = String(driver?.driverAuthentication || "").toLowerCase();
  if (authText.includes("failed")) {
    return "failed";
  }
  if (authText.includes("pending") || authText.includes("not sent")) {
    return "pending";
  }
  if (authText.includes("accepted")) {
    return "accepted";
  }
  if (authText.includes("invitation") || authText.includes("sent")) {
    return "sent";
  }
  return "unknown";
};

const normalizeFleetDriver = (driver) => {
  const employeeId = String(driver?.employeeId || "").trim();
  const displayId = employeeId && employeeId !== "N/A" ? employeeId : fallbackDriverId(driver?._id);

  return {
    id: displayId,
    serverId: String(driver?._id || driver?.id || "").trim(),
    name: driver?.name || "Unnamed driver",
    email: driver?.mailAddress || "unknown@oxifleet.com",
    phone: driver?.phoneMobileNumber || "N/A",
    license: driver?.driversLicenseData || "N/A",
    status: driver?.status || driver?.activityStatus || "Active",
    activityStatus: driver?.activityStatus || driver?.status || "Active",
    assignedVehicleId: String(driver?.vehicleAssignment || "").trim(),
    complianceScore: parseNumber(driver?.complianceScore, 80),
    accessLevel: driver?.accessLevel || "Standard",
    notes: driver?.notes || "",
    serviceHistory: Array.isArray(driver?.serviceHistory) ? driver.serviceHistory : [],
    createdAt: driver?.createdAt || new Date().toISOString(),
    driverAuthentication: driver?.driverAuthentication || "",
    invitation: driver?.invitation || null,
    inviteStatus: resolveInviteStatus(driver),
  };
};

const toDriverPayload = (driver) => ({
  name: String(driver?.name || "").trim(),
  street: "N/A",
  postcode: "N/A",
  city: "N/A",
  driversLicenseData: String(driver?.license || "").trim() || "N/A",
  phoneMobileNumber: String(driver?.phone || "").trim() || "N/A",
  mailAddress: String(driver?.email || "").trim().toLowerCase(),
  employeeId: String(driver?.id || "").trim() || "N/A",
  companyInformation: "Fleet dashboard",
  vehicleAssignment: String(driver?.assignedVehicleId || "").trim(),
  driverAuthentication: "Invitation sent",
  status: String(driver?.status || "Active").trim(),
  activityStatus: String(driver?.activityStatus || driver?.status || "Active").trim(),
  accessLevel: String(driver?.accessLevel || "Standard").trim(),
  complianceScore: parseNumber(driver?.complianceScore, 80),
  notes: String(driver?.notes || "").trim(),
});

export const listFleetDriversApi = async () => {
  try {
    const { data } = await authHttp.get("/admin/drivers");
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map(normalizeFleetDriver);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createFleetDriverApi = async (driver) => {
  try {
    const payload = toDriverPayload(driver);
    if (!payload.name || !payload.mailAddress) {
      throw new Error("Driver name and email are required.");
    }
    const { data } = await authHttp.post("/admin/drivers", payload);
    return normalizeFleetDriver(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateFleetDriverByServerIdApi = async (serverId, driver) => {
  try {
    const payload = toDriverPayload(driver);
    const { data } = await authHttp.patch(`/admin/drivers/${serverId}`, payload);
    return normalizeFleetDriver(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteFleetDriverByServerIdApi = async (serverId) => {
  try {
    await authHttp.delete(`/admin/drivers/${serverId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
