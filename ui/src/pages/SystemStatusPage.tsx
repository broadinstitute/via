import SystemStatusPanel from "../components/settings/SystemStatusPanel";
import WorkspacePage from "./WorkspacePage";

export default function SystemStatusPage() {
  return (
    <WorkspacePage title="System status" lede="Whether each BigQuery table VIA reads can be reached from this workspace.">
      <SystemStatusPanel />
    </WorkspacePage>
  );
}
