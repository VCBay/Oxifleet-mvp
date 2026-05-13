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

  return error?.message || "Unable to process user management request.";
};

const normalizeUserRow = (row) => ({
  id: row?.id || row?._id || "",
  user: row?.user || "N/A",
  role: row?.role || "driver",
  tenant: row?.tenant || "Global",
  status: row?.status || "Active",
});

const mapUserPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeUserRow);
  }
  return normalizeUserRow(payload);
};

export const listAdminUsers = async () => {
  try {
    const { data } = await authHttp.get("/admin/users");
    return mapUserPayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createAdminUser = async (body) => {
  try {
    const { data } = await authHttp.post("/admin/users", body);
    return mapUserPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateAdminUser = async (userId, body) => {
  try {
    const { data } = await authHttp.patch(`/admin/users/${userId}`, body);
    return mapUserPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteAdminUser = async (userId) => {
  try {
    await authHttp.delete(`/admin/users/${userId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
