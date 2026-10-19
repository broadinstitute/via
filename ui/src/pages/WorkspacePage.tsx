import type { CSSProperties, ReactNode } from "react";
import * as Style from "../libs/style";
import TopBar from "../components/shell/TopBar";

const styles = {
  main: {
    padding: "24px 28px 48px",
  },
  panel: {
    ...Style.elements.panel,
    maxWidth: 800,
    padding: "16px 20px 20px",
    boxShadow: Style.shadows.panel,
  },
} as const satisfies Record<string, CSSProperties>;

interface WorkspacePageProps {
  title: string;
  lede: ReactNode;
  children: ReactNode;
}

/** The frame for the rail's Workspace destinations: a title bar over one panel of facts. */
export default function WorkspacePage({ title, lede, children }: WorkspacePageProps) {
  return (
    <>
      <TopBar title={title} lede={lede} />
      <main style={styles.main}>
        <section style={styles.panel} aria-label={title}>
          {children}
        </section>
      </main>
    </>
  );
}
