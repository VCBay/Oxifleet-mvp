import { useOutletContext } from "react-router-dom";
import POSApprovalWorkflowControl from "../components/POSApprovalWorkflowControl";

function POSApprovalWorkflowPage() {
  const { session, vehicles } = useOutletContext();
  return <POSApprovalWorkflowControl session={session} vehicles={vehicles} />;
}

export default POSApprovalWorkflowPage;
