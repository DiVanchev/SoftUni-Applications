import { html, render } from "../lib.js";
import { deleteDrone, getDroneById } from "../data/drones.js";
import { getUserData } from "../util.js";

const detailsTemplate = (droneData, isOwner) => html`
  <section id="details">
    <div id="details-wrapper">
      <div>
        <img id="details-img" src=${droneData.imageUrl} alt="example1" />
        <p id="details-model">${droneData.model}</p>
      </div>
      <div id="info-wrapper">
        <div id="details-description">
          <p class="details-price">Price: ${droneData.price}</p>
          <p class="details-condition">Condition: ${droneData.condition}</p>
          <p class="details-weight">Weight: ${droneData.weight}</p>
          <p class="drone-description">${droneData.description}</p>
          <p class="phone-number">Phone: ${droneData.phone}</p>
        </div>

        ${isOwner ? html`
            <div class="buttons">
              <a href="/edit/${droneData._id}" id="edit-btn">Edit</a>
              <a href="javascript:void(0)" id="delete-btn">Delete</a>
            </div>
        ` : ''}
      </div>
    </div>
  </section>
`;

export async function detailsView(ctx) {
  const id = ctx.params.id;

  const userData = await getUserData();
  const droneData = await getDroneById(id);

  const isOwner = userData?._id == droneData._ownerId;

  render(detailsTemplate(droneData, isOwner));

  // async function onDelete() {
  //   const choice = confirm("Are you sure?");

  //   if (!choice) {
  //     return;
  //   }
  //   await deleteDrone(id);

  //   page.redirect("/dashboard");
  // }
}
