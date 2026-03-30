const sql = require('mssql');

const config = {
  user: 'db_user',
  password: 'Licenta20252026',
  server: 'NTZ\\SQLEXPRESS',
  database: 'LAW',
  options: { trustServerCertificate: true }
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
