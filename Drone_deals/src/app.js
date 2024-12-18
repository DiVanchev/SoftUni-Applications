import { page }  from './lib.js'
import { updateNav } from './util.js';
import { dashboardView } from './views/dashboard.js';
import { homeView } from './views/home.js'
import { loginView } from './views/login.js';
import { registerView } from './views/register.js';
import { logout } from './data/user.js';
import { createView } from './views/create.js';
import { detailsView } from './views/details.js';
import { editView } from './views/edit.js';

updateNav();

page('/', homeView);
page('/dashboard', dashboardView);
page('/dashboard/:id', detailsView);
page('/edit/:id', editView);
page('/sell', createView);
page('/login', loginView);
page('/register', registerView);

page.start();

document.getElementById('logoutLink').addEventListener('click', () => {
    logout();
    updateNav();
    page.redirect('/');
})