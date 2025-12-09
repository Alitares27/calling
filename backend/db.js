require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

module.exports = pool;