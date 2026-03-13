import { useLocation, useOutletContext } from "react-router-dom";
import POSApprovalWorkflowControl from "../components/POSApprovalWorkflowControl";

function POSApprovalWorkflowPage() {
  const location = useLocation();
  const { session, vehicles } = useOutletContext();
  const params = new URLSearchParams(location.search);

  return (
    <POSApprovalWorkflowControl
      initialApprovalRequestId={params.get("requestId") || ""}
      initialFocus={params.get("focus") || ""}
      initialPosOrderId={params.get("posOrderId") || ""}
      initialQueueOrderId={params.get("queueOrderId") || ""}
      session={session}
      vehicles={vehicles}
    />
  );
}

export default POSApprovalWorkflowPage;
