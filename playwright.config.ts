import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',timeout:90000,expect:{timeout:15000},use:{baseURL:'http://localhost:3000',...devices['Desktop Chrome'],channel:'chrome'},webServer:{command:'pnpm dev',url:'http://localhost:3000/',reuseExistingServer:!process.env.CI,timeout:120000},retries:0});
