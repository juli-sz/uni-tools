// @ts-check
const { defineConfig } = require("@playwright/test");
const PUERTO = process.env.PUERTO || 8780;

module.exports = defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    viewport: { width: 1400, height: 850 },
    trace: "retain-on-failure",
  },
  // En Chromium y en Firefox: hubo errores que sólo aparecían en Firefox (el lienzo trabado).
  // «npx playwright test --project=chromium» corre uno solo.
  projects: [
    { name: "chromium", use: { browserName: "chromium",
      // CHROMIUM_PATH sirve para usar un Chromium ya instalado (útil sin internet).
      launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "node servidor.js",
    url: `http://localhost:${PUERTO}/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { PUERTO: String(PUERTO) },
  },
});
