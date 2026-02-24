import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/FleetDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import POSDashboard from "./pages/POSDashboard";
import POSDashboardOverviewPage from "./pages/POSDashboardOverviewPage";
import POSOrderManagementPage from "./pages/POSOrderManagementPage";
import {
  getDefaultRouteForSession,
  getSession,
  isDriverSession,
  isPosSession,
  subscribeSession,
} from "./auth/session";
import { useSyncExternalStore } from "react";

function App() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const isAuthed = Boolean(session);
  const defaultAuthedPath = getDefaultRouteForSession(session);
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthed ? defaultAuthedPath : "/signin"} replace />}
        />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/dashboard"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : isDriverSession(session) ? (
              <Navigate to="/driver-dashboard" replace />
            ) : isPosSession(session) ? (
              <Navigate to="/pos-dashboard" replace />
            ) : (
              <Dashboard />
            )
          }
        />
        <Route
          path="/driver-dashboard"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : isDriverSession(session) ? (
              <DriverDashboard />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/pos-dashboard"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : isPosSession(session) ? (
              <POSDashboard />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<POSDashboardOverviewPage />} />
          <Route path="order-management" element={<POSOrderManagementPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App
