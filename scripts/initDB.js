const { query } = require('../config/db')

async function initializeDatabase() {
    try {
        await query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          full_name VARCHAR(50),
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `)

    
        await query(`
      CREATE TABLE IF NOT EXISTS signals (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) NOT NULL,
          stop_loss NUMERIC NOT NULL,
          target NUMERIC NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `)

        await query(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signals' AND column_name='entry_price') THEN
      ALTER TABLE signals ADD COLUMN entry_price NUMERIC;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='signals' AND column_name='price'
    ) THEN
      ALTER TABLE signals ADD COLUMN price NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signals' AND column_name='exit_price') THEN
      ALTER TABLE signals ADD COLUMN exit_price NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signals' AND column_name='status') THEN
      ALTER TABLE signals ADD COLUMN status VARCHAR(20);
    END IF;



    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signals' AND column_name='closed_at') THEN
      ALTER TABLE signals ADD COLUMN closed_at TIMESTAMP;
    END IF;
  END;
  $$;
`)


        await query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `)

        await query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_price CHECK (price > 0)
      );
    `)

        console.log('✅ Database tables created successfully')
    } catch (err) {
        console.error('❌ Error initializing database:', err)
        throw err
    }
}

module.exports = { initializeDatabase }