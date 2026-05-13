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

  return error?.message || "Unable to process fleet vehicle request.";
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeFleetVehicle = (vehicle) => {
  const parsedOdometerFromLegacy = Number(
    String(vehicle?.odometer || "").replace(/[^0-9.-]/g, ""),
  );

  return {
    id: String(vehicle?.vin || vehicle?._id || "").trim() ||
      `VH-${String(vehicle?._id || "").slice(-6)}`,
    model: vehicle?.brandModel || "Unknown model",
    plate: vehicle?.licensePlate || "N/A",
    type: vehicle?.vehicleType || vehicle?.carPolicyAssignment || "Vehicle",
    status: vehicle?.status || "Active",
    notes: vehicle?.notes || "",
    category: vehicle?.category || "",
    firstRegistrationDate:
      vehicle?.firstRegistrationDate && vehicle.firstRegistrationDate !== "N/A"
        ? vehicle.firstRegistrationDate
        : "",
    leasingCompany:
      vehicle?.leasingCompany && vehicle.leasingCompany !== "N/A"
        ? vehicle.leasingCompany
        : "",
    allowedMileage: parseNumber(vehicle?.allowedMileage),
    leaseEndDate:
      vehicle?.leasingEnd && vehicle.leasingEnd !== "N/A"
        ? vehicle.leasingEnd
        : "",
    tyreSpecs: {
      brand: vehicle?.tyreSpecs?.brand || "",
      size: vehicle?.tyreSpecs?.size || vehicle?.tireSize || "",
      frontPsi: parseNumber(vehicle?.tyreSpecs?.frontPsi),
      rearPsi: parseNumber(vehicle?.tyreSpecs?.rearPsi),
    },
    serviceHistory: Array.isArray(vehicle?.serviceHistory)
      ? vehicle.serviceHistory
      : [],
    warrantyProvider: vehicle?.warrantyProvider || "OEM",
    warrantyExpiryDate: vehicle?.warrantyExpiryDate || "",
    warrantyStatus: vehicle?.warrantyStatus || "Unknown",
    replacementVehicleId: vehicle?.replacementVehicleId || "",
    replacementNotes: vehicle?.replacementNotes || "",
    odometerReading:
      parseNumber(vehicle?.odometerReading) ??
      (Number.isFinite(parsedOdometerFromLegacy) ? parsedOdometerFromLegacy : null),
    odometerUnit: vehicle?.odometerUnit || "km",
    createdAt: vehicle?.createdAt || new Date().toISOString(),
    fleetId: String(vehicle?.fleetId?._id || vehicle?.fleetId || "").trim(),
  };
};

const toVehiclePayload = (vehicle) => ({
  vin: String(vehicle?.id || "").trim(),
  licensePlate: String(vehicle?.plate || "").trim(),
  brandModel: String(vehicle?.model || "").trim(),
  carPolicyAssignment: String(vehicle?.type || "").trim() || "Vehicle",
  vehicleType: String(vehicle?.type || "").trim() || "Vehicle",
  status: String(vehicle?.status || "Active").trim(),
  notes: String(vehicle?.notes || "").trim(),
  category: String(vehicle?.category || "").trim(),
  firstRegistrationDate: String(vehicle?.firstRegistrationDate || "").trim(),
  leasingCompany: String(vehicle?.leasingCompany || "").trim(),
  allowedMileage: parseNumber(vehicle?.allowedMileage),
  leasingEnd: String(vehicle?.leaseEndDate || "").trim(),
  tireSize: String(vehicle?.tyreSpecs?.size || "").trim(),
  tyreSpecs: {
    brand: String(vehicle?.tyreSpecs?.brand || "").trim(),
    size: String(vehicle?.tyreSpecs?.size || "").trim(),
    frontPsi: parseNumber(vehicle?.tyreSpecs?.frontPsi),
    rearPsi: parseNumber(vehicle?.tyreSpecs?.rearPsi),
  },
  serviceHistory: Array.isArray(vehicle?.serviceHistory) ? vehicle.serviceHistory : [],
  warrantyProvider: String(vehicle?.warrantyProvider || "").trim(),
  warrantyExpiryDate: String(vehicle?.warrantyExpiryDate || "").trim(),
  warrantyStatus: String(vehicle?.warrantyStatus || "").trim(),
  replacementVehicleId: String(vehicle?.replacementVehicleId || "").trim(),
  replacementNotes: String(vehicle?.replacementNotes || "").trim(),
  odometerReading: parseNumber(vehicle?.odometerReading),
  odometerUnit: String(vehicle?.odometerUnit || "km").trim(),
  odometer:
    vehicle?.odometerReading !== null && vehicle?.odometerReading !== undefined
      ? String(vehicle.odometerReading)
      : "",
});

const resolveVehicleServerIdByVin = async (vin) => {
  const normalizedVin = String(vin || "").trim();
  if (!normalizedVin) {
    throw new Error("Vehicle ID is required.");
  }

  const { data } = await authHttp.get("/admin/vehicles", {
    params: { q: normalizedVin },
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  const match = rows.find(
    (row) =>
      String(row?.vin || "").trim().toLowerCase() ===
      normalizedVin.toLowerCase(),
  );

  if (!match?._id) {
    throw new Error("Vehicle not found on server.");
  }

  return match._id;
};

export const listFleetVehiclesApi = async (options = {}) => {
  try {
    const params = {};
    const q = String(options?.q || "").trim();
    const fleetId = String(options?.fleetId || "").trim();
    if (q) params.q = q;
    if (fleetId) params.fleetId = fleetId;

    const { data } = await authHttp.get("/admin/vehicles", { params });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map(normalizeFleetVehicle);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createFleetVehicleApi = async (vehicle) => {
  try {
    const payload = toVehiclePayload(vehicle);
    if (!payload.vin || !payload.licensePlate) {
      throw new Error("Vehicle ID and plate are required.");
    }

    const { data } = await authHttp.post("/admin/vehicles", payload);
    return normalizeFleetVehicle(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateFleetVehicleByVinApi = async (vin, vehicle) => {
  try {
    const serverId = await resolveVehicleServerIdByVin(vin);
    const payload = toVehiclePayload(vehicle);
    const { data } = await authHttp.patch(`/admin/vehicles/${serverId}`, payload);
    return normalizeFleetVehicle(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const bulkUpsertFleetVehiclesApi = async (vehicles = []) => {
  const list = Array.isArray(vehicles) ? vehicles : [vehicles];
  let inserted = 0;
  let updated = 0;
  const persisted = [];

  for (const item of list) {
    const vin = String(item?.id || "").trim();
    if (!vin) continue;

    try {
      const existingServerId = await resolveVehicleServerIdByVin(vin);
      const payload = toVehiclePayload(item);
      const { data } = await authHttp.patch(`/admin/vehicles/${existingServerId}`, payload);
      persisted.push(normalizeFleetVehicle(data?.data || {}));
      updated += 1;
    } catch (error) {
      const message = parseAxiosErrorMessage(error).toLowerCase();
      if (!message.includes("not found")) {
        throw new Error(parseAxiosErrorMessage(error));
      }

      const created = await createFleetVehicleApi(item);
      persisted.push(created);
      inserted += 1;
    }
  }

  return {
    inserted,
    updated,
    total: inserted + updated,
    vehicles: persisted,
  };
};


