const BACKEND_URL = window.location.origin;

var map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

var markerGroup = L.layerGroup().addTo(map);

async function loadAllPins() {
  markerGroup.clearLayers();
  try {
    const response = await fetch(`${BACKEND_URL}/api/locations`);
    const locations = await response.json();

    if (locations.length === 0) return;

    let centerLat = 0, centerLon = 0;

    locations.forEach(loc => {
      const lat = parseFloat(loc.lat);
      const lon = parseFloat(loc.lon);
      const userNameDisplay = loc.user_name || 'Anónimo';
      const popupContent = `<b>${loc.name}</b><br>${userNameDisplay}<br>`;

      L.marker([lat, lon])
        .addTo(markerGroup)
        .bindPopup(popupContent)
        .openPopup();

      centerLat += lat;
      centerLon += lon;
    });

    map.setView([centerLat / locations.length, centerLon / locations.length], 3);
  } catch (error) {
    console.error('Error cargando pines:', error);
  }
}

async function findAndSaveLocation() {
  const locationNameInput = document.getElementById('location-input');
  const userNameInput = document.getElementById('user-name-input');
  const locationName = locationNameInput.value;
  const userName = userNameInput.value;
  const searchButton = document.querySelector('button');

  if (!locationName) {
    alert("Por favor, introduce un nombre de ubicación.");
    return;
  }

  searchButton.disabled = true;

  try {
    const response = await fetch(`${BACKEND_URL}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationName, userName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Fallo al guardar la ubicación.');
    }

    await loadAllPins();

    locationNameInput.value = '';
    userNameInput.value = '';
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    searchButton.disabled = false;
  }
}