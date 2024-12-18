import { html, render, page } from "../lib.js";
import { createSubmitHandler, updateNav } from "../util.js";
import { login, register, loadSetups, addSetup, loadSetupDetails, logout } from "../data/user.js";
import { loginTemplate, registerTemplate, homeTemplate, setupsTemplate, noSetupsTemplate, addSetupTemplate, setupDetailsTemplate } from './templates.js';

// Login view function
export function loginView() {
  render(loginTemplate(createSubmitHandler(onLogin)), document.querySelector('main'));
}

// Register view function
export function registerView() {
  render(registerTemplate(createSubmitHandler(onRegister)), document.querySelector('main'));
}

// Add Setup view function
export function addSetupView() {
  render(addSetupTemplate(createSubmitHandler(onAddSetup)), document.querySelector('main'));
}

// Home view function
export function homeView() {
  render(homeTemplate(), document.querySelector('main'));
}

// Setup Showcase view function
export async function setupsView() {
  try {
    const setups = await loadSetups();
    if (setups.length === 0) {
      render(noSetupsTemplate(), document.querySelector('main'));
    } else {
      render(setupsTemplate(setups), document.querySelector('main'));
    }
  } catch (error) {
    alert('Error loading setups!');
  }
}

// Setup Details view function
export async function setupDetailsView(ctx) {
  try {
    const id = ctx.params.id;
    const setup = await loadSetupDetails(id);
    render(setupDetailsTemplate(setup), document.querySelector('main'));
  } catch (error) {
    alert('Error loading setup details!');
  }
}

// Submit handler for Login
async function onLogin({ email, password }, form) {
  if (!email || !password) {
    return alert('All fields are required!');
  }
  try {
    await login(email, password);
    updateNav();
    page.redirect('/');
  } catch (error) {
    alert('Login failed! Please check your credentials.');
  }
}

// Submit handler for Register
async function onRegister({ email, password, repeatPassword }, form) {
  if (!email || !password || password !== repeatPassword) {
    return alert('Passwords must match!');
  }
  try {
    await register(email, password);
    updateNav();
    page.redirect('/');
  } catch (error) {
    alert('Registration failed! Please try again.');
  }
}

// Submit handler for Add Setup
async function onAddSetup({ name, imageUrl, description, partsUsed }) {
  if (!name || !imageUrl || !description || !partsUsed) {
    return alert('All fields are required!');
  }
  try {
    await addSetup({ name, imageUrl, description, partsUsed });
    page.redirect('/setups');
  } catch (error) {
    alert('Failed to add setup. Please try again.');
  }
}

// Logout function
export async function onLogout() {
  await logout();
  updateNav();
  page.redirect('/');
}

// Routing setup
page('/', homeView);
page('/login', loginView);
page('/register', registerView);
page('/setups', setupsView);
page('/add-setup', addSetupView);
page('/setup-details/:id', setupDetailsView);
page('/logout', onLogout);  // Added logout route

page.start();
