import { Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop";
import AppShell from "./components/shell/AppShell";
import DataSourcesPage from "./pages/DataSourcesPage";
import RecentSearchesPage from "./pages/RecentSearchesPage";
import SavedSearchPage from "./pages/SavedSearchPage";
import SavedSearchesPage from "./pages/SavedSearchesPage";
import SearchEntryPage from "./pages/SearchEntryPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import SystemStatusPage from "./pages/SystemStatusPage";
import UsagePage from "./pages/UsagePage";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Every view sits inside the shell: the rail down the left, the view beside it. */}
        <Route element={<AppShell />}>
          <Route path="/" element={<SearchEntryPage />} />
          <Route path="/results" element={<SearchResultsPage />} />
          <Route path="/recent" element={<RecentSearchesPage />} />
          <Route path="/saved" element={<SavedSearchesPage />} />
          <Route path="/saved/:id" element={<SavedSearchPage />} />
          <Route path="/sources" element={<DataSourcesPage />} />
          <Route path="/status" element={<SystemStatusPage />} />
          <Route path="/usage" element={<UsagePage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
