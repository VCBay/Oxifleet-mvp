const API_BASE = import.meta.env.VITE_API_URL || "/api";

const request = async (path, options) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const getAll = (name) => request(`/${name}`);

export const getById = (name, id) => request(`/${name}/${id}`);

export const insert = (name, item) =>
  request(`/${name}`, {
    method: "POST",
    body: JSON.stringify(item),
  });

export const update = (name, id, updates) =>
  request(`/${name}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const remove = async (name, id) => {
  await request(`/${name}/${id}`, { method: "DELETE" });
  return true;
};

export const resetData = () => request("/__reset", { method: "POST" });

export const createItem = insert;
export const getCollection = getAll;
export const updateItem = update;
export const deleteItem = remove;
