// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // ⚠️ en Vercel suele necesitar false
});

// Inicializar DB
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
    console.log("Tabla 'locations' lista.");
  } catch (error) {
    console.error("Error al inicializar DB:", error);
  }
}
initDb();

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/locations', async (req, res) => {
  const { locationName, userName } = req.body;
  if (!locationName) return res.status(400).send({ error: "Falta el nombre de la ubicación." });

  const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;

  try {
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      const nameToSave = userName?.trim() !== '' ? userName : 'Anónimo';

      const insertQuery = `
        INSERT INTO locations (name, lat, lon, user_name)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const result = await pool.query(insertQuery, [display_name, lat, lon, nameToSave]);

      res.status(201).send(result.rows[0]);
    } else {
      res.status(404).send({ error: `Ubicación no encontrada: ${locationName}` });
    }
  } catch (error) {
    console.error('Error procesando geocodificación o DB:', error);
    res.status(500).send({ error: "Error interno del servidor." });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, lat, lon, user_name FROM locations ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    res.status(500).send({ error: "Error interno del servidor." });
  }
});

// 👇 Exporta el handler en lugar de app.listen
module.exports = app;