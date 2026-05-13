let cryptoKeyPromise = null;

const toPem = (value) => {
  const raw = String(value || "").replace(/\\n/g, "\n").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("BEGIN PUBLIC KEY")) {
    return raw;
  }

  // Allow base64-only key in env by wrapping with PEM markers.
  return `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
};

const getPublicKeyDerBuffer = () => {
  const pem = toPem(import.meta.env.VITE_AUTH_RSA_PUBLIC_KEY);
  if (!pem) {
    throw new Error("VITE_AUTH_RSA_PUBLIC_KEY is missing in frontend .env");
  }

  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");

  if (!base64) {
    throw new Error("VITE_AUTH_RSA_PUBLIC_KEY is invalid.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const getCryptoKey = async () => {
  if (!window?.crypto?.subtle) {
    throw new Error("Secure crypto API is unavailable in this browser.");
  }

  if (!cryptoKeyPromise) {
    const derBuffer = getPublicKeyDerBuffer();
    cryptoKeyPromise = window.crypto.subtle.importKey(
      "spki",
      derBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );
  }

  return cryptoKeyPromise;
};

export const encryptPasswordForAuth = async (password) => {
  if (!password) {
    throw new Error("Password is required for encryption.");
  }

  const cryptoKey = await getCryptoKey();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new TextEncoder().encode(password),
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
};
