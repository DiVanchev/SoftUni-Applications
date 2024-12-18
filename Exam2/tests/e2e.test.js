const { chromium } = require('playwright-chromium');
const { expect } = require('chai');

const host = "http://localhost:3000"; // Application host (NOT service host - that can be anything)
const interval = 3000;
const timeout = 5000;
const DEBUG = false;
const slowMo = 500;

const mockData = {
    "users": [
        {
            "_id": "0001",
            "email": "john@abv.bg",
            "password": "123456",
            "accessToken": "AAAA"
        },
        {
            "_id": "0002",
            "email": "ivan@abv.bg",
            "password": "pass123",
            "accessToken": "BBBB"
        },
        {
            "_id": "0003",
            "email": "peter@abv.bg",
            "password": "123456",
            "accessToken": "CCCC"
        }
    ],

    "catalog": [
        {
            "_id": "1001",
            "_ownerId": "0001",
            "name": "TEST-Name 1",
            "imageUrl": "/images/setup1.webp",
            "description": "TEST-Description 1",
            "parts": "TEST-Parts 1",
            "_createdOn": 1617194210928,
            "_updatedOn": 1688552027889
        },
        {
            "_id": "1002",
            "_ownerId": "0002",
            "name": "TEST-Name 2",
            "imageUrl": "/images/setup2.webp",
            "description": "TEST-Description 2",
            "parts": "TEST-Parts 2",
            "_createdOn": 1617194295474
        },
        {
            "_id": "1003",
            "_ownerId": "0002",
            "name": "TEST-Name 3",
            "imageUrl": "/images/setup3.webp",
            "description": "TEST-Description 3",
            "parts": "TEST-Parts 3",
            "_createdOn": 1617194295480
        }
    ],
    likes: [
        {
            "_ownerId": "0001",
            "setupId": "1003",
            "_createdOn": 1688652897118,
            "_id": "2001"
        }
    ]
};
const endpoints = {
    register: "/users/register",
    login: "/users/login",
    logout: "/users/logout",
    catalog: "/data/setups?sortBy=_createdOn%20desc",
    create: "/data/setups",
    search: (query) => `/data/setups?where=name%20LIKE%20%22${query}%22`,
    details: (id) => `/data/setups/${id}`,
    delete: (id) => `/data/setups/${id}`,
    own: (setupId, userId) => `/data/setups?where=_id%3D%22${setupId}%22%20and%20_ownerId%3D%22${userId}%22&count`,
    like: '/data/likes',
    totalLikes: (setupId) => `/data/likes?where=setupId%3D%22${setupId}%22&distinct=_ownerId&count`,
    userLikes: (setupId, userId) => `/data/likes?where=setupId%3D%22${setupId}%22%20and%20_ownerId%3D%22${userId}%22&count`
};

let browser;
let context;
let page;

