// cypress/e2e/smoke.cy.js
describe('SOTF Smoke', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
  });

  const rail = () => cy.get('[data-testid="rail-context"]');
  const chat = () => cy.get('[data-testid="chat-input"]');

  it('Teachers → Dashboard: context rail + chat placeholder', () => {
    cy.visit('/#/teachers/dashboard');
    rail().should('contain.text', 'teachers').and('contain.text', 'dashboard');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/class|grading|suggest/);
    });
  });

  it('Students → Dashboard: CTA present + context-aware rail', () => {
    cy.visit('/#/students/dashboard');
    rail().should('contain.text', 'students').and('contain.text', 'dashboard');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/progress|next step/);
    });
    cy.contains(/Continue:\s*Fractions microplan/i).should('be.visible');
  });

  it('Students → Playback: stepper, AI Tips, tasks', () => {
    cy.visit('/#/students/play/plan_demo_001');

    rail().should('contain.text', 'students').and('contain.text', 'playback');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/step|plan/);
    });

    cy.contains(/Student · Playback/i).should('be.visible');
    cy.contains('Number Line Animation').should('be.visible');
    cy.contains('AI Tips').should('be.visible');

    const clickPrimary = () =>
      cy.contains(/Mark done → Next|Next/i).first().click({ force: true });

    clickPrimary(); clickPrimary(); clickPrimary();
    cy.contains(/Mark done → Next|Next/i).then(($btn) => {
      if (!$btn.is(':disabled')) cy.wrap($btn).click({ force: true });
    });
    cy.contains('100%').should('be.visible');

    const alerts = [];
    cy.on('window:alert', (msg) => alerts.push(msg));
    cy.contains('Ask for help').click().then(() => {
      expect(alerts.some(a => /help request sent/i.test(a))).to.be.true;
    });
    cy.contains(/Send update to teacher/i).click().then(() => {
      expect(alerts.some(a => /update sent to teacher/i.test(a))).to.be.true;
    });
  });

  it('Teachers → Lesson Planning: context-aware rail + chat placeholder', () => {
    cy.visit('/#/teachers/lesson-planning');
    rail().should('contain.text', 'teachers').and('contain.text', 'lesson-planning');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/refine|generate blocks/);
    });
    // sr-only title: assert existence (not visibility)
    cy.get('[data-testid="page-title"]').should('exist').and('contain.text', 'Lesson Planning');
  });

  it('Admin → Overview & Parent → Portal: context + placeholders', () => {
    cy.visit('/#/admin/overview');
    rail().should('contain.text', 'admin').and('contain.text', 'overview');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/kpi|trend/);
    });

    cy.visit('/#/parent/portal');
    rail().should('contain.text', 'parent').and('contain.text', 'portal');
    chat().invoke('attr', 'placeholder').then((ph) => {
      expect(ph.toLowerCase()).to.match(/your child|updates/);
    });
  });
});

