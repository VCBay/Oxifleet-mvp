import { Navigate, Route, Routes } from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import { getSession, subscribeSession } from "./auth/session";
import { useSyncExternalStore } from "react";

function App() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const isAuthed = Boolean(session);
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthed ? "/dashboard" : "/signin"} replace />}
      />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/dashboard"
        // element={isAuthed ? <Dashboard /> : <Navigate to="/signin" replace />}
        element={<Dashboard />}
      />
    </Routes>
  );
}

export default App
