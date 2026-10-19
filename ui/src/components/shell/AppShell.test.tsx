import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updatePreferences } from "../../utils/preferences";
import AppShell, { NARROW_QUERY } from "./AppShell";
import { useShell } from "./ShellContext";

function stubProfile() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ userEmail: "x@example.org" }) })),
  );
}

/** A view that asks for the folded rail while it's mounted, the way Review does. */
function CompactView() {
  const { requestCompactRail, userEmail } = useShell();
  useEffect(() => {
    requestCompactRail(true);
    return () => requestCompactRail(false);
  }, [requestCompactRail]);
  return <p>Signed in as {userEmail}</p>;
}

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<p>Home view</p>} />
          <Route path="/compact" element={<CompactView />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const unfolded = () => screen.queryByRole("button", { name: "Fold the rail" }) !== null;

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the rail beside the view, with the signed-in user fetched once", async () => {
    stubProfile();
    renderShell("/");
    expect(screen.getByText("Home view")).toBeInTheDocument();
    expect(unfolded()).toBe(true);
    expect(await screen.findByText("x@example.org")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/profile")).toHaveLength(1);
  });

  it("folds the rail when the user chose to, and lets them unfold it", () => {
    stubProfile();
    updatePreferences({ railCollapsed: true });
    renderShell("/");
    expect(unfolded()).toBe(false);
    expect(screen.getByRole("button", { name: "Unfold the rail" })).toBeInTheDocument();
  });

  it("folds the rail while a view asks for it, with no unfold, and shares the user with the view", async () => {
    stubProfile();
    renderShell("/compact");
    expect(unfolded()).toBe(false);
    expect(screen.queryByRole("button", { name: "Unfold the rail" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Signed in as x@example.org")).toBeInTheDocument());
  });

  it("folds the rail in a narrow window, with no unfold", () => {
    stubProfile();
    const matchMedia = window.matchMedia;
    window.matchMedia = (query: string) => ({ ...matchMedia(query), matches: query === NARROW_QUERY });
    try {
      updatePreferences({ railCollapsed: true });
      renderShell("/");
      expect(unfolded()).toBe(false);
      expect(screen.queryByRole("button", { name: "Unfold the rail" })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it("logs a profile that can't be fetched and carries on", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 500, statusText: "Server Error", text: () => Promise.resolve("") })));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderShell("/");
    await waitFor(() => expect(error).toHaveBeenCalledWith("Failed to load profile", expect.anything()));
    expect(screen.getByText("Home view")).toBeInTheDocument();
    error.mockRestore();
  });
});
