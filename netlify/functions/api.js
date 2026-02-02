import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dbPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "data",
  "db.json"
);

const json = (data) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const raw = await fs.readFile(dbPath, "utf-8");
  const db = JSON.parse(raw);

  const prefix = "/.netlify/functions/api";
  const pathOnly = event.path.startsWith(prefix)
    ? event.path.slice(prefix.length)
    : event.path;
  const cleanPath = pathOnly.replace(/^\/+/, "");

  if (!cleanPath) {
    return json(db);
  }

  const [collection, id] = cleanPath.split("/").filter(Boolean);
  const items = Array.isArray(db[collection]) ? db[collection] : [];

  if (!id) {
    return json(items);
  }

  const match = items.find((item) => String(item.id) === id);
  return json(match ?? {});
};
