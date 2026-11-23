// Where the app is mounted. At the root of its own host (Workbench, local dev) that's "". In
// community Terra, Leonardo serves the runtime under /proxy/{project}/{runtime}/rstudio/ (a GCE
// runtime that Leonardo treats as RStudio) and strips that prefix before the request reaches the
// container, so the browser sees the prefix but the backend never does.
//
// Everything that builds an absolute URL (API calls, public assets, the router's basename) goes
// through here. The same pattern is in index.html, which sets <base href> from it so Vite's relative
// asset URLs resolve; keep the two in sync.
const LEONARDO_RUNTIME_PREFIX = /^(.*\/proxy\/[^/]+\/[^/]+\/rstudio)(?:\/|$)/;

/** The mount path with no trailing slash: "" at the host root. */
export function basePath(pathname: string = window.location.pathname): string {
  return LEONARDO_RUNTIME_PREFIX.exec(pathname)?.[1] ?? "";
}

/** A root-relative URL for a file in ui/public (e.g. "favicon.svg"), honouring the mount path. */
export function publicUrl(file: string): string {
  return `${basePath()}/${file}`;
}
