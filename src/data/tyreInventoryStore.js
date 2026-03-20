const tyreInventory = [
  {
    id: "TY-001",
    size: "295/75R22.5",
    brand: "Goodyear",
    category: "Highway",
    manufacturer: "Goodyear",
    onHand: 20,
    reserved: 8,
    etaDays: 4,
    unitPrice: 420,
  },
  {
    id: "TY-002",
    size: "295/75R22.5",
    brand: "Michelin",
    category: "All-season",
    manufacturer: "Michelin",
    onHand: 14,
    reserved: 6,
    etaDays: 5,
    unitPrice: 438,
  },
  {
    id: "TY-003",
    size: "295/75R22.5",
    brand: "Bridgestone",
    category: "All-season",
    manufacturer: "Bridgestone",
    onHand: 10,
    reserved: 9,
    etaDays: 6,
    unitPrice: 410,
  },
  {
    id: "TY-004",
    size: "11R22.5",
    brand: "Michelin",
    category: "Winter",
    manufacturer: "Michelin",
    onHand: 2,
    reserved: 2,
    etaDays: 3,
    unitPrice: 452,
  },
  {
    id: "TY-005",
    size: "11R22.5",
    brand: "Goodyear",
    category: "All-season",
    manufacturer: "Goodyear",
    onHand: 3,
    reserved: 2,
    etaDays: 5,
    unitPrice: 430,
  },
  {
    id: "TY-006",
    size: "275/80R22.5",
    brand: "Bridgestone",
    category: "Highway",
    manufacturer: "Bridgestone",
    onHand: 16,
    reserved: 7,
    etaDays: 4,
    unitPrice: 408,
  },
  {
    id: "TY-007",
    size: "275/80R22.5",
    brand: "Pirelli",
    category: "All-season",
    manufacturer: "Pirelli",
    onHand: 6,
    reserved: 2,
    etaDays: 7,
    unitPrice: 396,
  },
  {
    id: "TY-008",
    size: "315/80R22.5",
    brand: "Continental",
    category: "Highway",
    manufacturer: "Continental",
    onHand: 5,
    reserved: 4,
    etaDays: 8,
    unitPrice: 468,
  },
  {
    id: "TY-009",
    size: "315/80R22.5",
    brand: "Goodyear",
    category: "All-season",
    manufacturer: "Goodyear",
    onHand: 1,
    reserved: 1,
    etaDays: 9,
    unitPrice: 454,
  },
];

export const normalizeInventoryValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const getTyreInventory = () => tyreInventory.map((item) => ({ ...item }));

export const getTyreInventoryBySize = ({ size, category = "all" } = {}) =>
  tyreInventory
    .filter((item) => normalizeInventoryValue(item.size) === normalizeInventoryValue(size))
    .filter(
      (item) =>
        category === "all" ||
        normalizeInventoryValue(item.category) === normalizeInventoryValue(category),
    )
    .map((item) => ({
      ...item,
      available: Math.max(0, Number(item.onHand || 0) - Number(item.reserved || 0)),
    }))
    .sort((a, b) => b.available - a.available);

export const evaluateTyreStock = ({
  size,
  preferredBrand = "",
  requiredQty = 1,
  category = "all",
} = {}) => {
  const safeQty = Math.max(1, Number(requiredQty) || 1);
  const availableBySize = getTyreInventoryBySize({ size, category });

  if (!String(size || "").trim()) {
    return {
      status: "No vehicle selected",
      message: "Select a vehicle to check tyre availability.",
      canFulfill: false,
      availableBySize,
      preferredStock: null,
      requiredQty: safeQty,
      totalAvailable: 0,
    };
  }

  const preferredStock =
    availableBySize.find(
      (item) =>
        normalizeInventoryValue(item.brand) === normalizeInventoryValue(preferredBrand),
    ) || null;

  if (preferredStock && preferredStock.available >= safeQty) {
    return {
      status: "Available",
      message: `${preferredStock.brand} can fulfill ${safeQty} tyre(s) immediately.`,
      canFulfill: true,
      availableBySize,
      preferredStock,
      requiredQty: safeQty,
      totalAvailable: availableBySize.reduce(
        (sum, item) => sum + Number(item.available || 0),
        0,
      ),
    };
  }

  const totalAvailable = availableBySize.reduce(
    (sum, item) => sum + Number(item.available || 0),
    0,
  );

  if (totalAvailable >= safeQty) {
    return {
      status: "Partially available",
      message:
        "Preferred brand is low. Required quantity can be fulfilled using alternative brands.",
      canFulfill: true,
      availableBySize,
      preferredStock,
      requiredQty: safeQty,
      totalAvailable,
    };
  }

  return {
    status: "Insufficient stock",
    message:
      "Current stock cannot fulfill required quantity. Check ETA and alternatives.",
    canFulfill: false,
    availableBySize,
    preferredStock,
    requiredQty: safeQty,
    totalAvailable,
  };
};
