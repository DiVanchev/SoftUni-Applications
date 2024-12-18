import { createSetup } from "../data/setups.js";
import { html, render, page } from "../lib.js";
import { createSubmitHandler } from "../util.js";

const createTemplate = (onCreate) => html`
      <section id="create">
        <div class="form">
          <img class="border" src="../images/banner.webp" alt="banner" />
          <h2>Add Setup</h2>
          <form @submit=${onCreate} class="create-form">
            <input type="text" name="setup-name" id="create-setup-name" placeholder="Setup Name" />
            <input type="text" name="image-url" id="create-image-url" placeholder="Image URL" />
            <textarea id="create-description" name="description" placeholder="Description" rows="2" cols="10"></textarea>
            <textarea id="create-parts-used" name="parts-used" placeholder="Parts" rows="2" cols="10"></textarea>
            <button type="submit">Add setup</button>
          </form>
        </div>
      </section>
`;

export function createView() {
    render(createTemplate(createSubmitHandler(onCreate)));
}

async function onCreate({ name, imageUrl, description, parts }) {
    if (!imageUrl || !description || !parts) {
        return alert('All fields are required!');
    }

    await createSetup({ name,
        imageUrl, 
        description,
        parts });

    page.redirect('/dashboard');
}