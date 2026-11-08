import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'opm_challenge',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB Error] Unexpected error on idle client:', err.message);
});

export const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error(`[DB Query Error] Query: "${text}" | Error: ${error.message}`);
    throw error;
  }
};

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name');
    console.log(`✅ PostgreSQL connected successfully to [${result.rows[0].db_name}] as [${result.rows[0].user_name}]!`);
    client.release();
    return true;
  } catch (error) {
    console.warn('⚠️ Warning: PostgreSQL not reachable yet:', error.message);
    return false;
  }
};
