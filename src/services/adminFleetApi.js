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

  return error?.message || "Unable to process fleet request.";
};

const normalizeFleet = (fleet) => ({
  id: fleet?._id || "",
  fleetCode: fleet?.fleetCode || "",
  companyName: fleet?.companyName || "N/A",
  street: fleet?.street || "N/A",
  postcode: fleet?.postcode || "N/A",
  city: fleet?.city || "N/A",
  registrationNumber: fleet?.registrationNumber || "N/A",
  vatNumber: fleet?.vatNumber || "N/A",
  managingDirector: fleet?.managingDirector || "N/A",
  isActive: Boolean(fleet?.isActive),
  vehicles: Array.isArray(fleet?.vehicles)
    ? fleet.vehicles.map((vehicle) => ({
        id: vehicle?._id || "",
        plate: vehicle?.plate || vehicle?.licensePlate || "N/A",
        model: vehicle?.model || vehicle?.brandModel || "N/A",
      }))
    : [],
  drivers: Array.isArray(fleet?.drivers)
    ? fleet.drivers.map((driver) => ({
        id: driver?._id || "",
        name: driver?.name || "N/A",
        email: driver?.email || "N/A",
        phone: driver?.phone || "N/A",
      }))
    : [],
});

const mapFleetPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeFleet);
  }
  return normalizeFleet(payload);
};

export const listAdminFleets = async () => {
  try {
    const { data } = await authHttp.get("/admin/fleets");
    return mapFleetPayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createAdminFleet = async (body) => {
  try {
    const { data } = await authHttp.post("/admin/fleets", body);
    return mapFleetPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateAdminFleet = async (fleetId, body) => {
  try {
    const { data } = await authHttp.patch(`/admin/fleets/${fleetId}`, body);
    return mapFleetPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteAdminFleet = async (fleetId) => {
  try {
    await authHttp.delete(`/admin/fleets/${fleetId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const setAdminFleetStatus = async (fleetId, isActive) => {
  try {
    const { data } = await authHttp.patch(`/admin/fleets/${fleetId}/status`, {
      isActive,
    });
    return mapFleetPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const addAdminFleetVehicle = async (fleetId, body) => {
  try {
    const { data } = await authHttp.post(`/admin/fleets/${fleetId}/vehicles`, body);
    return mapFleetPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const addAdminFleetDriver = async (fleetId, body) => {
  try {
    const { data } = await authHttp.post(`/admin/fleets/${fleetId}/drivers`, body);
    return mapFleetPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
export const bulkUploadAdminFleets = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await authHttp.post("/admin/fleets/bulk-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      importedCount: data?.data?.importedCount || 0,
      skippedCount: data?.data?.skippedCount || 0,
      imported: mapFleetPayload(data?.data?.imported || []),
      skipped: Array.isArray(data?.data?.skipped) ? data.data.skipped : [],
    };
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};







