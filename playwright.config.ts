import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'upload-ui.spec.ts',use:{baseURL:'http://127.0.0.1:3105',headless:true,channel:'chrome'},webServer:{command:'npx next dev tests/upload-fixture --webpack --hostname 127.0.0.1 --port 3105',url:'http://127.0.0.1:3105',reuseExistingServer:!process.env.CI}});
