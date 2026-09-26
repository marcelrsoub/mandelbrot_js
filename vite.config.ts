export default {
  base: "./",
  // Avoid walking above the project for an inherited PostCSS config.
  css: { postcss: { plugins: [] } },
};
