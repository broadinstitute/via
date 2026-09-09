export interface DataSourceVersion {
  name: string;
  version: string;
  url: string | null;
}

export async function fetchDataSourceVersions(): Promise<DataSourceVersion[]> {
  const response = await fetch("/api/sources");
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<DataSourceVersion[]>;
}