describe("E2E tests", function () {
    // Setup
    this.timeout(DEBUG ? 120000 : timeout);
    before(async () => {
        browser = await chromium.launch(DEBUG ? { headless: false, slowMo } : {});
    });
    after(async () => {
        await browser.close();

    });
    beforeEach(async function () {
        this.timeout(10000);
        context = await browser.newContext();
        setupContext(context);
        page = await context.newPage();
    });
    afterEach(async () => {
        await page.close();
        await context.close();
    });

    // Test proper
    describe("Authentication [ 20 Points ]", function () {
        it("Login does NOT work with empty fields [ 2.5 Points ]", async function () {
            const { post } = await handle(endpoints.login);
            const isCalled = post().isHandled;

            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            await page.waitForSelector("form", { timeout: interval });
            await page.click('[type="submit"]', { timeout: interval });


            expect(isCalled()).to.equal(false, 'Login API was called when form inputs were empty');
        });

        it("Login with valid input makes correct API call [ 2.5 Points ]", async function () {
            const data = mockData.users[0];
            const { post } = await handle(endpoints.login);
            const { onRequest } = post(data);

            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            //Can check using Ids if they are part of the provided HTML
            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);

            const [request] = await Promise.all([
                onRequest(),
                page.click('[type="submit"]'),
            ]);

            const postData = JSON.parse(request.postData());
            expect(postData.email).to.equal(data.email);
            expect(postData.password).to.equal(data.password);
        });

        it("Login shows alert on fail and does not redirect [ 2.5 Points ]", async function () {
            const data = mockData.users[0];
            const { post } = await handle(endpoints.login);
            let options = { json: true, status: 400 };
            const { onResponse } = post({ message: 'Error 400' }, options);

            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            await page.waitForSelector('form', { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);

            //check for alert from failed login
            let alertPromise = new Promise(resolve => {
                page.on('dialog', async dialog => {
                    await dialog.accept();
                    resolve(dialog.type());
                });
            })

            await Promise.all([
                onResponse(),
                page.click('[type="submit"]')
            ]);

            //should still be on login page, can check using ids if they are part of the provided HTML
            await page.waitForSelector('form', { timeout: interval });
            let dialogType = await alertPromise;
            expect(dialogType).to.equal('alert');
        });

        it("Register does NOT work with empty fields [ 2.5 Points ]", async function () {
            const { post } = await handle(endpoints.register);
            const isCalled = post().isHandled;

            await page.goto(host);

            let registerBtn = await page.waitForSelector('text=Register', { timeout: interval });
            await registerBtn.click();

            await page.waitForSelector("form", { timeout: interval });
            await page.click('[type="submit"]', { timeout: interval });

            expect(isCalled()).to.be.false;
        });

        it("Register does NOT work with different passwords [ 2.5 Points ]", async function () {
            const data = mockData.users[1];
            const { post } = await handle(endpoints.register);
            const isCalled = post().isHandled;

            await page.goto(host);

            let registerBtn = await page.waitForSelector('text=Register', { timeout: interval });
            await registerBtn.click();

            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            let repeatPasswordElement = await page.waitForSelector('[name="re-password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);
            await repeatPasswordElement.fill('nope');

            //check for alert from failed register
            let alertPromise = new Promise(resolve => {
                page.on('dialog', async dialog => {
                    await dialog.accept();
                    resolve(dialog.type());
                });
            })

            await page.click('[type="submit"]');

            //should still be on register page, can check using ids if they are part of the provided HTML
            await page.waitForSelector('form', { timeout: interval });
            let dialogType = await alertPromise;
            expect(dialogType).to.equal('alert');
            expect(isCalled()).to.equal(false, 'Register API was called when form inputs were empty');
        });

        it("Register with valid input makes correct API call [ 2.5 Points ]", async function () {
            const data = mockData.users[1];
            const { post } = await handle(endpoints.register);
            const { onRequest } = post(data);

            await page.goto(host);

            let registerBtn = await page.waitForSelector('text=Register', { timeout: interval });
            await registerBtn.click();

            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            let repeatPasswordElement = await page.waitForSelector('[name="re-password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);
            await repeatPasswordElement.fill(data.password);

            const [request] = await Promise.all([
                onRequest(),
                page.click('[type="submit"]'),
            ]);

            const postData = JSON.parse(request.postData());
            expect(postData.email).to.equal(data.email);
            expect(postData.password).to.equal(data.password);
        });

        it("Register shows alert on fail and does not redirect [ 2.5 Points ]", async function () {
            const data = mockData.users[1];
            const { post } = await handle(endpoints.register);
            let options = { json: true, status: 400 };
            const { onResponse } = post({ message: 'Error 409' }, options);

            await page.goto(host);

            let registerBtn = await page.waitForSelector('text=Register', { timeout: interval });
            await registerBtn.click();

            await page.waitForSelector('form', { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            let repeatPasswordElement = await page.waitForSelector('[name="re-password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);
            await repeatPasswordElement.fill(data.password);

            //check for alert from failed register
            let alertPromise = new Promise(resolve => {
                page.on('dialog', async dialog => {
                    await dialog.accept();
                    resolve(dialog.type());
                });
            })

            await Promise.all([
                onResponse(),
                page.click('[type="submit"]')
            ]);

            //should still be on register page, can check using ids if they are part of the provided HTML
            await page.waitForSelector('form', { timeout: interval });
            let dialogType = await alertPromise;
            expect(dialogType).to.equal('alert');
        });

        it("Logout makes correct API call [ 2.5 Points ]", async function () {
            const data = mockData.users[2];
            const { post } = await handle(endpoints.login);
            const { get } = await handle(endpoints.logout);
            const { onResponse } = post(data);
            const { onRequest } = get("", { json: false, status: 204 });

            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            //Can check using Ids if they are part of the provided HTML
            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });

            await emailElement.fill(data.email);
            await passwordElement.fill(data.password);

            await Promise.all([onResponse(), page.click('[type="submit"]')]);

            let logoutBtn = await page.waitForSelector('nav >> text=Logout', { timeout: interval });

            const [request] = await Promise.all([
                onRequest(),
                logoutBtn.click()
            ]);

            const headers = request.headers();
            const token = request.headers()["x-authorization"];
            expect(request.method()).to.equal("GET");
            expect(token).to.equal(data.accessToken);
        });
    });

    describe("Navigation bar [ 10 Points ]", () => {
        it("Logged user should see correct navigation [ 2.5 Points ]", async function () {
            // Login user
            const userData = mockData.users[0];
            const { post: loginPost } = await handle(endpoints.login);
            loginPost(userData);
            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });

            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);

            await page.click('[type="submit"]');

            //Test for navigation
            await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });

            expect(await page.isVisible("nav >> text=Setup Showcases")).to.be.true;
            expect(await page.isVisible("nav >> text=Add Setup")).to.be.true;
            expect(await page.isVisible("nav >> text=Logout")).to.be.true;

            expect(await page.isVisible("nav >> text=Login")).to.be.false;
            expect(await page.isVisible("nav >> text=Register")).to.be.false;
        });

        it("Guest user should see correct navigation [ 2.5 Points ]", async function () {
            await page.goto(host);

            await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });

            expect(await page.isVisible("nav"), "Dashboard is not visible").to.be.true;
            expect(await page.isVisible("nav >> text=Add Setup"), "Create is visible").to.be.false;
            expect(await page.isVisible("nav >> text=Logout"), "Logout is visible").to.be.false;
            expect(await page.isVisible("nav >> text=Login"), "Login is not visible").to.be.true;
            expect(await page.isVisible("nav >> text=Register"), "Ragister is not visible").to.be.true;
        });

        it("Guest user navigation should work [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog);
            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector('#setups', { timeout: interval });
            let loginBtn = await page.waitForSelector('nav >> text=Login', { timeout: interval });
            await loginBtn.click();


            await page.waitForSelector('#login', { timeout: interval });
            let registerBtn = await page.waitForSelector('nav >> text=Register', { timeout: interval });
            await registerBtn.click();

            await page.waitForSelector('#register', { timeout: interval });
            let logo = await page.waitForSelector('#logo', { timeout: interval });
            await logo.click();

            await page.waitForSelector('#home', { timeout: interval });
        });

        it("Logged in user navigation should work [ 2.5 Points ]", async function () {
            // Login user
            const userData = mockData.users[0];
            const { post: loginPost } = await handle(endpoints.login);
            loginPost(userData);
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog);

            await page.goto(host);

            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();

            await page.waitForSelector("form", { timeout: interval });

            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });

            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);

            await page.click('[type="submit"]');

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector('#setups', { timeout: interval });
            let createBtn = await page.waitForSelector('nav >> text=Add Setup', { timeout: interval });
            await createBtn.click();

            await page.waitForSelector('#create', { timeout: interval });
            let logo = await page.waitForSelector('#logo', { timeout: interval });
            await logo.click();

            await page.waitForSelector('#home', { timeout: interval });
        });
    });

    describe("Home Page [ 5 Points ]", function () {
        it("Show Home page text [ 2.5 Points ]", async function () {
            await page.goto(host);
            await page.waitForSelector('#home h1');
            expect(await page.textContent('#home h1')).to.include('Welcome to Setup Legends, discover, share, and be inspired by epic gaming PC setups from around the world.');
        });

        it("Show home page image [ 2.5 Points ]", async function () {
            await page.goto(host);
            await page.waitForSelector('section img#home-img', { timeout: interval });
            expect(await page.isVisible('section img#home-img')).to.be.true;
        });
    });

    describe("Dashboard Page [ 15 Points ]", function () {
        it("Show Setup Showcases page - welcome message [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get([]);
            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector('main >> text=Setup Showcase', { timeout: interval });
            expect(await page.isVisible("main >> text=Setup Showcase")).to.be.true;
        });

        it("Check Showcases page with 0 solutions [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get([]);

            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector('text=No Setups Added.', { timeout: interval });
            expect(await page.isVisible('text=No Setups Added.')).to.be.true;

        });

        it("Check Showcases have correct images [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog);
            const data = mockData.catalog;

            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector(".setup img", { timeout: interval });
            const images = await page.$$eval(".setup img", (t) =>
                t.map((s) => s.src)
            );

            expect(images.length).to.equal(3);
            expect(images[0]).to.contains(`${encodeURI(data[0].imageUrl)}`);
            expect(images[1]).to.contains(`${encodeURI(data[1].imageUrl)}`);
            expect(images[2]).to.contains(`${encodeURI(data[2].imageUrl)}`);
        });

        it("Check Showcases have correct Name [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog);
            const data = mockData.catalog;

            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector(".setup .setup-name", { timeout: interval });
            const categories = await page.$$eval(".setup .setup-name", (t) =>
                t.map((s) => s.textContent)
            );

            expect(categories.length).to.equal(3);
            expect(categories[0]).to.contains(`${data[0].name}`);
            expect(categories[1]).to.contains(`${data[1].name}`);
            expect(categories[2]).to.contains(`${data[2].name}`);
        });

        it("Check Showcases have correct Descriptions [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog.slice(0, 2));
            const data = mockData.catalog.slice(0, 2);

            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector(".setup .description", { timeout: interval });
            const categories = await page.$$eval(".setup .description", (t) =>
                t.map((s) => s.textContent)
            );

            expect(categories.length).to.equal(2);
            expect(categories[0]).to.contains(`${data[0].description}`);
            expect(categories[1]).to.contains(`${data[1].description}`);
        });

        it("Check Showcases have Details button [ 2.5 Points ]", async function () {
            const { get } = await handle(endpoints.catalog);
            get(mockData.catalog.slice(0, 2));
            const data = mockData.catalog.slice(0, 2);

            await page.goto(host);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            await page.waitForSelector('.setup >> text=Details', { timeout: interval });
            const buttons = await page.$$eval(".setup >> text=Details", (t) =>
                t.map((s) => s.textContent)
            );

            expect(buttons.length).to.equal(2);
        });
    });

    describe("CRUD [ 50 Points ]", () => {
        describe('Create [ 12.5 Points ]', function () {
            it("Create does NOT work with empty fields [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post: loginPost } = await handle(endpoints.login);
                loginPost(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                await page.click('[type="submit"]');

                const { post } = await handle(endpoints.create);
                const isCalled = post().isHandled;

                let addSetupBtn = await page.waitForSelector('text=Add Setup', { timeout: interval });
                await addSetupBtn.click();

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await submitBtn.click(), { timeout: interval };

        
                expect(isCalled()).to.equal(false, 'Create API was called when form inputs were empty');
            });

            it("Create makes correct API call [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post: loginPost } = await handle(endpoints.login);
                loginPost(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const data = mockData.catalog[0];
                const { post } = await handle(endpoints.create);
                const { onRequest } = post(data);

                let addSetupBtn = await page.waitForSelector('text=Add Setup', { timeout: interval });
                await addSetupBtn.click();

                let setupNameElement = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageElement = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionElement = await page.waitForSelector('[name="description"]', { timeout: interval });
                let partsInfoElement = await page.waitForSelector('[name="parts-used"]', { timeout: interval });
                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await setupNameElement.fill(data.name);
                await imageElement.fill(data.imageUrl);
                await descriptionElement.fill(data.description);
                await partsInfoElement.fill(data.parts);

                const [request] = await Promise.all([
                    onRequest(),
                    submitBtn.click(),
                ]);
            });

            it("Create sends correct data [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post: loginPost } = await handle(endpoints.login);
                loginPost(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const data = mockData.catalog[0];
                const { post } = await handle(endpoints.create);
                const { onRequest } = post(data);

                let addSetupBtn = await page.waitForSelector('text=Add Setup', { timeout: interval });
                await addSetupBtn.click();

                let setupNameElement = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageElement = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionElement = await page.waitForSelector('[name="description"]', { timeout: interval });
                let partsInfoElement = await page.waitForSelector('[name="parts-used"]', { timeout: interval });
                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await setupNameElement.fill(data.name);
                await imageElement.fill(data.imageUrl);
                await descriptionElement.fill(data.description);
                await partsInfoElement.fill(data.parts);

                const [request] = await Promise.all([
                    onRequest(),
                    submitBtn.click(),
                ]);

                const postData = JSON.parse(request.postData());

                expect(postData.name).to.equal(data.name);
                expect(postData.imageUrl).to.equal(data.imageUrl);
                expect(postData.description).to.equal(data.description);
                expect(postData.parts).to.equal(data.parts);
            });

            it("Create includes correct headers [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post: loginPost } = await handle(endpoints.login);
                loginPost(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const data = mockData.catalog[0];
                const { post } = await handle(endpoints.create);
                const { onRequest } = post(data);

                let addSetupBtn = await page.waitForSelector('text=Add Setup', { timeout: interval });
                await addSetupBtn.click();

                let setupNameElement = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageElement = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionElement = await page.waitForSelector('[name="description"]', { timeout: interval });
                let partsInfoElement = await page.waitForSelector('[name="parts-used"]', { timeout: interval });
                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await setupNameElement.fill(data.name);
                await imageElement.fill(data.imageUrl);
                await descriptionElement.fill(data.description);
                await partsInfoElement.fill(data.parts);

                const [request] = await Promise.all([
                    onRequest(),
                    submitBtn.click(),
                ]);

                const token = request.headers()["x-authorization"];
                expect(token).to.equal(userData.accessToken, 'Request did not send correct authorization header');
            });

            it("Create redirects to dashboard on success [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post: loginPost } = await handle(endpoints.login);
                loginPost(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const data = mockData.catalog[0];
                const { post } = await handle(endpoints.create);
                const { onResponse } = post(data);

                let addSetupBtn = await page.waitForSelector('text=Add Setup', { timeout: interval });
                await addSetupBtn.click();
                let setupNameElement = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageElement = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionElement = await page.waitForSelector('[name="description"]', { timeout: interval });
                let partsInfoElement = await page.waitForSelector('[name="parts-used"]', { timeout: interval });
                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await setupNameElement.fill(data.name);
                await imageElement.fill(data.imageUrl);
                await descriptionElement.fill(data.description);
                await partsInfoElement.fill(data.parts);

                await Promise.all([
                    onResponse(),
                    submitBtn.click(),
                ]);

                await page.waitForSelector('#setups', {timeout: interval});
            });
        })

        describe('Details [ 10 Points ]', function () {
            it("Details calls the correct API [ 2.5 Points ]", async function () {
                await page.goto(host);

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[1];
                const { get } = await handle(endpoints.details(data._id));
                let { onResponse, isHandled } = get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });

                await Promise.all([
                    onResponse(),
                    detailsBtn.click()
                ]);

                expect(isHandled()).to.equal(true, 'Details API did not receive a correct call');
            });

            it("Details with guest calls shows correct info [ 2.5 Points ]", async function () {
                await page.goto(host);

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[1];
                const { get } = await handle(endpoints.details(data._id));
                let { isHandled } = get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikesNull } = await handle(endpoints.userLikes(data._id, null));
                userLikesNull(0);
      
                const { get: userLikesUndefined } = await handle(endpoints.userLikes(data._id, undefined));
                userLikesUndefined(0);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let imageElement = await page.waitForSelector('#details-img', { timeout: interval });
                let setupNameElement = await page.waitForSelector('#details-setup-name', { timeout: interval });
                let descriptionElement = await page.waitForSelector('#setup-description', { timeout: interval });
                let learnMoreElement = await page.waitForSelector('#details-parts', { timeout: interval });

                let imageSrc = await imageElement.getAttribute('src');
                let name = await setupNameElement.textContent();
                let description = await descriptionElement.textContent();
                let learnMore = await learnMoreElement.textContent();

                expect(imageSrc).to.contains(data.imageUrl);
                expect(name).to.contains(data.name);
                expect(description).to.contains(data.description);
                expect(learnMore).to.contains(data.parts);
                expect(await page.isVisible('#action-buttons >> text="Delete"')).to.equal(false, 'Delete button was visible for non owner');
                expect(await page.isVisible('#action-buttons >> text="Edit"')).to.equal(false, 'Edit button was visible for non-owner');

                expect(isHandled()).to.equal(true, 'Details API was not called');
            });

            it("Details with logged in user shows correct info [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[0];
                const { get } = await handle(endpoints.details(data._id));
                let { isHandled } = get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let imageElement = await page.waitForSelector('#details-img', { timeout: interval });
                let setupNameElement = await page.waitForSelector('#details-setup-name', { timeout: interval });
                let descriptionElement = await page.waitForSelector('#setup-description', { timeout: interval });
                let learnMoreElement = await page.waitForSelector('#details-parts', { timeout: interval });

                let imageSrc = await imageElement.getAttribute('src');
                let name = await setupNameElement.textContent();
                let description = await descriptionElement.textContent();
                let learnMore = await learnMoreElement.textContent();

                expect(imageSrc).to.contains(data.imageUrl);
                expect(name).to.contains(data.name);
                expect(description).to.contains(data.description);
                expect(learnMore).to.contains(data.parts);
                expect(await page.isVisible('#action-buttons >> text="Delete"')).to.equal(false, 'Delete button was visible for non owner');
                expect(await page.isVisible('#action-buttons >> text="Edit"')).to.equal(false, 'Edit button was visible for non-owner');

                expect(isHandled()).to.equal(true, 'Details API was not called');
            });

            it("Details with owner shows correct info [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[0];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[0];
                const { get } = await handle(endpoints.details(data._id));
                let { isHandled } = get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let imageElement = await page.waitForSelector('#details-img', { timeout: interval });
                let setupNameElement = await page.waitForSelector('#details-setup-name', { timeout: interval });
                let descriptionElement = await page.waitForSelector('#setup-description', { timeout: interval });
                let learnMoreElement = await page.waitForSelector('#details-parts', { timeout: interval });

                let imageSrc = await imageElement.getAttribute('src');
                let name = await setupNameElement.textContent();
                let description = await descriptionElement.textContent();
                let learnMore = await learnMoreElement.textContent();

                expect(imageSrc).to.contains(data.imageUrl);
                expect(name).to.contains(data.name);
                expect(description).to.contains(data.description);
                expect(learnMore).to.contains(data.parts);
                expect(await page.isVisible('#action-buttons >> text="Delete"')).to.equal(true, 'Delete button was NOT visible for owner');
                expect(await page.isVisible('#action-buttons >> text="Edit"')).to.equal(true, 'Edit button was NOT visible for owner');

                expect(isHandled()).to.equal(true, 'Details API was not called');
            });
        })

        describe('Edit [ 17.5 Points ]', function () {
            it("Edit calls correct API to populate info [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[1];
                const { get } = await handle(endpoints.details(data._id));
                let { onResponse, isHandled } = get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });

                await Promise.all([
                    onResponse(),
                    editButton.click()
                ]);

                expect(isHandled()).to.equal(true, 'Request was not sent to Details API to get Edit information');
            });

            it("Edit should populate form with correct data [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[1];
                const { get } = await handle(endpoints.details(data._id));
                get(data);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                await page.waitForSelector('.form .edit-form input', { timeout: interval });
                await page.waitForSelector('.edit-form textarea', { timeout: interval });

                const inputs = await page.$$eval(".form .edit-form input", (t) => t.map((i) => i.value));
                const textareas = await page.$$eval(".edit-form textarea", (t) => t.map((i) => i.value));

                expect(inputs[0]).to.contains(data.name);
                expect(inputs[1]).to.contains(data.imageUrl);
                expect(textareas[0]).to.contains(data.description);
                expect(textareas[1]).to.contains(data.parts);
            });

            it("Edit does NOT work with empty fields [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[2];
                const { get, put } = await handle(endpoints.details(data._id));
                get(data);
                const { isHandled } = put();

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                let nameInput = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageInput = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionInput = await page.waitForSelector('[name="description"]', { timeout: interval });
                let learnMoreInput = await page.waitForSelector('[name="parts-used"]', { timeout: interval });


                await nameInput.fill('');
                await imageInput.fill('');
                await descriptionInput.fill('');
                await learnMoreInput.fill('');

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await submitBtn.click(), { timeout: interval };


                expect(isHandled()).to.equal(false, 'Edit API was called when form inputs were empty');
            });

            it("Edit sends information to the right API [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);

                const data = mockData.catalog[2];
                const modifiedData = Object.assign({}, data);
                modifiedData.name = 'Name Test';
                modifiedData.imageUrl = 'Image Test';
                modifiedData.description = 'Description Test';
                modifiedData.parts = 'Parts Test';

                const { get, put } = await handle(endpoints.details(data._id));
                get(data);
                const { isHandled, onResponse } = put(modifiedData);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                let nameInput = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageInput = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionInput = await page.waitForSelector('[name="description"]', { timeout: interval });
                let learnMoreInput = await page.waitForSelector('[name="parts-used"]', { timeout: interval });

                await nameInput.fill(modifiedData.name);
                await imageInput.fill(modifiedData.imageUrl);
                await descriptionInput.fill(modifiedData.description);
                await learnMoreInput.fill(modifiedData.parts);

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await Promise.all([
                    onResponse(),
                    submitBtn.click(),
                ]);

                expect(isHandled()).to.equal(true, 'The Edit API was not called');
            });

            it("Edit sends correct headers [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const data = mockData.catalog[2];
                const modifiedData = Object.assign({}, data);
                modifiedData.type = 'Name Test';
                modifiedData.imageUrl = 'Image Test';
                modifiedData.description = 'Description Test';
                modifiedData.parts = 'Parts Test';

                const { get, put } = await handle(endpoints.details(data._id));
                get(data);
                const { onRequest } = put(modifiedData);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                let nameInput = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageInput = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionInput = await page.waitForSelector('[name="description"]', { timeout: interval });
                let learnMoreInput = await page.waitForSelector('[name="parts-used"]', { timeout: interval });

                await nameInput.fill(modifiedData.name);
                await imageInput.fill(modifiedData.imageUrl);
                await descriptionInput.fill(modifiedData.description);
                await learnMoreInput.fill(modifiedData.parts);

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                let [request] = await Promise.all([
                    onRequest(),
                    submitBtn.click(),
                ]);

                const token = request.headers()["x-authorization"];
                expect(token).to.equal(userData.accessToken, 'Request did not send correct authorization header');
            });

            it("Edit sends correct information [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const data = mockData.catalog[2];
                const modifiedData = Object.assign({}, data);
                modifiedData.type = 'type Test';
                modifiedData.imageUrl = 'Image Test';
                modifiedData.description = 'Description Test';
                modifiedData.parts = 'Parts Test';

                const { get, put } = await handle(endpoints.details(data._id));
                get(data);
                const { onRequest } = put(modifiedData);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                let nameInput = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageInput = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionInput = await page.waitForSelector('[name="description"]', { timeout: interval });
                let learnMoreInput = await page.waitForSelector('[name="parts-used"]', { timeout: interval });

                await nameInput.fill(modifiedData.name);
                await imageInput.fill(modifiedData.imageUrl);
                await descriptionInput.fill(modifiedData.description);
                await learnMoreInput.fill(modifiedData.parts);

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                const [request] = await Promise.all([
                    onRequest(),
                    submitBtn.click(),
                ]);

                const postData = JSON.parse(request.postData());

                expect(postData.name).to.contains(modifiedData.name);
                expect(postData.imageUrl).to.contains(modifiedData.imageUrl);
                expect(postData.description).to.contains(modifiedData.description);
                expect(postData.parts).to.contains(modifiedData.parts);
            });

            it("Edit redirects to Details on success [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const data = mockData.catalog[2];
                const modifiedData = Object.assign({}, data);
                modifiedData.type = 'Nmae Test';
                modifiedData.imageUrl = 'Image Test';
                modifiedData.description = 'Description Test';
                modifiedData.parts = 'Parts Test';

                const { get, put } = await handle(endpoints.details(data._id));
                get(data);
                const { onResponse } = put(modifiedData);

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let editButton = await page.waitForSelector('#action-buttons >> text="Edit"', { timeout: interval });
                await editButton.click();

                let nameInput = await page.waitForSelector('[name="setup-name"]', { timeout: interval });
                let imageInput = await page.waitForSelector('[name="image-url"]', { timeout: interval });
                let descriptionInput = await page.waitForSelector('[name="description"]', { timeout: interval });
                let learnMoreInput = await page.waitForSelector('[name="parts-used"]', { timeout: interval });

                await nameInput.fill(modifiedData.name);
                await imageInput.fill(modifiedData.imageUrl);
                await descriptionInput.fill(modifiedData.description);
                await learnMoreInput.fill(modifiedData.parts);

                let submitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });

                await Promise.all([
                    onResponse(),
                    submitBtn.click(),
                ]);

                await page.waitForSelector('#details', {timeout: interval});
            });
        })

        describe('Delete [ 10 Points ]', function () {
            it("Delete makes correct API call [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();
                const data = mockData.catalog[2];

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const { get, del } = await handle(endpoints.details(data._id));
                get(data);
                const { onRequest, onResponse, isHandled } = del({ "_deletedOn": 1688586307461 });

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let deleteButton = await page.waitForSelector('#action-buttons >> text="Delete"', { timeout: interval });

                page.on('dialog', (dialog) => dialog.accept());

                let [request] = await Promise.all([onRequest(), onResponse(), deleteButton.click()]);

                const token = request.headers()["x-authorization"];
                expect(token).to.equal(userData.accessToken, 'Request did not send correct authorization header');
                expect(isHandled()).to.be.true;
            });

            it("Delete shows a confirm dialog [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();
                const data = mockData.catalog[2];

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const { get, del } = await handle(endpoints.details(data._id));
                get(data);
                const { onResponse, isHandled } = del({ "_deletedOn": 1688586307461 });

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let deleteButton = await page.waitForSelector('#action-buttons >> text="Delete"', { timeout: interval });

                let alertPromise = new Promise(resolve => {
                    page.on('dialog', (dialog) => {
                        dialog.accept();
                        resolve(dialog.type());
                    });
                });

                let result = await Promise.all([alertPromise, onResponse(), deleteButton.click()]);
                expect(result[0]).to.equal('confirm');
            });

            it("Delete redirects to Dashboard on confirm accept [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();
                const data = mockData.catalog[2];

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const { get, del } = await handle(endpoints.details(data._id));
                get(data);
                const { onResponse, isHandled } = del({ "_deletedOn": 1688586307461 });

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let deleteButton = await page.waitForSelector('#action-buttons >> text="Delete"', { timeout: interval });

                let alertPromise = new Promise(resolve => {
                    page.on('dialog', (dialog) => {
                        dialog.accept();
                        resolve(dialog.type());
                    });
                });

                await Promise.all([alertPromise, onResponse(), deleteButton.click()]);

                await page.waitForSelector('#setups', { timeout: interval });
            });

            it("Delete does not delete on confirm reject [ 2.5 Points ]", async function () {
                //Login
                const userData = mockData.users[1];
                const { post } = await handle(endpoints.login);
                post(userData);
                await page.goto(host);
                let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
                await loginBtn.click();
                await page.waitForSelector("form", { timeout: interval });
                let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
                let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
                await emailElement.fill(userData.email);
                await passwordElement.fill(userData.password);
                let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
                await loginSubmitBtn.click();
                const data = mockData.catalog[2];

                const { get: catalogGet } = await handle(endpoints.catalog);
                catalogGet(mockData.catalog);
                const { get, del } = await handle(endpoints.details(data._id));
                get(data);
                const { isHandled } = del({ "_deletedOn": 1688586307461 });

                const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
                totalLikes(0);

                const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
                userLikes(0);

                const { get: own } = await handle(endpoints.own(data._id, userData._id));
                own(1);

                let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
                await showcaseBtn.click();

                let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
                await detailsBtn.click();

                let deleteButton = await page.waitForSelector('#action-buttons >> text="Delete"', { timeout: interval });

                let alertPromise = new Promise(resolve => {
                    page.on('dialog', (dialog) => {
                        dialog.dismiss();
                        resolve(dialog.type());
                    });
                });

                await Promise.all([alertPromise, deleteButton.click()]);
                expect(isHandled()).to.equal(false, 'Delete API was called when the confirm dialog not accepted');

                //Check if we're still on Details page
                await page.waitForSelector('#details', { timeout: interval });
            });
        })
    });

    describe('BONUS: Likes [ 15 Points ]', async () => {
        it("Likes for guests calls correct API and shows correct info [ 2.5 Points ]", async function () {
            await page.goto(host);

            let totalLikesCount = 2;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[1];
            const { get } = await handle(endpoints.details(data._id));
            let { isHandled: detailsIsHandled } = get(data);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            let { isHandled: totalLikesisHandled } = totalLikes(totalLikesCount);

            const { get: userLikesNull } = await handle(endpoints.userLikes(data._id, null));
            let { isHandled: userLikesNullIsHandled } = userLikesNull(0);

            const { get: userLikesUndefined } = await handle(endpoints.userLikes(data._id, undefined));
            let { isHandled: userLikesUndefinedIsHandled } = userLikesUndefined(0);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likesElement = await page.waitForSelector('#like', { timeout: interval });
            let likes = await likesElement.textContent();

            expect(likes).to.contains(totalLikesCount);
            expect(await page.isVisible('#action-buttons >> text="Like"')).to.equal(false, 'Like button was visible for user who already liked');
            expect(totalLikesisHandled()).to.equal(true, 'Total Likes API was not called');

        });

        it("Likes for logged in user who has already liked calls correct API and shows correct info [ 2.5 Points ]", async function () {
            //Login
            const userData = mockData.users[1];
            const { post } = await handle(endpoints.login);
            post(userData);
            await page.goto(host);
            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();
            await page.waitForSelector("form", { timeout: interval });
            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);
            let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
            await loginSubmitBtn.click();

            let totalLikesCount = 3;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[0];
            const { get } = await handle(endpoints.details(data._id));
            let { isHandled: detailsIsHandled } = get(data);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            let { isHandled: totalLikesisHandled } = totalLikes(totalLikesCount);

            const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
            let { isHandled: userLikesIsHandled } = userLikes(1);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likesElement = await page.waitForSelector('#like', { timeout: interval });
            let likes = await likesElement.textContent();

            expect(likes).to.contains(totalLikesCount);
            expect(await page.isVisible('#action-buttons >> text="Like"')).to.equal(false, 'Like button was visible for user who already liked');
            expect(totalLikesisHandled()).to.equal(true, 'Total Likes API was not called');
            expect(userLikesIsHandled()).to.equal(true, 'User Likes API was not called');
        });

        it("Likes for logged in user who has NOT liked calls correct API and shows correct info  [ 2.5 Points ]", async function () {
            //Login
            const userData = mockData.users[1];
            const { post } = await handle(endpoints.login);
            post(userData);
            await page.goto(host);
            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();
            await page.waitForSelector("form", { timeout: interval });
            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);
            let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
            await loginSubmitBtn.click();

            let totalLikesCount = 3;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[0];
            const { get } = await handle(endpoints.details(data._id));
            let { isHandled: detailsIsHandled } = get(data);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            let { isHandled: totalLikesisHandled } = totalLikes(totalLikesCount);

            const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
            let { isHandled: userLikesIsHandled } = userLikes(0);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likesElement = await page.waitForSelector('#like', { timeout: interval });
            let likeButton = await page.waitForSelector('#action-buttons >> text="Like"', { timeout: interval });
            let likes = await likesElement.textContent();

            expect(likes).to.contains(totalLikesCount);
            expect(await likeButton.isVisible()).to.equal(true, 'Like button was not visible for an user who has not yet liked');
            expect(totalLikesisHandled()).to.equal(true, 'Total Likes API was not called');
            expect(userLikesIsHandled()).to.equal(true, 'User Likes API was not called');
        });

        it("Likes for owner calls correct API and shows correct info [ 2.5 Points ]", async function () {
            //Login
            const userData = mockData.users[0];
            const { post } = await handle(endpoints.login);
            post(userData);
            await page.goto(host);
            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();
            await page.waitForSelector("form", { timeout: interval });
            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);
            let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
            await loginSubmitBtn.click();

            let totalLikesCount = 3;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[0];
            const { get } = await handle(endpoints.details(data._id));
            get(data);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            let { isHandled: totalLikesisHandled } = totalLikes(totalLikesCount);

            const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
            userLikes(0);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likesElement = await page.waitForSelector('#like', { timeout: interval });
            let likes = await likesElement.textContent();

            expect(likes).to.contains(totalLikesCount);
            expect(await page.isVisible('#action-buttons >> text="Like"')).to.equal(false, 'Like button was visible for owner');
            expect(totalLikesisHandled()).to.equal(true, 'Total Likes API was not called');
        });

        it("Liking for valid user sends correct API call [ 2.5 Points ]", async function () {
            //Login
            const userData = mockData.users[0];
            const { post } = await handle(endpoints.login);
            post(userData);
            await page.goto(host);
            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();
            await page.waitForSelector("form", { timeout: interval });
            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);
            let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
            await loginSubmitBtn.click();

            let totalLikesCount = 1;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[2];
            const likeData = mockData.likes[0];
            const { get } = await handle(endpoints.details(data._id));
            get(data);

            const { post: likePost } = await handle(endpoints.like);
            let { onRequest: likeOnRequest } = likePost(likeData);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            totalLikes(totalLikesCount);

            const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
            userLikes(0);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likeButton = await page.waitForSelector('#action-buttons >> text="Like"', { timeout: interval });

            let [request] = await Promise.all([
                likeOnRequest(),
                likeButton.click(),
            ])

            const postData = JSON.parse(request.postData());
            expect(postData.setupId).to.equal(data._id);
            const token = request.headers()["x-authorization"];
            expect(token).to.equal(userData.accessToken, 'Request did not send correct authorization header');
        });

        it("Liking for valid user increments likes and hides Like button [ 2.5 Points ]", async function () {
            //Login
            const userData = mockData.users[0];
            const { post } = await handle(endpoints.login);
            post(userData);
            await page.goto(host);
            let loginBtn = await page.waitForSelector('text=Login', { timeout: interval });
            await loginBtn.click();
            await page.waitForSelector("form", { timeout: interval });
            let emailElement = await page.waitForSelector('[name="email"]', { timeout: interval });
            let passwordElement = await page.waitForSelector('[name="password"]', { timeout: interval });
            await emailElement.fill(userData.email);
            await passwordElement.fill(userData.password);
            let loginSubmitBtn = await page.waitForSelector('[type="submit"]', { timeout: interval });
            await loginSubmitBtn.click();

            let totalLikesCount = 1;
            const { get: catalogGet } = await handle(endpoints.catalog);
            catalogGet(mockData.catalog);
            const data = mockData.catalog[2];
            const likeData = mockData.likes[0];
            const { get } = await handle(endpoints.details(data._id));
            get(data);

            const { post: likePost } = await handle(endpoints.like);
            let { onRequest: likeOnRquest, onResponse: likeOnResponse } = likePost(likeData);

            const { get: totalLikes } = await handle(endpoints.totalLikes(data._id));
            totalLikes(totalLikesCount);

            const { get: userLikes } = await handle(endpoints.userLikes(data._id, userData._id));
            userLikes(0);

            let showcaseBtn = await page.waitForSelector('nav >> text=Setup Showcases', { timeout: interval });
            await showcaseBtn.click();

            let detailsBtn = await page.waitForSelector(`.setup:has-text("${data.description}") >> .details-btn`, { timeout: interval });
            await detailsBtn.click();

            let likesElement = await page.waitForSelector('#like', { timeout: interval });
            let likeButton = await page.waitForSelector('#action-buttons >> text="Like"', { timeout: interval });
            let likes = await likesElement.textContent();

            expect(likes).to.equal(totalLikesCount.toString());

            let res = await Promise.all([
                likeOnResponse(),
                likeButton.click(),
                totalLikes(totalLikesCount + 1),
                userLikes(1)
            ]);

            await page.waitForSelector('#action-buttons >> text="Like"', { timeout: interval, state: 'detached' });
            likesElement = await page.waitForSelector('#like', { timeout: interval });
            let newLikes = await likesElement.textContent();

            expect(newLikes).to.equal((totalLikesCount + 1).toString(), 'Likes did not increment on clicking Like button');
        });
    });
});

