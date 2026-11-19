// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const CI = !!process.env.CI;
// Lokalt kan en befintlig Chromium användas: PW_CHROMIUM=/sökväg/till/chrome npx playwright test --project="Telefon (Chromium)"
const egenChromium = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {};

// iPhone Pro Max i stående läge
const PRO_MAX = { width: 430, height: 932 };

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'rapport', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/',
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'iPhone (WebKit)', use: { ...devices['iPhone 15 Pro Max'], viewport: PRO_MAX } },
    { name: 'Telefon (Chromium)', use: { ...devices['Pixel 7'], viewport: PRO_MAX, ...egenChromium } }
  ],
  webServer: {
    command: 'npx http-server . -p 4174 -a 127.0.0.1 -c-1 --silent',
    url: 'http://127.0.0.1:4174/',
    reuseExistingServer: !CI,
    timeout: 30000
  }
});
