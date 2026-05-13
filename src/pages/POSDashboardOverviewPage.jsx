import { useOutletContext } from "react-router-dom";
import POSDashboardOverview from "../components/POSDashboardOverview";

function POSDashboardOverviewPage() {
  const {
    requestSummary,
    monthlyComparison,
    plateQuery,
    setPlateQuery,
    matchedVehicles,
    selectedVehicle,
    assignedDriver,
    fleetDetails,
    primaryPolicy,
    spareSummary,
    spareParts,
    operationDetails,
  } = useOutletContext();

  return (
    <POSDashboardOverview
      assignedDriver={assignedDriver}
      fleetDetails={fleetDetails}
      matchedVehicles={matchedVehicles}
      monthlyComparison={monthlyComparison}
      plateQuery={plateQuery}
      primaryPolicy={primaryPolicy}
      requestSummary={requestSummary}
      selectedVehicle={selectedVehicle}
      setPlateQuery={setPlateQuery}
      spareParts={spareParts}
      spareSummary={spareSummary}
      operationDetails={operationDetails}
    />
  );
}

export default POSDashboardOverviewPage;
