// app.js

// **IMPORTANTE:** Cambia 'http://localhost:3000' por la URL de tu backend en Vercel
const BACKEND_URL = 'http://localhost:3000'; 

// Inicialización del mapa
var map = L.map('map').setView([0, 0], 2); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var markerGroup = L.layerGroup().addTo(map);

// --- Función para MOSTRAR todos los pines ---
async function loadAllPins() {
    markerGroup.clearLayers(); 
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/locations`);
        if (!response.ok) throw new Error('Error al cargar los pines');
        
        const locations = await response.json();
        
        if (locations.length === 0) {
            console.log("No hay pines almacenados.");
            return;
        }

        let centerLat = 0, centerLon = 0;

        locations.forEach(loc => {
            const lat = parseFloat(loc.lat);
            const lon = parseFloat(loc.lon);
            
            // Contenido del popup actualizado para mostrar el nombre del usuario
            const userNameDisplay = loc.user_name || 'Anónimo';
            const popupContent = `<b>${loc.name}</b><br>Agregado por: ${userNameDisplay}`;
            
            // Añadir marcador
            L.marker([lat, lon])
                .addTo(markerGroup)
                .bindPopup(popupContent);
            
            centerLat += lat;
            centerLon += lon;
        });
        
        const avgLat = centerLat / locations.length;
        const avgLon = centerLon / locations.length;
        map.setView([avgLat, avgLon], 3); 
        
    } catch (error) {
        console.error('Error cargando los pines:', error);
        alert('No se pudieron cargar los pines de la base de datos.');
    }
}

// --- Función para BUSCAR y GUARDAR ---
async function findAndSaveLocation() {
    const locationName = document.getElementById('location-input').value;
    const userName = document.getElementById('user-name-input').value; 
    
    const searchButton = document.querySelector('button');
    
    if (!locationName) {
        alert("Por favor, introduce un nombre de ubicación.");
        return;
    }
    
    searchButton.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/api/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ locationName: locationName, userName: userName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fallo al guardar la ubicación.');
        }

        await loadAllPins();
        
        document.getElementById('location-input').value = ''; 
        
    } catch (error) {
        console.error('Error en la búsqueda/guardado:', error.message);
        alert(`Error: ${error.message}`);
    } finally {
        searchButton.disabled = false;
    }
}