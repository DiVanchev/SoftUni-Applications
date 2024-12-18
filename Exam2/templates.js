import { html } from "../lib.js";

// Template for the Login page
export const loginTemplate = (onLogin) => html`
  <section id="login">
    <div class="form">
      <h2>Login</h2>
      <form @submit=${onLogin} class="login-form">
        <input type="text" name="email" id="email" placeholder="email" />
        <input type="password" name="password" id="password" placeholder="password" />
        <button type="submit">login</button>
        <p class="message">
          Not registered? <a href="/register">Create an account</a>
        </p>
      </form>
    </div>
  </section>
`;

// Template for the Register page
export const registerTemplate = (onRegister) => html`
  <section id="register">
    <div class="form">
      <h2>Register</h2>
      <form @submit=${onRegister} class="register-form">
        <input type="text" name="email" id="register-email" placeholder="email" />
        <input type="password" name="password" id="register-password" placeholder="password" />
        <input type="password" name="re-password" id="repeat-password" placeholder="repeat password" />
        <button type="submit">Register</button>
        <p class="message">
          Already registered? <a href="/login">Login</a>
        </p>
      </form>
    </div>
  </section>
`;

// Template for the Home page
export const homeTemplate = () => html`
  <section id="home">
    <a href="#"><img id="home-img" src="./images/show.webp" alt="home-img" /></a>
    <h1>
      Welcome to Setup Legends, discover, share, and be inspired by epic gaming PC setups from around the world.
      Whether you're showcasing your ultimate battlestation or seeking ideas to elevate your own, Setup Legends is
      the hub where creativity meets performance. Join the community and let your setup shine!
    </h1>
  </section>
`;

// Template for Setup Showcase
export const setupsTemplate = (setups) => html`
  <h2>Setup Showcase</h2>
  <section id="setups">
    ${setups.map(setup => html`
      <div class="setup" id="setup-${setup._id}">
        <img src="${setup.imageUrl}" alt="${setup.name}" />
        <div class="setup-info">
          <h3 class="setup-name">${setup.name}</h3>
          <p class="description">${setup.description}</p>
          <a class="details-btn" href="/setup-details/${setup._id}">Details</a>
        </div>
      </div>
    `)}
  </section>
`;

// Template for "No Setups" message
export const noSetupsTemplate = () => html`
  <h2 id="no-setup">No Setups Added.</h2>
`;

// Template for Add Setup page
export const addSetupTemplate = (onAddSetup) => html`
  <section id="create">
    <div class="form">
      <h2>Add Setup</h2>
      <form @submit=${onAddSetup} class="create-form">
        <input type="text" name="setup-name" id="create-setup-name" placeholder="Setup Name" />
        <input type="text" name="image-url" id="create-image-url" placeholder="Image URL" />
        <textarea id="create-description" name="description" placeholder="Description" rows="2" cols="10"></textarea>
        <textarea id="create-parts-used" name="parts-used" placeholder="Parts" rows="2" cols="10"></textarea>
        <button type="submit">Add setup</button>
      </form>
    </div>
  </section>
`;

// Template for Setup Details page
export const setupDetailsTemplate = (setup) => html`
  <section id="details">
    <div id="details-wrapper">
      <img id="details-img" src="${setup.imageUrl}" alt="${setup.name}" />
      <div>
        <p id="details-setup-name">${setup.name}</p>
        <p id="setup-description">${setup.description}</p>
        <p id="details-parts">${setup.parts}</p>
      </div>
    </div>
  </section>
`;
