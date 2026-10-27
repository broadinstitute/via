import SystemStatusPanel from "../components/settings/SystemStatusPanel";
import SettingsPage from "./SettingsPage";

export default function SystemStatusPage() {
  return (
    <SettingsPage title="System status">
      <SystemStatusPanel />
    </SettingsPage>
  );
}
