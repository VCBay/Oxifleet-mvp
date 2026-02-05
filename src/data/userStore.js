const users = [
  {
    id: "8aad",
    name: "John Doe",
    email: "startup7@work.com",
    password: "09897867665",
  },
  {
    id: "8aae",
    name: "Ashfaq",
    email: "asfak@vcbay.co",
    password: "1234567890",
  },
];

const normalizeEmail = (email) => email?.toLowerCase();

export const registerUser = ({ name, email, password }) => {
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
