import { apiFetch } from "./client";

export interface DataSourceVersion {
  name: string;
  version: string;
  url: string | null;
}

export const fetchDataSourceVersions = () => apiFetch<DataSourceVersion[]>("/sources");
