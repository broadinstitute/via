import { apiFetch } from "./client";

/** This VIA instance's BigQuery usage since it started; see /api/usage. */
export interface QueryUsage {
  queries: number;
  /** Queries BigQuery answered from its cache, which bill nothing. */
  cacheHits: number;
  bytesProcessed: number;
  /** What on-demand pricing charges for: rounded up to 10 MB a query, zero for a cache hit. */
  bytesBilled: number;
  slotMilliseconds: number;
  /** bytesBilled at on-demand pricing. An estimate; a reservation bills by slot time instead. */
  estimatedCostUsd: number;
  /** When the backend started counting, as an ISO date-time. */
  since: string;
}

export const fetchQueryUsage = () => apiFetch<QueryUsage>("/usage");
