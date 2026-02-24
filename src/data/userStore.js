const users = [
  {
    id: "8aad",
    name: "John Doe",
    email: "startup7@work.com",
    password: "09897867665",
    role: "ops_admin",
  },
  {
    id: "8aae",
    name: "Ashfaq",
    email: "asfak@vcbay.co",
    password: "1234567890",
    role: "ops_admin",
  },
  {
    id: "8aaa",
    name: "Manoj Patil",
    email: "manoj@vcbay.co",
    password: "1234567890",
    role: "ops_admin",
  },
  {
    id: "drv01",
    name: "Jamie Stewart",
    email: "jamie.driver@oxifleet.com",
    password: "1234567890",
    role: "driver",
    driverName: "Jamie Stewart",
    tenantId: "TEN-ALPHA",
    driverId: "DR-104",
    assignedVehicleId: "VH-884",
  },
  {
    id: "drv02",
    name: "Avery Chen",
    email: "avery.driver@oxifleet.com",
    password: "1234567890",
    role: "driver",
    driverName: "Avery Chen",
    tenantId: "TEN-BRAVO",
    driverId: "DR-205",
    assignedVehicleId: "VH-241",
  },
  {
    id: "pos01",
    name: "Nina POS",
    email: "nina.pos@oxifleet.com",
    password: "1234567890",
    role: "pos",
    workstationId: "POS-DAL-01",
  },
  {
    id: "pos02",
    name: "Ravi POS",
    email: "ravi.pos@oxifleet.com",
    password: "1234567890",
    role: "pos",
    workstationId: "POS-AUS-02",
  },
];

const normalizeEmail = (email) => email?.toLowerCase();

export const registerUser = ({ name, email, password, role = "ops_admin" }) => {
  const normalizedEmail = normalizeEmail(email);
  const exists = users.some(
    (user) => normalizeEmail(user.email) === normalizedEmail
  );
  if (exists) {
    throw new Error("Email already exists");
  }

  const newUser = {
    id: Math.random().toString(36).slice(2, 6),
    name,
    email,
    password,
    role,
  };
  users.push(newUser);
  return newUser;
};

export const findUserByCredentials = (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  return users.find(
    (user) =>
      normalizeEmail(user.email) === normalizedEmail &&
      user.password === password
  );
};
