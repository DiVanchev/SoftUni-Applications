async function lockedProfile() {
    const mainElement = document.getElementById('main');
    mainElement.innerHTML = '';

    try {
        const response = await fetch('http://localhost:3030/jsonstore/advanced/profiles');
        if (!response.ok) {
            throw new Error();
        }

        const data = await response.json();
        Object.values(data).forEach((profile, index) => {
            const profileElement = document.createElement('div');
            profileElement.classList.add('profile');

            profileElement.innerHTML = `
                <img src="./iconProfile2.png" class="userIcon" />
                <label>Lock</label>
                <input type="radio" name="user${index}Locked" value="lock" checked>
                <label>Unlock</label>
                <input type="radio" name="user${index}Locked" value="unlock"><br>
                <hr>
                <label>Username</label>
                <input type="text" name="user${index}Username" value="${profile.username}" disabled readonly />
                <div class="hiddenInfo">
                    <hr>
                    <label>Email:</label>
                    <input type="email" name="user${index}Email" value="${profile.email}" disabled readonly />
                    <label>Age:</label>
                    <input type="number" name="user${index}Age" value="${profile.age}" disabled readonly />
                </div>
                <button>Show more</button>
            `;

            const button = profileElement.querySelector('button');
            const hiddenInfo = profileElement.querySelector('.hiddenInfo');
            const lockRadio = profileElement.querySelector(`input[value="lock"]`);
            const unlockRadio = profileElement.querySelector(`input[value="unlock"]`);

            button.addEventListener('click', () => {
                if (unlockRadio.checked) {
                    if (hiddenInfo.style.display === 'block') {
                        hiddenInfo.style.display = 'none';
                        button.textContent = 'Show more';
                    } else {
                        hiddenInfo.style.display = 'block';
                        button.textContent = 'Hide it';
                    }
                }
            });

            mainElement.appendChild(profileElement);
        });
    } catch {
        mainElement.innerHTML = '<p>Error loading profiles</p>';
    }
}
