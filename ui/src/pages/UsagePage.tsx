import UsagePanel from "../components/settings/UsagePanel";
import WorkspacePage from "./WorkspacePage";

export default function UsagePage() {
  return (
    <WorkspacePage
      title="Usage"
      lede="The BigQuery work this session has done, from the backend's own tally. Reading it runs no query."
    >
      <UsagePanel />
    </WorkspacePage>
  );
}
