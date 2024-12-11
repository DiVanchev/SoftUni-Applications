function solve() {
    let currentStop = {
        id: 'depot',
        name: 'Not Connected'
    };

    async function depart() {
        const infoBox = document.querySelector('.info');
        const departButton = document.getElementById('depart');
        const arriveButton = document.getElementById('arrive');

        try {
            const response = await fetch(`http://localhost:3030/jsonstore/bus/schedule/${currentStop.id}`);
            if (!response.ok) {
                throw new Error();
            }

            const data = await response.json();
            currentStop = {
                id: data.next,
                name: data.name
            };

            infoBox.textContent = `Next stop ${data.name}`;
            departButton.disabled = true;
            arriveButton.disabled = false;
        } catch {
            infoBox.textContent = 'Error';
            departButton.disabled = true;
            arriveButton.disabled = true;
        }
    }

    function arrive() {
        const infoBox = document.querySelector('.info');
        const departButton = document.getElementById('depart');
        const arriveButton = document.getElementById('arrive');

        infoBox.textContent = `Arriving at ${currentStop.name}`;
        departButton.disabled = false;
        arriveButton.disabled = true;
    }

    return {
        depart,
        arrive
    };
}

let result = solve();
