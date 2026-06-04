const sql = require('mssql');


const config = {
  user: 'db_user', 
  password: 'Lavinia19!',
  server: '127.0.0.1', // Folosim IP-ul direct pentru a evita orice eroare de nume
  database: 'LAW',
  options: {
    instanceName: 'SQLEXPRESS03', // Foarte important: Numele instanței tale noi
    trustServerCertificate: true,
    encrypt: false,               // Dezactivează SSL-ul care dădea eroare
    enableArithAbort: true
  },
  port: 1433
};

let sqlPool;

async function connectDb() {
  sqlPool = new sql.ConnectionPool(config);
  await sqlPool.connect();
  console.log('✅ Connected to MSSQL Database: LAW');
  return sqlPool;
}

function getSqlPool() {
  if (!sqlPool) {
    throw new Error('Database connection has not been initialized yet.');
  }

  return sqlPool;
}

module.exports = {
  sql,
  connectDb,
  getSqlPool
};
