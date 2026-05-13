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

  return error?.message || "Unable to process driver request.";
};

const normalizeDriver = (driver) => {
  const fleet = driver?.fleetId;
  return {
    id: driver?._id || driver?.id || "",
    fleetId: typeof fleet === "object" ? fleet?._id || "" : fleet || "",
    fleetCode: typeof fleet === "object" ? fleet?.fleetCode || "" : "",
    fleetName: typeof fleet === "object" ? fleet?.companyName || "N/A" : "N/A",
    fleetCity: typeof fleet === "object" ? fleet?.city || "N/A" : "N/A",
    name: driver?.name || "N/A",
    street: driver?.street || "N/A",
    postcode: driver?.postcode || "N/A",
    city: driver?.city || "N/A",
    driversLicenseData: driver?.driversLicenseData || "N/A",
    phoneMobileNumber: driver?.phoneMobileNumber || "N/A",
    mailAddress: driver?.mailAddress || "N/A",
    employeeId: driver?.employeeId || "N/A",
    companyInformation: driver?.companyInformation || "N/A",
    vehicleAssignment: driver?.vehicleAssignment || "N/A",
    driverAuthentication: driver?.driverAuthentication || "N/A",
  };
};

const mapDriverPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeDriver);
  }
  return normalizeDriver(payload);
};

export const listAdminDrivers = async () => {
  try {
    const { data } = await authHttp.get("/admin/drivers");
    return mapDriverPayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createAdminDriver = async (body) => {
  try {
    const { data } = await authHttp.post("/admin/drivers", body);
    return mapDriverPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateAdminDriver = async (driverId, body) => {
  try {
    const { data } = await authHttp.patch(`/admin/drivers/${driverId}`, body);
    return mapDriverPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteAdminDriver = async (driverId) => {
  try {
    await authHttp.delete(`/admin/drivers/${driverId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const bulkUploadAdminDrivers = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await authHttp.post("/admin/drivers/bulk-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      importedCount: data?.data?.importedCount || 0,
      skippedCount: data?.data?.skippedCount || 0,
      imported: mapDriverPayload(data?.data?.imported || []),
      skipped: Array.isArray(data?.data?.skipped) ? data.data.skipped : [],
    };
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
