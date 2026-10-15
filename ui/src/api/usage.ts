import { apiFetch } from "./client";

/** One BigQuery job, as the backend names its query shapes ("VAT lookup", "Cohort count"). */
export interface QueryJob {
  name: string;
  at: string;
  /** Answered from BigQuery's result cache, which bills nothing. */
  cacheHit: boolean;
  bytesProcessed: number;
  bytesBilled: number;
  slotMilliseconds: number;
}

/** One search this session and the BigQuery jobs it ran. */
export interface SearchUsage {
  /** Counts up from 1 within the session. */
  id: number;
  at: string;
  variants: string[];
  /** The picked condition's name; null when none was picked or it wasn't found. */
  phenotype: string | null;
  /** In the order they ran. */
  queries: QueryJob[];
  cacheHits: number;
  bytesProcessed: number;
  bytesBilled: number;
  estimatedCostUsd: number;
}

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
  /**
   * The last 20 searches, newest first. Only /api/search runs count; the condition type-ahead's
   * queries are in the totals but belong to no search.
   */
  searches: SearchUsage[];
}

export const fetchQueryUsage = () => apiFetch<QueryUsage>("/usage");
