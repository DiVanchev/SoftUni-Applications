function attachEvents() {
    const locationInput = document.getElementById('location');
    const submitButton = document.getElementById('submit');
    const forecastDiv = document.getElementById('forecast');
    const currentDiv = document.getElementById('current');
    const upcomingDiv = document.getElementById('upcoming');

    const symbols = {
        Sunny: '&#x2600;',
        'Partly sunny': '&#x26C5;',
        Overcast: '&#x2601;',
        Rain: '&#x2614;',
        Degrees: '&#176;'
    };

    submitButton.addEventListener('click', async () => {
        forecastDiv.style.display = 'none';
        currentDiv.innerHTML = '<div class="label">Current conditions</div>';
        upcomingDiv.innerHTML = '<div class="label">Three-day forecast</div>';

        try {
            const locationName = locationInput.value;
            const locationsResponse = await fetch('http://localhost:3030/jsonstore/forecaster/locations');
            if (!locationsResponse.ok) {
                throw new Error();
            }

            const locations = await locationsResponse.json();
            const location = locations.find(loc => loc.name === locationName);

            if (!location) {
                throw new Error();
            }

            const [currentResponse, upcomingResponse] = await Promise.all([
                fetch(`http://localhost:3030/jsonstore/forecaster/today/${location.code}`),
                fetch(`http://localhost:3030/jsonstore/forecaster/upcoming/${location.code}`)
            ]);

            if (!currentResponse.ok || !upcomingResponse.ok) {
                throw new Error();
            }

            const currentData = await currentResponse.json();
            const upcomingData = await upcomingResponse.json();

            const currentHTML = `
                <div class="forecasts">
                    <span class="symbol">${symbols[currentData.forecast.condition]}</span>
                    <span class="condition">
                        <span class="forecast-data">${currentData.name}</span>
                        <span class="forecast-data">${currentData.forecast.low}${symbols.Degrees}/${currentData.forecast.high}${symbols.Degrees}</span>
                        <span class="forecast-data">${currentData.forecast.condition}</span>
                    </span>
                </div>
            `;
            currentDiv.innerHTML += currentHTML;

            const upcomingHTML = upcomingData.forecast
                .map(day => `
                    <span class="upcoming">
                        <span class="symbol">${symbols[day.condition]}</span>
                        <span class="forecast-data">${day.low}${symbols.Degrees}/${day.high}${symbols.Degrees}</span>
                        <span class="forecast-data">${day.condition}</span>
                    </span>
                `)
                .join('');
            upcomingDiv.innerHTML += `<div class="forecast-info">${upcomingHTML}</div>`;

            forecastDiv.style.display = 'block';
        } catch {
            forecastDiv.style.display = 'block';
            forecastDiv.innerHTML = 'Error';
        }
    });
}

attachEvents();
