const jwt = require('jsonwebtoken');

function createAuthMiddleware({ getSqlPool, JWT_SECRET }) {
  const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Token lipsă sau invalid.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const sqlPool = getSqlPool();

      const result = await sqlPool.query`
        SELECT id, email, role, firstName, lastName
        FROM Users
        WHERE id = ${decoded.id}
      `;

      if (result.recordset.length === 0) {
        return res.status(401).json({ message: 'Utilizatorul nu există.' });
      }

      req.user = result.recordset[0];
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token invalid.' });
    }
  };

  const restrictTo = (role) => (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        message: `Acces interzis. Ai nevoie de rolul ${role}.`
      });
    }

    next();
  };

  return { protect, restrictTo };
}

module.exports = { createAuthMiddleware };
