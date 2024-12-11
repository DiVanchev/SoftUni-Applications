async function solution() {
    const mainSection = document.getElementById('main');

    try {
        const response = await fetch('http://localhost:3030/jsonstore/advanced/articles/list');
        if (!response.ok) {
            throw new Error('Failed to fetch articles list');
        }

        const articles = await response.json();

        articles.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'accordion';

            articleDiv.innerHTML = `
                <div class="head">
                    <span>${article.title}</span>
                    <button class="button" id="${article._id}">More</button>
                </div>
                <div class="extra">
                    <p></p>
                </div>
            `;

            const button = articleDiv.querySelector('.button');
            const extraDiv = articleDiv.querySelector('.extra');
            const paragraph = extraDiv.querySelector('p');

            button.addEventListener('click', async () => {
                if (button.textContent === 'More') {
                    try {
                        const detailsResponse = await fetch(`http://localhost:3030/jsonstore/advanced/articles/details/${article._id}`);
                        if (!detailsResponse.ok) {
                            throw new Error('Failed to fetch article details');
                        }

                        const details = await detailsResponse.json();
                        paragraph.textContent = details.content;
                        extraDiv.style.display = 'block';
                        button.textContent = 'Less';
                    } catch (err) {
                        alert('Failed to load article details');
                    }
                } else {
                    extraDiv.style.display = 'none';
                    button.textContent = 'More';
                }
            });

            mainSection.appendChild(articleDiv);
        });
    } catch (err) {
        mainSection.innerHTML = '<p>Error loading articles</p>';
    }
}
