import { useOutletContext } from "react-router-dom";
import POSCommunicationControl from "../components/POSCommunicationControl";

function POSCommunicationPage() {
  const { session } = useOutletContext();
  return <POSCommunicationControl session={session} />;
}

export default POSCommunicationPage;
