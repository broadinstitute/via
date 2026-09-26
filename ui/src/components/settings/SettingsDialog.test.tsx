import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsDialog from "./SettingsDialog";

/** Answers /api/status with the given body and /api/sources with SOURCES. */
function mockStatus(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url === "/api/sources"
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SOURCES) })
        : Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }),
    ),
  );
}

function openStatusPanel() {
  fireEvent.click(screen.getByRole("button", { name: "System status" }));
}

const SOURCES = [{ name: "gnomAD", version: "v3.1.2", url: "https://gnomad.broadinstitute.org/" }];

const ACCESSIBLE = {
  accessible: true,
  tables: [
    { table: "proj.vat.v1", accessible: true, detail: null },
    { table: "cdr.C2024.cb_criteria", accessible: true, detail: null },
  ],
};

describe("SettingsDialog", () => {
  beforeEach(() => {
    mockStatus(ACCESSIBLE);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens on the data sources panel", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Data sources" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("gnomAD")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/sources");
    expect(fetch).not.toHaveBeenCalledWith("/api/status");
  });

  it("switches to the system status panel and lists every checked table", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(screen.getByRole("button", { name: "System status" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("All tables accessible")).toBeInTheDocument();
    expect(screen.getByText("proj.vat.v1")).toBeInTheDocument();
    expect(screen.getByText("cdr.C2024.cb_criteria")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/status");
  });

  it("marks each unavailable table with its reason", async () => {
    mockStatus({
      accessible: false,
      tables: [
        { table: "proj.vat.v1", accessible: true, detail: null },
        { table: "cdr.C2024.concept_ancestor", accessible: false, detail: "Access Denied" },
      ],
    });
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(await screen.findByText("1 of 2 tables unavailable")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("reports a failed status request", async () => {
    mockStatus({}, false);
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent("status 500");
  });

  it("refreshes on demand", async () => {
    render(<SettingsDialog onClose={vi.fn()} />);
    openStatusPanel();
    await screen.findByText("All tables accessible");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/status")).toHaveLength(2);
    expect(await screen.findByText("All tables accessible")).toBeInTheDocument();
  });

  it("closes from the close button, Escape, and the backdrop", async () => {
    const onClose = vi.fn();
    render(<SettingsDialog onClose={onClose} />);
    await screen.findByText("gnomAD");

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
