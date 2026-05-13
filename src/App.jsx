import { useSyncExternalStore } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import {
  getDefaultRouteForSession,
  getPostTwoFactorRoute,
  getSession,
  isAdminSession,
  isDriverSession,
  isPosSession,
  requiresTwoFactorSetup,
  requiresTwoFactorVerification,
  subscribeSession,
} from "./auth/session";
import AdminCarPolicyPage from "./pages/AdminCarPolicyPage";
import AdminContractPage from "./pages/AdminContractPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDriverDataPage from "./pages/AdminDriverDataPage";
import AdminFleetDataPage from "./pages/AdminFleetDataPage";
import AdminLogin from "./pages/AdminLogin";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminUserManagementPage from "./pages/AdminUserManagementPage";
import AdminVehicleDataPage from "./pages/AdminVehicleDataPage";
import DriverDashboard from "./pages/DriverDashboard";
import DriverServiceRequestPreviewPage from "./pages/DriverServiceRequestPreviewPage";
import Dashboard from "./pages/FleetDashboard";
import POSAnalyticsReportsPage from "./pages/POSAnalyticsReportsPage";
import POSApprovalWorkflowPage from "./pages/POSApprovalWorkflowPage";
import POSBillingSettlementPage from "./pages/POSBillingSettlementPage";
import POSCommunicationPage from "./pages/POSCommunicationPage";
import POSDashboard from "./pages/POSDashboard";
import POSDashboardOverviewPage from "./pages/POSDashboardOverviewPage";
import POSInventoryAvailabilityPage from "./pages/POSInventoryAvailabilityPage";
import POSOrderManagementPage from "./pages/POSOrderManagementPage";
import POSProfileSettingsPage from "./pages/POSProfileSettingsPage";
import POSValidationPage from "./pages/POSValidationPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage";
import TwoFactorVerifyPage from "./pages/TwoFactorVerifyPage";

function App() {
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);
  const isAuthed = Boolean(session);
  const defaultAuthedPath = getDefaultRouteForSession(session);
  const postTwoFactorPath = getPostTwoFactorRoute(session);
  const needsTwoFactorSetup = requiresTwoFactorSetup(session);
  const needsTwoFactorVerification = requiresTwoFactorVerification(session);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthed ? defaultAuthedPath : "/signin"} replace />}
        />

        <Route
          path="/signin"
          element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <SignIn />}
        />

        <Route
          path="/admin/login"
          element={
            isAuthed && isAdminSession(session) ? (
              <Navigate
                to={
                  needsTwoFactorSetup
                    ? "/two-factor-auth"
                    : needsTwoFactorVerification
                      ? "/two-factor-verify"
                      : "/admin/dashboard/overview"
                }
                replace
              />
            ) : (
              <AdminLogin />
            )
          }
        />

        <Route
          path="/two-factor-auth"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : needsTwoFactorSetup ? (
              <TwoFactorAuthPage />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : (
              <Navigate to={postTwoFactorPath} replace />
            )
          }
        />

        <Route
          path="/two-factor-verify"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <TwoFactorVerifyPage />
            ) : (
              <Navigate to={postTwoFactorPath} replace />
            )
          }
        />

        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/admin"
          element={
            !isAuthed ? (
              <Navigate to="/admin/login" replace />
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
            ) : (
              <Navigate to={postTwoFactorPath} replace />
            )
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            !isAuthed ? (
              <Navigate to="/admin/login" replace />
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <AdminDashboard />
            ) : (
              <Navigate to={postTwoFactorPath} replace />
            )
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="fleet-data" element={<AdminFleetDataPage />} />
          <Route path="vehicle-data" element={<AdminVehicleDataPage />} />
          <Route path="driver-data" element={<AdminDriverDataPage />} />
          <Route path="car-policy" element={<AdminCarPolicyPage />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="user-management" element={<AdminUserManagementPage />} />
          <Route path="contract" element={<AdminContractPage />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            !isAuthed ? (
              <Navigate to="/signin" replace />
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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
            ) : needsTwoFactorSetup ? (
              <Navigate to="/two-factor-auth" replace />
            ) : needsTwoFactorVerification ? (
              <Navigate to="/two-factor-verify" replace />
            ) : isAdminSession(session) ? (
              <Navigate to="/admin/dashboard/overview" replace />
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

export default App;
