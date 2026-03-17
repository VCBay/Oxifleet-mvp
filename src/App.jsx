import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/FleetDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import POSDashboard from "./pages/POSDashboard";
import POSDashboardOverviewPage from "./pages/POSDashboardOverviewPage";
import POSOrderManagementPage from "./pages/POSOrderManagementPage";
import POSValidationPage from "./pages/POSValidationPage";
import POSApprovalWorkflowPage from "./pages/POSApprovalWorkflowPage";
import POSBillingSettlementPage from "./pages/POSBillingSettlementPage";
import POSInventoryAvailabilityPage from "./pages/POSInventoryAvailabilityPage";
import POSAnalyticsReportsPage from "./pages/POSAnalyticsReportsPage";
import POSProfileSettingsPage from "./pages/POSProfileSettingsPage";
import POSCommunicationPage from "./pages/POSCommunicationPage";
import DriverServiceRequestPreviewPage from "./pages/DriverServiceRequestPreviewPage";
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
              <Navigate to="/dashboard/overview" replace />
            )
          }
        />
        <Route
          path="/dashboard/*"
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
              <Navigate to="/driver-dashboard/overview" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/driver-dashboard/service-request-preview"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : isDriverSession(session) ? (
              <DriverServiceRequestPreviewPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/driver-dashboard/*"
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
          <Route path="validation" element={<POSValidationPage />} />
          <Route path="approval-workflow" element={<POSApprovalWorkflowPage />} />
          <Route path="billing-settlement" element={<POSBillingSettlementPage />} />
          <Route path="inventory-availability" element={<POSInventoryAvailabilityPage />} />
          <Route path="analytics-reports" element={<POSAnalyticsReportsPage />} />
          <Route path="communication" element={<POSCommunicationPage />} />
          <Route path="profile-settings" element={<POSProfileSettingsPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App
