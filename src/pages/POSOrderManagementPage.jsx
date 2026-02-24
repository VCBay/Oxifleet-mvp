import { useOutletContext } from "react-router-dom";
import POSOrderManagement from "../components/POSOrderManagement";

function POSOrderManagementPage() {
  const { vehicles, selectedVehicle, session } = useOutletContext();
  return (
    <POSOrderManagement
      selectedVehicle={selectedVehicle}
      session={session}
      vehicles={vehicles}
    />
  );
}

export default POSOrderManagementPage;
