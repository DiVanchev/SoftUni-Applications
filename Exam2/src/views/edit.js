import { updateDrone, getDroneById  } from '../data/drones.js'
import { html, render, page } from '../lib.js';
import { createSubmitHandler } from '../util.js';

const editTemplate = (data, onEdit) => html`
<section id="edit">
        <div class="form">
          <img class="border" src="../images/banner.webp" alt="banner" />
          <h2>Edit Setup</h2>
          <form @submit=${onEdit} class="edit-form">
            <input type="text" name="setup-name" id="edit-setup-name" placeholder="Setup Name" .value = ${data.name} />
            <input type="text" name="image-url" id="edit-image-url" placeholder="Image URL".value = ${data.imageUrl} />
            <textarea id="edit-description" name="description" placeholder="Description" rows="2" cols="10".value = ${data.description}></textarea>
            <textarea id="edit-parts-used" name="parts-used" placeholder="Parts" rows="2" cols="10".${data.parts}></textarea>
            <button type="submit">Edit</button>
          </form>
        </div>
      </section>
      
`;

export async function editView(ctx) {
    const id = ctx.params.id;

    const data = await getDroneById(id);

    render(editTemplate(data, createSubmitHandler(onEdit)));

    async function onEdit({ name, imageUrl, description, parts }) {
        if (!imageUrl || !description || !parts) {
            return alert('All fields are required!')
        }

        await updateDrone(id, {name, imageUrl, description, parts});

        page.redirect('/dashboard/' + id);
    }
}