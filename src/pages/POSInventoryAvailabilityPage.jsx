import { useOutletContext } from "react-router-dom";
import POSInventoryAvailabilityControl from "../components/POSInventoryAvailabilityControl";

function POSInventoryAvailabilityPage() {
  const { primaryPolicy, selectedVehicle, vehicles } = useOutletContext();
  return (
    <POSInventoryAvailabilityControl
      primaryPolicy={primaryPolicy}
      selectedVehicle={selectedVehicle}
      vehicles={vehicles}
    />
  );
}

export default POSInventoryAvailabilityPage;
