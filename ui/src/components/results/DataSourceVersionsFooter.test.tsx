import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataSourceVersionsFooter from "./DataSourceVersionsFooter";

const { fetchDataSourceVersions } = vi.hoisted(() => ({
  fetchDataSourceVersions: vi.fn(),
}));

vi.mock("../../api/dataSourceVersions", () => ({
  fetchDataSourceVersions,
}));

describe("DataSourceVersionsFooter", () => {
  beforeEach(() => {
    fetchDataSourceVersions.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing before source versions load", () => {
    fetchDataSourceVersions.mockReturnValue(new Promise(() => {}));

    const { container } = render(<DataSourceVersionsFooter />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders loaded source versions, links, app version, and logo", async () => {
    fetchDataSourceVersions.mockResolvedValue([
      { name: "All of Us", version: "v8", url: "https://allofus.nih.gov" },
      { name: "ClinVar", version: "2024-02", url: "https://www.ncbi.nlm.nih.gov/clinvar/" },
      { name: "gnomAD", version: "3.1.2", url: null },
    ]);

    render(<DataSourceVersionsFooter />);

    expect(await screen.findByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("All of Us")).toBeInTheDocument();
    expect(screen.getByText("v8")).toBeInTheDocument();
    expect(screen.getByText("ClinVar")).toBeInTheDocument();
    expect(screen.getByText("2024-02")).toBeInTheDocument();
    expect(screen.getByText("gnomAD")).toBeInTheDocument();
    expect(screen.getByText("3.1.2")).toBeInTheDocument();
    expect(screen.getByTitle("Open All of Us")).toHaveAttribute("href", "https://allofus.nih.gov");
    expect(screen.getByTitle("Open ClinVar")).toHaveAttribute("href", "https://www.ncbi.nlm.nih.gov/clinvar/");
    expect(screen.getByText("VIA v0.0.1")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Broad Institute" })).toHaveAttribute("src", "/broad-logo.svg");
  });

  it("omits the outbound link for sources without a URL", async () => {
    fetchDataSourceVersions.mockResolvedValue([{ name: "gnomAD", version: "3.1.2", url: null }]);

    render(<DataSourceVersionsFooter />);

    await screen.findByText("gnomAD");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("logs and stays empty when version loading fails", async () => {
    const error = new Error("boom");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchDataSourceVersions.mockRejectedValue(error);

    const { container } = render(<DataSourceVersionsFooter />);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("Failed to load data source versions", error),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
