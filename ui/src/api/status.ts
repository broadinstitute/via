export interface TableStatus {
  /** As "project.dataset.table". */
  table: string;
  accessible: boolean;
  /** Why the check failed; null when accessible. */
  detail?: string | null;
}

export interface BigQueryStatus {
  /** True when every table is accessible. */
  accessible: boolean;
  tables: TableStatus[];
}

export async function fetchStatus(): Promise<BigQueryStatus> {
  const response = await fetch("/api/status");
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<BigQueryStatus>;
}
