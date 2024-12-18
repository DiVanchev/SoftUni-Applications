import { updateDrone, getDroneById  } from '../data/drones.js'
import { html, render, page } from '../lib.js';
import { createSubmitHandler } from '../util.js';

const editTemplate = (data, onEdit) => html`
<section id="edit">
        <div class="form form-item">
          <h2>Edit Offer</h2>
          <form @submit=${onEdit} class="edit-form">
            <input type="text" name="model" id="model" placeholder="Drone Model" .value=${data.model}/>
            <input type="text" name="imageUrl" id="imageUrl" placeholder="Image URL" .value=${data.category} />
            <input type="number" name="price" id="price" placeholder="Price" .value=${data.price} />
            <input type="number" name="weight" id="weight" placeholder="Weight" .value=${data.weight}/>
            <input type="number" name="phone" id="phone" placeholder="Phone Number for Contact" .value=${data.phone}/>
            <input type="text" name="condition" id="condition" placeholder="Condition" .value=${data.condition}/>
            <textarea name="description" id="description" placeholder="Description" .value=${data.description}></textarea>
            <button type="submit">Edit</button>
          </form>
        </div>
</section>
      
`;

export async function editView(ctx) {
    const id = ctx.params.id;

    const data = await getDroneById(id);

    render(editTemplate(data, createSubmitHandler(onEdit)));

    async function onEdit({ model, imageUrl, price, condition, weight, phone, description }) {
        if (!imageUrl || !price || !condition || !weight || !phone || !description) {
            return alert('All fields are required!')
        }

        await updateDrone(id, {model, imageUrl, price, condition, weight, phone, description});

        page.redirect('/dashboard/' + id);
    }
}