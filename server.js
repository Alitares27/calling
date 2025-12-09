const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
// Importar 'fetch' como CommonJS para compatibilidad con node-fetch@2.6.7
const fetch = require('node-fetch'); 
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Express y middlewares
app.use(cors()); // Importante para permitir la comunicación con el frontend
app.use(express.json());

// Configuración de la conexión a Neon (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true, 
    },
});

// --- Inicialización de la Base de Datos ---
async function initDb() {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                lat NUMERIC(10, 7) NOT NULL,
                lon NUMERIC(10, 7) NOT NULL,
                user_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        client.release();
        console.log("Tabla 'locations' verificada/creada exitosamente.");
    } catch (error) {
        console.error("Error al inicializar la base de datos. ¿Está configurado .env? ", error);
    }
}
initDb();

// --- RUTA RAIZ (Servir el HTML) ---
// Modificado para servir index.html cuando se accede a la URL base de Vercel
app.get('/', (req, res) => {
    // __dirname es la ruta absoluta del directorio actual (donde está server.js)
    res.sendFile(path.join(__dirname, 'index.html')); 
});

// --- 1. Endpoint para Guardar Nueva Ubicación (POST) ---
app.post('/api/locations', async (req, res) => {
    // Extraer locationName y userName del cuerpo de la petición
    const { locationName, userName } = req.body; 
    
    if (!locationName) {
        return res.status(400).send({ error: "Falta el nombre de la ubicación." });
    }
    
    // Geocodificación con OpenStreetMap Nominatim
    const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
    
    try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();

        if (data && data.length > 0) {
            const { lat, lon, display_name } = data[0];
            
            // Asignar 'Anónimo' si el usuario no proporcionó un nombre
            const nameToSave = userName && userName.trim() !== '' ? userName : 'Anónimo'; 
            
            // Guardar en Neon (PostgreSQL)
            const insertQuery = `
                INSERT INTO locations (name, lat, lon, user_name)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            // Pasamos nameToSave como $4
            const result = await pool.query(insertQuery, [display_name, lat, lon, nameToSave]);
            
            res.status(201).send(result.rows[0]);
        } else {
            res.status(404).send({ error: `Ubicación no encontrada: ${locationName}` });
        }
    } catch (error) {
        console.error('Error procesando la geocodificación o DB:', error);
        res.status(500).send({ error: "Error interno del servidor." });
    }
});

// --- 2. Endpoint para Obtener Todos los Pines (GET) ---
app.get('/api/locations', async (req, res) => {
    try {
        // Seleccionar todos los campos necesarios, incluyendo user_name
        const result = await pool.query('SELECT name, lat, lon, user_name FROM locations ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las ubicaciones:', error);
        res.status(500).send({ error: "Error interno del servidor." });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});