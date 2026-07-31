import { Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import SearchEntryPage from "./pages/SearchEntryPage";
import SearchResultsPage from "./pages/SearchResultsPage";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<SearchEntryPage />} />
        <Route path="/results" element={<SearchResultsPage />} />
      </Routes>
    </>
  );
}

export default App;
