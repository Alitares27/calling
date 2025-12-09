const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const pool = require('./db');

const router = express.Router();

// Ruta raíz: servir frontend
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// POST: guardar ubicación
router.post('/api/locations', async (req, res) => {
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
        RETURNING id, name, lat, lon, user_name, created_at;
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

// GET: obtener ubicaciones
router.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, lat, lon, user_name, created_at FROM locations ORDER BY created_at DESC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    res.status(500).send({ error: "Error interno del servidor." });
  }
});

module.exports = router;