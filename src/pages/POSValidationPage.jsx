import { useOutletContext } from "react-router-dom";
import POSValidationControl from "../components/POSValidationControl";

function POSValidationPage() {
  const { vehicles, selectedVehicle, primaryPolicy } = useOutletContext();
  return (
    <POSValidationControl
      primaryPolicy={primaryPolicy}
      selectedVehicle={selectedVehicle}
      vehicles={vehicles}
    />
  );
}

export default POSValidationPage;
