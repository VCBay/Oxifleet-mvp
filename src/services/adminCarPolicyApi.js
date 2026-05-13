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

  return error?.message || "Unable to process car policy request.";
};

const normalizeCarPolicy = (policy) => ({
  id: policy?._id || policy?.id || "",
  policyCode: policy?.policyCode || "N/A",
  policyVersion: policy?.policyVersion || "N/A",
  policyScope: policy?.policyScope || "N/A",
  approvedTiresPerOem: policy?.approvedTiresPerOem || "N/A",
  preferredTires: policy?.preferredTires || "N/A",
  approvedServiceNetwork: policy?.approvedServiceNetwork || "N/A",
  priorityServiceNetwork: policy?.priorityServiceNetwork || "N/A",
  discountsPerOem: policy?.discountsPerOem || "N/A",
  replacementIntervals: policy?.replacementIntervals || "N/A",
  replacementReminderRules: policy?.replacementReminderRules || "N/A",
  approvalRules: policy?.approvalRules || "N/A",
  orderInvoiceRules: policy?.orderInvoiceRules || "N/A",
  cashbackPerOem: policy?.cashbackPerOem || "N/A",
});

const mapCarPolicyPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeCarPolicy);
  }
  return normalizeCarPolicy(payload);
};

export const listAdminCarPolicies = async () => {
  try {
    const { data } = await authHttp.get("/admin/car-policies");
    return mapCarPolicyPayload(data?.data || []);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const createAdminCarPolicy = async (body) => {
  try {
    const { data } = await authHttp.post("/admin/car-policies", body);
    return mapCarPolicyPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const updateAdminCarPolicy = async (policyId, body) => {
  try {
    const { data } = await authHttp.patch(`/admin/car-policies/${policyId}`, body);
    return mapCarPolicyPayload(data?.data);
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const deleteAdminCarPolicy = async (policyId) => {
  try {
    await authHttp.delete(`/admin/car-policies/${policyId}`);
    return true;
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};

export const bulkUploadAdminCarPolicies = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await authHttp.post("/admin/car-policies/bulk-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      importedCount: data?.data?.importedCount || 0,
      skippedCount: data?.data?.skippedCount || 0,
      imported: mapCarPolicyPayload(data?.data?.imported || []),
      skipped: Array.isArray(data?.data?.skipped) ? data.data.skipped : [],
    };
  } catch (error) {
    throw new Error(parseAxiosErrorMessage(error));
  }
};
