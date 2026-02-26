import { useOutletContext } from "react-router-dom";
import POSProfileSettingsControl from "../components/POSProfileSettingsControl";

function POSProfileSettingsPage() {
  const { session } = useOutletContext();
  return <POSProfileSettingsControl session={session} />;
}

export default POSProfileSettingsPage;
