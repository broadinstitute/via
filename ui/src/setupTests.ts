import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom doesn't implement scrollTo; ScrollToTop calls it on every route mount.
window.scrollTo = vi.fn();