async function setupContext(context) {
    // Block external calls
    await context.route(
        (url) => url.href.slice(0, host.length) != host,
        (route) => {
            if (DEBUG) {
                console.log("Preventing external call to " + route.request().url());
            }
            route.abort();
        }
    );
}

function handle(match, handlers) {
    return handleRaw.call(page, match, handlers);
}

function handleContext(context, match, handlers) {
    return handleRaw.call(context, match, handlers);
}

async function handleRaw(match, handlers) {
    const methodHandlers = {};
    const result = {
        get: (returns, options) => request("GET", returns, options),
        post: (returns, options) => request("POST", returns, options),
        put: (returns, options) => request("PUT", returns, options),
        patch: (returns, options) => request("PATCH", returns, options),
        del: (returns, options) => request("DELETE", returns, options),
        delete: (returns, options) => request("DELETE", returns, options),
    };

    const context = this;

    await context.route(urlPredicate, (route, request) => {
        if (DEBUG) {
            console.log(">>>", request.method(), request.url());
        }

        const handler = methodHandlers[request.method().toLowerCase()];
        if (handler == undefined) {
            route.continue();
        } else {
            handler(route, request);
        }
    });

    if (handlers) {
        for (let method in handlers) {
            if (typeof handlers[method] == "function") {
                handlers[method](result[method]);
            } else {
                result[method](handlers[method]);
            }
        }
    }

    return result;

    function request(method, returns, options) {
        let handled = false;

        methodHandlers[method.toLowerCase()] = (route, request) => {
            handled = true;
            route.fulfill(respond(returns, options));
        };

        return {
            onRequest: () => context.waitForRequest(urlPredicate),
            onResponse: () => context.waitForResponse(urlPredicate),
            isHandled: () => handled,
        };
    }

    function urlPredicate(current) {
        if (current instanceof URL) {
            return current.href.toLowerCase().endsWith(match.toLowerCase());
        } else {
            return current.url().toLowerCase().endsWith(match.toLowerCase());
        }
    }
}

function respond(data, options = {}) {
    options = Object.assign(
        {
            json: true,
            status: 200,
        },
        options
    );

    const headers = {
        "Access-Control-Allow-Origin": "*",
    };
    if (options.json) {
        headers["Content-Type"] = "application/json";
        data = JSON.stringify(data);
    }

    return {
        status: options.status,
        headers,
        body: data,
    };
}