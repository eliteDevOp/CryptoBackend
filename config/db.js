// config/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in project root
const dbPath = path.join(__dirname, '..', 'crypto_data.db');

class Database {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.initPromise = this.initialize();
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('❌ Error opening SQLite database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables()
                        .then(() => {
                            this.isReady = true;
                            resolve();
                        })
                        .catch(reject);
                }
            });

            // Enable foreign keys and WAL mode for better performance
            this.db.run('PRAGMA foreign_keys = ON');
            this.db.run('PRAGMA journal_mode = WAL');
        });
    }

    async createTables() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                price REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = [
            'CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol)'
        ];

        return new Promise((resolve, reject) => {
            this.db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('❌ Error creating price_history table:', err);
                    reject(err);
                    return;
                }

                console.log('✅ Price history table ready');

                // Create all indexes
                let indexCount = 0;
                const totalIndexes = createIndexes.length;

                createIndexes.forEach((indexSQL, i) => {
                    this.db.run(indexSQL, (err) => {
                        if (err) {
                            console.error(`❌ Error creating index ${i + 1}:`, err);
                        }
                        
                        indexCount++;
                        if (indexCount === totalIndexes) {
                            console.log('✅ Database indexes ready');
                            resolve();
                        }
                    });
                });
            });
        });
    }

    async waitForReady() {
        if (!this.isReady) {
            await this.initPromise;
        }
    }

    async query(sql, params = []) {
        await this.waitForReady();

        return new Promise((resolve, reject) => {
            const trimmedSQL = sql.trim().toUpperCase();

            try {
                if (trimmedSQL.startsWith('SELECT') || trimmedSQL.startsWith('WITH')) {
                    // SELECT queries
                    this.db.all(sql, params, (err, rows) => {
                        if (err) {
                            console.error('❌ SQLite SELECT error:', err.message);
                            reject(err);
                        } else {
                            resolve({ rows: rows || [] });
                        }
                    });
                } else if (trimmedSQL.startsWith('INSERT')) {
                    // INSERT queries
                    this.db.run(sql, params, function(err) {
                        if (err) {
                            console.error('❌ SQLite INSERT error:', err.message);
                            reject(err);
                        } else {
                            resolve({
                                rows: [{
                                    id: this.lastID,
                                    changes: this.changes
                                }],
                                lastID: this.lastID,
                                changes: this.changes
                            });
                        }
                    });
                } else {
                    // UPDATE, DELETE, CREATE, etc.
                    this.db.run(sql, params, function(err) {
                        if (err) {
                            console.error('❌ SQLite RUN error:', err.message);
                            reject(err);
                        } else {
                            resolve({
                                rows: [],
                                changes: this.changes,
                                lastID: this.lastID
                            });
                        }
                    });
                }
            } catch (err) {
                console.error('❌ SQLite query exception:', err);
                reject(err);
            }
        });
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    this.isReady = false;
                    resolve();
                });
            });
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const result = await this.query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(DISTINCT symbol) as unique_symbols,
                    MIN(timestamp) as oldest_record,
                    MAX(timestamp) as newest_record
                FROM price_history
            `);
            return result.rows[0];
        } catch (err) {
            console.error('Error getting database stats:', err);
            return {
                total_records: 0,
                unique_symbols: 0,
                oldest_record: null,
                newest_record: null
            };
        }
    }

    // Clean old records (optional maintenance)
    async cleanOldData(daysToKeep = 30) {
        try {
            const result = await this.query(
                `DELETE FROM price_history 
                 WHERE datetime(timestamp) < datetime('now', '-${daysToKeep} days')`
            );
            if (result.changes > 0) {
                console.log(`🧹 Cleaned ${result.changes} old records`);
            }
            return result.changes;
        } catch (err) {
            console.error('Error cleaning old data:', err);
            return 0;
        }
    }
}

// Create singleton database instance
const database = new Database();

// Export methods
module.exports = {
    query: (sql, params) => database.query(sql, params),
    close: () => database.close(),
    getStats: () => database.getStats(),
    cleanOldData: (days) => database.cleanOldData(days)
};