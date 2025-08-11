// You can put global before/after hooks here.
// Keep it minimal for smoke tests.
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent Cypress from failing the test on app errors.
  // Flip to `true` if you want uncaught exceptions to fail the run.
  return false;
});
