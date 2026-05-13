import { authHttp } from "./httpClient";
import { encryptPasswordForAuth } from "./passwordCrypto";

const createAuthApiError = (error) => {
  const apiMessage = error?.response?.data?.message;
  const apiDetails = error?.response?.data?.details || null;
  const apiErrors = error?.response?.data?.errors;

  let message = "Unable to connect to authentication service.";
  if (Array.isArray(apiErrors) && apiErrors.length) {
    message = apiErrors.join(", ");
  } else if (apiMessage) {
    message = apiMessage;
  } else if (error?.code === "ECONNABORTED") {
    message = "Request timeout. Please try again.";
  } else if (error?.message) {
    message = error.message;
  }

  const customError = new Error(message);
  customError.statusCode = error?.response?.status;
  customError.details = apiDetails;
  customError.code = apiDetails?.code || null;
  customError.retryAfterSeconds = Number(apiDetails?.retryAfterSeconds || 0);
  customError.remainingAttempts = Number(apiDetails?.remainingAttempts || 0);
  return customError;
};

const mapAuthPayload = (payload) => {
  const token = payload?.data?.token;
  const user = payload?.data?.user;

  if (!token || !user) {
    throw new Error("Invalid login response from server.");
  }

  return {
    ...payload?.data,
    token,
    user,
  };
};

const buildEncryptedPasswordPayload = async (password) => {
  const encryptedPassword = await encryptPasswordForAuth(password);
  return { encryptedPassword };
};

export const loginUser = async ({ phone, password }) => {
  try {
    const passwordPayload = await buildEncryptedPasswordPayload(password);
    const { data: payload } = await authHttp.post("/auth/login", {
      phone,
      ...passwordPayload,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const loginSuperAdmin = async ({ phone, password }) => {
  try {
    const passwordPayload = await buildEncryptedPasswordPayload(password);
    const { data: payload } = await authHttp.post("/auth/super-admin/login", {
      phone,
      ...passwordPayload,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const verifyLoginOtp = async ({ challengeId, otpCode }) => {
  try {
    const { data: payload } = await authHttp.post("/auth/login/verify-otp", {
      challengeId,
      otpCode,
    });

    return mapAuthPayload(payload);
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const resendLoginOtp = async (challengeId) => {
  try {
    const { data: payload } = await authHttp.post("/auth/login/resend-otp", {
      challengeId,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const fetchDriverInviteDetails = async (inviteToken) => {
  try {
    const { data: payload } = await authHttp.get(`/auth/driver-invite/${encodeURIComponent(inviteToken)}`);
    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const registerAuthUser = async ({
  name,
  phone,
  password,
  type = "fleet-admin",
  inviteToken,
  email,
  driverId,
  fleetId,
}) => {
  try {
    const [firstname, ...rest] = String(name || "").trim().split(/\s+/);
    const lastname = rest.join(" ") || "User";
    const passwordPayload = await buildEncryptedPasswordPayload(password);

    const body = {
      phone,
      ...passwordPayload,
      type,
      firstname,
      lastname,
      is2fauth: false,
    };

    if (inviteToken) {
      body.inviteToken = inviteToken;
    }
    if (email) {
      body.email = email;
    }
    if (driverId) {
      body.driver_id = driverId;
    }
    if (fleetId) {
      body.fleet_id = fleetId;
    }

    const { data: payload } = await authHttp.post("/auth/register", body);
    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const resendSignupOtp = async (challengeId) => {
  try {
    const { data: payload } = await authHttp.post("/auth/register/resend-otp", {
      challengeId,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const verifySignupOtp = async ({ challengeId, otpCode }) => {
  try {
    const { data: payload } = await authHttp.post("/auth/register/verify-otp", {
      challengeId,
      otpCode,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const initiateTwoFactorSetup = async (twoFactorType = "sms") => {
  try {
    const { data: payload } = await authHttp.patch("/auth/2fa/setup", {
      two_factor_type: twoFactorType,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};

export const completeTwoFactorSetup = async ({ challengeId, otpCode }) => {
  try {
    const { data: payload } = await authHttp.patch("/auth/2fa/setup/verify-otp", {
      challengeId,
      otpCode,
    });

    return payload?.data || null;
  } catch (error) {
    throw createAuthApiError(error);
  }
};
