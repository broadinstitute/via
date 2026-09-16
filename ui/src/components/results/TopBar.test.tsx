import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TopBar from "./TopBar";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderTopBar(props: React.ComponentProps<typeof TopBar>) {
  return render(
    <MemoryRouter>
      <TopBar {...props} />
    </MemoryRouter>,
  );
}

describe("TopBar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the user email even without search controls", () => {
    renderTopBar({ userEmail: "user@example.org" });

    expect(screen.getByText("user@example.org")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to search" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modify search" })).not.toBeInTheDocument();
  });

  it("renders the loaded search summary when modify controls are enabled", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 17,
      hpoTerm: "Seizure",
      onModifySearch: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "Back to search" })).toBeInTheDocument();
    expect(screen.getByText("17 entered")).toBeInTheDocument();
    expect(screen.getByText("Seizure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modify search" })).toBeEnabled();
  });

  it("renders the fallback phenotype label when no HPO term is set", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 4,
      hpoTerm: "",
      onModifySearch: vi.fn(),
    });

    expect(screen.getByText("None entered")).toBeInTheDocument();
  });

  it("renders loading skeletons and disables modify while loading", () => {
    renderTopBar({
      userEmail: "user@example.org",
      loading: true,
      onModifySearch: vi.fn(),
    });

    expect(screen.queryByText(/entered$/)).not.toBeInTheDocument();
    expect(screen.queryByText("None entered")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-skeleton-pulse")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Modify search" })).toBeDisabled();
  });

  it("navigates back to the search page from the back button", () => {
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 9,
      hpoTerm: "Ataxia",
      onModifySearch: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to search" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("calls onModifySearch when the modify button is pressed", () => {
    const onModifySearch = vi.fn();
    renderTopBar({
      userEmail: "user@example.org",
      variantsEnteredCount: 9,
      hpoTerm: "Ataxia",
      onModifySearch,
    });

    fireEvent.click(screen.getByRole("button", { name: "Modify search" }));

    expect(onModifySearch).toHaveBeenCalledTimes(1);
  });
});
