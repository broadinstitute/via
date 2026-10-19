import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { USAGE_REFRESH_MS, useUsageMeter } from "./useUsageMeter";

const USAGE = { queries: 1, cacheHits: 0, bytesProcessed: 10, bytesBilled: 20, slotMilliseconds: 0, estimatedCostUsd: 0.5, since: new Date().toISOString(), searches: [] };

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const down = () => Promise.resolve({ ok: false, status: 503, statusText: "Service Unavailable", text: () => Promise.resolve("") });

describe("useUsageMeter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("stays off, without reading, until enabled", async () => {
    vi.stubGlobal("fetch", vi.fn(() => ok(USAGE)));
    const { result, rerender } = renderHook(({ on }) => useUsageMeter(on, 0), { initialProps: { on: false } });
    expect(result.current).toBeNull();
    expect(fetch).not.toHaveBeenCalled();

    rerender({ on: true });
    await waitFor(() => expect(result.current?.bytesProcessed).toBe(10));

    rerender({ on: false });
    expect(result.current).toBeNull();
  });

  it("goes blank when a read fails, and keeps only the newest reply", async () => {
    let failing = false;
    vi.stubGlobal("fetch", vi.fn(() => (failing ? down() : ok(USAGE))));
    const { result, rerender } = renderHook(({ key }) => useUsageMeter(true, key), { initialProps: { key: 0 } });
    await waitFor(() => expect(result.current).not.toBeNull());

    failing = true;
    rerender({ key: 1 });
    await waitFor(() => expect(result.current).toBeNull());
  });

  it("re-reads every minute while enabled, and stops when disabled", async () => {
    vi.stubGlobal("fetch", vi.fn(() => ok(USAGE)));
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { rerender } = renderHook(({ on }) => useUsageMeter(on, 0), { initialProps: { on: true } });
    expect(fetch).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(USAGE_REFRESH_MS));
    expect(fetch).toHaveBeenCalledTimes(2);

    rerender({ on: false });
    act(() => vi.advanceTimersByTime(USAGE_REFRESH_MS * 2));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
