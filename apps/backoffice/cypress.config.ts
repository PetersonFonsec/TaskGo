import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4300',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts'
  },
  env: {
    apiUrl: 'http://localhost:3000/admin'
  },
  video: false
});
