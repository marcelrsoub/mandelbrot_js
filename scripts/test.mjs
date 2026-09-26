import { startVitest } from "vitest/node";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const filters = args.filter((arg) => arg !== "--watch" && !arg.startsWith("--"));

await startVitest(
  "test",
  filters,
  { run: !watch, watch },
  {
    configFile: false,
    css: { postcss: { plugins: [] } },
  },
);
