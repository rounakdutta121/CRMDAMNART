import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("archival design system", () => {
  it("defines core CSS design tokens", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("--background:");
    expect(css).toContain("--accent:");
    expect(css).toContain("--surface-ink:");
    expect(css).toContain(".ledger-table");
    expect(css).toContain(".archive-grain");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("uses editorial font variables in root layout", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("Source_Serif_4");
    expect(layout).toContain("IBM_Plex_Sans");
    expect(layout).toContain("IBM_Plex_Mono");
    expect(layout).toContain("--font-archive-serif");
  });

  it("groups sidebar navigation into archival sections", () => {
    const sidebar = readFileSync(
      join(process.cwd(), "src/components/layout/app-shell.tsx"),
      "utf8"
    );
    expect(sidebar).toContain("Command");
    expect(sidebar).toContain("Records");
    expect(sidebar).toContain("Sources");
    expect(sidebar).toContain("Administration");
    expect(sidebar).toContain("bg-[#faf8f4]");
  });
});
