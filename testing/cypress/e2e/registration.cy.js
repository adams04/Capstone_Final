describe('Registration Page Tests', () => {
  beforeEach(() => {
    cy.visit('/signup');
  });

  it('should load the registration page successfully', () => {
    cy.get('.login-title').should('contain', 'Sign Up');
    cy.get('form.login-form').should('exist');
  });

  it('should display all required form fields', () => {
    cy.get('input[name="name"]').should('exist');
    cy.get('input[name="email"]').should('exist');
    cy.get('select[name="profession"]').should('exist');
    cy.get('input[name="password"]').should('exist');
    cy.get('input[name="confirmPassword"]').should('exist');
    cy.get('button[type="submit"]').should('contain', 'Create Account');
  });

  it('should show all profession options', () => {
    const expectedProfessions = [
      'Developer',
      'Designer',
      'Project Manager',
      'QA Engineer',
      'DevOps'
    ];

    cy.get('select[name="profession"] option').should('have.length', expectedProfessions.length);
    expectedProfessions.forEach(profession => {
      cy.get('select[name="profession"]').contains(profession);
    });
  });

  it('should show error when passwords do not match', () => {
    cy.get('input[name="name"]').type('Test User');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('differentpassword');
    cy.get('button[type="submit"]').click();

    cy.get('.error-message').should('contain', 'Passwords do not match');
  });

  it('should show error when required fields are empty', () => {
    cy.get('button[type="submit"]').click();
    cy.get('input[name="name"]').then(($input) => {
      expect($input[0].validationMessage).to.exist;
    });
    cy.get('input[name="email"]').then(($input) => {
      expect($input[0].validationMessage).to.exist;
    });
  });

  it('should validate email format', () => {
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').then(($input) => {
      expect($input[0].validationMessage).to.contain('email');
    });
  });


  it('should have a link to the login page', () => {
    cy.get('.signup-link').should('contain', 'Already have an account?');
    cy.get('.signup-link-text').should('have.attr', 'href', '/login');
  });
});