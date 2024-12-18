import { html, render, page } from "../lib.js";
import { createSubmitHandler, updateNav } from "../util.js";
import { login } from "../data/user.js";

const loginTemplate = (onLogin) => html`
<section id="login">
        <div class="form">
          <img class="border" src="../images/banner.webp" alt="banner" />
          <h2>Login</h2>
          <form @submit=${onLogin} class="login-form">
            <input type="text" name="email" id="email" placeholder="email" />
            <input type="password" name="password" id="password" placeholder="password" />
            <button type="submit">login</button>
            <p class="message">
              Not registered? <a href="#">Create an account</a>
            </p>
          </form>
        </div>
      </section>
`;

export function loginView() {
    render(loginTemplate(createSubmitHandler(onLogin)));
}

async function onLogin({ email, password }, form) {
    if(!email || !password) {
        return alert('All fields required!')
    }
    await login(email, password);

    updateNav();

    page.redirect('/');
}