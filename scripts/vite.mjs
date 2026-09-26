import { build, createServer, preview } from "vite";

const [command, ...args] = process.argv.slice(2);
const viteConfig = {
  configFile: false,
  base: "./",
  css: { postcss: { plugins: [] } },
};

const optionValue = (name) => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const serverOptions = {
  host: optionValue("--host") || args.includes("--host") || undefined,
  port: Number(optionValue("--port")) || undefined,
  strictPort: args.includes("--strictPort"),
  open: args.includes("--open"),
};

switch (command) {
  case "dev": {
    const server = await createServer({ ...viteConfig, server: serverOptions });
    await server.listen();
    server.printUrls();
    break;
  }
  case "build":
    await build(viteConfig);
    break;
  case "preview": {
    const server = await preview({ ...viteConfig, preview: serverOptions });
    server.printUrls();
    break;
  }
  default:
    throw new Error(`Unknown Vite command: ${command ?? "(missing)"}`);
}
