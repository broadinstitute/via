import DataSourcesPanel from "../components/settings/DataSourcesPanel";
import WorkspacePage from "./WorkspacePage";

export default function DataSourcesPage() {
  return (
    <WorkspacePage title="Data sources" lede="The dataset release and the annotation versions every answer is read from.">
      <DataSourcesPanel />
    </WorkspacePage>
  );
}
