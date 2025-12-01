// server.js - Server Express pentru conectarea la MSSQL si expunerea rutelor API

const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');
const cors = require('cors'); // Pentru a permite cereri de la Angular (frontend)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite cereri cross-origin (de la Angular)
app.use(express.json()); // Permite parcurgerea JSON in body-ul cererilor

// Configurarea Conexiunii SQL Server (bazata pe succesul tau cu SQL Auth)
const dbConfig = {
    server: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_DATABASE, 

    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 

    driver: 'tedious', 

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000 
    },

    options: {
        trustedConnection: false, 
        requestTimeout: 30000, 
        encrypt: true, 
        trustServerCertificate: true, 
    },
};

// Obiect global pentru pool-ul de conexiuni
let sqlPool;

/**
 * Functie pentru initializarea Pool-ului de Conexiuni
 */
async function initializeDatabase() {
    try {
        console.log(`[DB] Încerc conectarea la baza de date: ${dbConfig.database} pe serverul: ${dbConfig.server}`);
        
        sqlPool = new sql.ConnectionPool(dbConfig);
        await sqlPool.connect();
        
        console.log('✅ [DB] Conexiune la SQL Server realizată cu succes. Pool disponibil.');

    } catch (err) {
        console.error('❌ [DB] EROARE FATALĂ LA INITIALIZAREA BAZEI DE DATE:', err.message);
        // Oprim serverul daca nu ne putem conecta la baza de date
        process.exit(1);
    }
}

// ----------------------------------------------------
// RUTĂ DE TEST (FĂRĂ TABELE)
// ----------------------------------------------------

/**
 * Functie pentru a rula o interogare simpla de sistem (fara a necesita tabele utilizator)
 * si a returna date mock daca esueaza.
 */
app.get('/api/data/mock', async (req, res) => {
    try {
        const request = sqlPool.request();
        
        // Interogare de sistem: Returneaza versiunea SQL Server. 
        // Aceasta nu necesita nicio tabela de utilizator.
        const result = await request.query("SELECT 'Server Conectat' AS status, @@VERSION AS version");

        const data = result.recordset.map(row => ({
            id: 1,
            name: row.status,
            details: row.version.substring(0, 50) + '...',
            source: 'SQL Server Query'
        }));

        res.json({
            message: "Datele au fost preluate din SQL Server (Versiune Server).",
            data: data
        });

    } catch (error) {
        console.error('❌ Eroare la interogarea bazei de date, se returnează date mock:', error.message);
        
        // Daca interogarea esueaza, returnam date mock (false)
        const mockData = [
            { id: 1, name: 'Date Mock 1', details: 'Nu exista tabele in baza de date.', source: 'Mock Data' },
            { id: 2, name: 'Date Mock 2', details: 'Trebuie creata o structura de date.', source: 'Mock Data' }
        ];

        res.json({
            message: "Conexiunea la server este OK, dar nu s-au putut prelua date; se returnează date mock.",
            data: mockData
        });
    }
});

// ----------------------------------------------------
// PORNIREA SERVERULUI
// ----------------------------------------------------

// Pornim serverul doar dupa ce baza de date a fost initializata
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎉 Serverul Express rulează pe http://localhost:${PORT}`);
        console.log(`[API] Endpoint de test: http://localhost:${PORT}/api/data/mock`);
    });
});

// Gestionarea inchiderii serverului
process.on('SIGINT', async () => {
    console.log('\n[SERVER] Serverul se închide...');
    if (sqlPool) {
        await sqlPool.close();
        console.log('[DB] Pool-ul de conexiuni închis.');
    }
    process.exit(0);
});