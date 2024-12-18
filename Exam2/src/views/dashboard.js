import { html, render } from '../lib.js';
import { droneTemplate } from './partials/setups.js';
import { getAllSetups } from '../data/setups.js';

const dashboardTemplate = (drones) => html`
  <h2>Setup Showcase</h2>
      <section id="setups">
${drones.length ? drones.map(droneTemplate) : html`<h2 id="no-setup">No Setups Added.</h2>`}
      </section>  
`;

export async function dashboardView() {
    const drones = await getAllSetups();

    render(dashboardTemplate(setups));
}
