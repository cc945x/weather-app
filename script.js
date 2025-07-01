let map;
let marker;

// Load recent searches from localStorage or empty array
let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');

// On page load, display recent searches
window.onload = () => {
    renderRecentSearches();
};

// Save a city to recent searches (avoid duplicates, max 5)
function saveRecentSearch(city) {
    city = city.trim();
    if (!city) return;

    // Remove city if already exists (case insensitive)
    recentSearches = recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());

    // Add city to front
    recentSearches.unshift(city);

    // Keep only latest 5
    if (recentSearches.length > 5) recentSearches = recentSearches.slice(0, 5);

    // Save to localStorage
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));

    // Re-render buttons
    renderRecentSearches();
}

// Render recent searches as buttons
function renderRecentSearches() {
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';

    if (recentSearches.length === 0) {
        recentList.innerHTML = '<p style="color:#aaa;">No recent searches yet.</p>';
        return;
    }

    recentSearches.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        btn.className = 'recent-button';
        btn.onclick = () => {
            document.getElementById('city').value = city;
            getWeather();
        };
        recentList.appendChild(btn);
    });
}

// Your existing getWeather function with added saveRecentSearch call
async function getWeather() {
    const cityInput = document.getElementById('city').value.trim();
    const error = document.getElementById('error');
    const loading = document.getElementById('loading');
    const weatherInfo = document.getElementById('weather-info');
    const mapElement = document.getElementById('map');

    error.style.display = 'none';
    error.textContent = '';
    loading.style.display = 'block';
    weatherInfo.innerHTML = '';
    mapElement.style.display = 'none';

    if (!cityInput) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Please enter a city name.';
        return;
    }

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityInput)}&appid=8b718e37835e1f63f302b20c90d031a4&units=metric`);
        const data = await response.json();

        if (response.ok) {
            loading.style.display = 'none';

            displayWeather(data);

            mapElement.style.display = 'block';

            const lat = data.coord.lat;
            const lon = data.coord.lon;

            if (!map) {
                map = L.map('map').setView([lat, lon], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                marker = L.marker([lat, lon], { draggable: true }).addTo(map)
                    .bindPopup(`${data.name}`)
                    .openPopup();

                marker.on('dragend', async () => {
                    const pos = marker.getLatLng();
                    await updateWeatherByCoords(pos.lat, pos.lng);
                });

            } else {
                map.setView([lat, lon], 10);
                marker.setLatLng([lat, lon])
                    .bindPopup(`${data.name}`)
                    .openPopup();
            }

            // Save the city to recent searches
            saveRecentSearch(data.name);

        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = `Error: ${err.message}`;
    }
}

// Your existing functions...

async function getWeatherByLocation() {
    // unchanged, but could add saving location city to recentSearches if desired
    // Just call saveRecentSearch(data.name) after successful fetch inside here if you want
}

function displayWeather(data) {
    const weatherInfo = document.getElementById('weather-info');
    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
    const iconCode = data.weather[0].icon;

    weatherInfo.innerHTML = `
        <div><strong>City:</strong> ${data.name}, ${data.sys.country}</div>
        <div><strong>Temperature:</strong> ${data.main.temp} °C</div>
        <div><strong>Feels Like:</strong> ${data.main.feels_like} °C</div>
        <div><strong>Humidity:</strong> ${data.main.humidity} %</div>
        <div><strong>Pressure:</strong> ${data.main.pressure} hPa</div>
        <div><strong>Wind Speed:</strong> ${data.wind.speed} m/s</div>
        <div><strong>Visibility:</strong> ${data.visibility / 1000} km</div>
        <div><strong>Cloud Cover:</strong> ${data.clouds.all} %</div>
        <div><strong>Weather:</strong> ${data.weather[0].description}</div>
        <div><strong>Sunrise:</strong> ${sunrise}</div>
        <div><strong>Sunset:</strong> ${sunset}</div>
        <div>
            <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" 
                 alt="${data.weather[0].description}" 
                 title="${data.weather[0].main}" />
        </div>
    `;
}

async function updateWeatherByCoords(lat, lon) {
    const weatherInfo = document.getElementById('weather-info');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const mapElement = document.getElementById('map');

    loading.style.display = 'block';
    error.style.display = 'none';
    error.textContent = '';
    weatherInfo.innerHTML = '';

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=8b718e37835e1f63f302b20c90d031a4&units=metric`);
        const data = await response.json();

        if (response.ok) {
            loading.style.display = 'none';
            displayWeather(data);

            mapElement.style.display = 'block';
            map.setView([lat, lon], 10);
            marker.setLatLng([lat, lon])
                .bindPopup(`${data.name}`)
                .openPopup();

            // Optionally save city here too
            saveRecentSearch(data.name);

        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Error updating weather for the selected location.';
    }
}
