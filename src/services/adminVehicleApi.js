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

  return error?.message || "Unable to process vehicle request.";
};

const normalizeVehicle = (vehicle) => {
  const fleet = vehicle?.fleetId;
  return {
    id: vehicle?._id || vehicle?.id || "",
    fleetId: typeof fleet === "object" ? fleet?._id || "" : fleet || "",
    fleetCode: typeof fleet === "object" ? fleet?.fleetCode || "" : "",
    fleetName: typeof fleet === "object" ? fleet?.companyName || "N/A" : "N/A",
    fleetCity: typeof fleet === "object" ? fleet?.city || "N/A" : "N/A",
    vin: vehicle?.vin || "N/A",
    licensePlate: vehicle?.licensePlate || "N/A",
    firstRegistrationDate: vehicle?.firstRegistrationDate || "N/A",
    hsnTsn: vehicle?.hsnTsn || "N/A",
    tireSize: vehicle?.tireSize || "N/A",
    odometer: vehicle?.odometer || "N/A",
    brandModel: vehicle?.brandModel || "N/A",
    carPolicyAssignment: vehicle?.carPolicyAssignment || "N/A",
    location: vehicle?.location || "N/A",
    costCenter: vehicle?.costCenter || "N/A",
    driverAssignment: vehicle?.driverAssignment || "N/A",
    startingTireApp: vehicle?.startingTireApp || "N/A",
    leasingCompany: vehicle?.leasingCompany || "N/A",
    leasingEnd: vehicle?.leasingEnd || "N/A",
    tuvDue: vehicle?.tuvDue || "N/A",
  };
};

const mapVehiclePayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeVehicle);
  }
  return normalizeVehicle(payload);
};

export const listAdminVehicles = async () => {
  try {
    const { data } = await authHttp.get("/admin/vehicles");
    return mapVehiclePayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createAdminVehicle = async (body) => {
  try {
    const { data } = await authHttp.post("/admin/vehicles", body);
    return mapVehiclePayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateAdminVehicle = async (vehicleId, body) => {
  try {
    const { data } = await authHttp.patch(`/admin/vehicles/${vehicleId}`, body);
    return mapVehiclePayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteAdminVehicle = async (vehicleId) => {
  try {
    await authHttp.delete(`/admin/vehicles/${vehicleId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const bulkUploadAdminVehicles = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await authHttp.post("/admin/vehicles/bulk-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      importedCount: data?.data?.importedCount || 0,
      skippedCount: data?.data?.skippedCount || 0,
      imported: mapVehiclePayload(data?.data?.imported || []),
      skipped: Array.isArray(data?.data?.skipped) ? data.data.skipped : [],
    };
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
