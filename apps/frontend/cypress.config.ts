import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    // Uma nova tentativa só no `cypress run` (CI); no `open`, a falha aparece na hora.
    retries: { runMode: 1, openMode: 0 },
  },
  env: {
    url: 'http://localhost:3000',
  },
  video: false,
});
