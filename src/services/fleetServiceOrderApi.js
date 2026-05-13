import { authHttp } from "./httpClient";

const parseAxiosErrorMessage = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length) {
    return apiErrors.join(", ");
  }

  const apiMessage = error?.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  return error?.message || "Unable to process service order request.";
};

const normalizeServiceOrder = (order = {}) => ({
  ...order,
  id: String(order?.id || order?.orderId || "").trim(),
  serverId: String(order?.serverId || order?._id || "").trim(),
  requestedAt: order?.requestedAt || new Date().toISOString(),
  updatedAt: order?.updatedAt || new Date().toISOString(),
  lifecycle: Array.isArray(order?.lifecycle) ? order.lifecycle : [],
});

export const listFleetServiceOrdersApi = async (options = {}) => {
  try {
    const params = {};
    const q = String(options?.q || "").trim();
    const status = String(options?.status || "").trim();
    const fleetId = String(options?.fleetId || "").trim();

    if (q) params.q = q;
    if (status) params.status = status;
    if (fleetId) params.fleetId = fleetId;

    const { data } = await authHttp.get("/fleet/service-orders", { params });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map(normalizeServiceOrder);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const decideFleetServiceOrderApi = async (orderId, payload) => {
  try {
    const { data } = await authHttp.patch(
      `/fleet/service-orders/${encodeURIComponent(orderId)}/decision`,
      payload,
    );
    return normalizeServiceOrder(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateFleetServiceOrderLifecycleApi = async (orderId, payload) => {
  try {
    const { data } = await authHttp.patch(
      `/fleet/service-orders/${encodeURIComponent(orderId)}/lifecycle`,
      payload,
    );
    return normalizeServiceOrder(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const acknowledgeFleetServiceOrderSettlementApi = async (orderId, payload = {}) => {
  try {
    const { data } = await authHttp.patch(
      `/fleet/service-orders/${encodeURIComponent(orderId)}/settlement/acknowledge`,
      payload,
    );
    return normalizeServiceOrder(data?.data || {});
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
