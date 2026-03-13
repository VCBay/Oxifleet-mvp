import { useLocation } from "react-router-dom";
import POSBillingSettlementControl from "../components/POSBillingSettlementControl";

function POSBillingSettlementPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  return (
    <POSBillingSettlementControl
      initialFocus={params.get("focus") || ""}
      initialInvoiceId={params.get("invoiceId") || ""}
    />
  );
}

export default POSBillingSettlementPage;
