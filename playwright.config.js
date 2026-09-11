import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', fullyParallel:false, workers:1, timeout:40000,
  reporter:[['list']],
  use:{ baseURL:'http://127.0.0.1:4175/gastos-en-pareja/', trace:'retain-on-failure', screenshot:'only-on-failure' },
  projects:[
    { name:'android-chromium', use:{ ...devices['Pixel 7'] } },
    { name:'iphone-webkit', use:{ ...devices['iPhone 13'] } }
  ],
  webServer:{ command:'node scripts/serve.mjs', port:4175, reuseExistingServer:false, env:{ USE_EMULATORS:'1', PORT:'4175' } }
});
