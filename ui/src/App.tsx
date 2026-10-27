import { Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop";
import SearchEntryPage from "./pages/SearchEntryPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import SystemStatusPage from "./pages/SystemStatusPage";
import UsagePage from "./pages/UsagePage";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<SearchEntryPage />} />
        <Route path="/results" element={<SearchResultsPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/system-status" element={<SystemStatusPage />} />
        <Route path="/usage" element={<UsagePage />} />
      </Routes>
    </>
  );
}

export default App;
