import { useLocation, useOutletContext } from "react-router-dom";
import POSOrderManagement from "../components/POSOrderManagement";

function POSOrderManagementPage() {
  const location = useLocation();
  const { assignedDriver, fleetDetails, vehicles, selectedVehicle, session } =
    useOutletContext();
  const params = new URLSearchParams(location.search);

  return (
    <POSOrderManagement
      assignedDriver={assignedDriver}
      completionMode={params.get("mode") === "completion-invoice"}
      completionPosOrderId={params.get("posOrderId") || ""}
      completionRequestId={params.get("requestId") || ""}
      completionServiceType={params.get("serviceType") || ""}
      completionVehicleId={params.get("vehicleId") || ""}
      fleetDetails={fleetDetails}
      selectedVehicle={selectedVehicle}
      session={session}
      vehicles={vehicles}
    />
  );
}

export default POSOrderManagementPage;
