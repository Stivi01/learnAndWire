function getRoleFromEmail(email) {
  const lower = email.toLowerCase();

  if (lower.endsWith('@etti.upb.ro')) return 'Profesor';
  if (lower.endsWith('@stud.etti.upb.ro')) return 'Student';

  return 'Student';
}

function registerAuthRoutes(app, { getSqlPool, bcrypt, jwt, JWT_SECRET }) {
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Toate câmpurile sunt obligatorii' });
    }

    try {
      const sqlPool = getSqlPool();
      const passwordHash = await bcrypt.hash(password, 10);
      const role = getRoleFromEmail(email);

      const academicYearValue = role === 'Profesor' ? -1 : 1;
      const result = await sqlPool.query`
        INSERT INTO Users (email, passwordHash, role, firstName, lastName, academicYear)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.role, INSERTED.firstName, INSERTED.lastName, INSERTED.academicYear
        VALUES (${email}, ${passwordHash}, ${role}, ${firstName}, ${lastName}, ${academicYearValue})
      `;

      const newUser = result.recordset[0];
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({
        message: 'Cont creat cu succes!',
        token,
        user: newUser
      });
    } catch (err) {
      console.error(err);

      if (err.number === 2627) {
        return res.status(409).json({ message: 'Email deja înregistrat.' });
      }

      res.status(500).json({ message: 'Eroare server la înregistrare.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT id, email, passwordHash, role, firstName, lastName, avatar
        FROM Users
        WHERE email = ${email}
      `;

      if (result.recordset.length === 0) {
        return res.status(401).json({ message: 'Email sau parolă greșite.' });
      }

      const user = result.recordset[0];
      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        return res.status(401).json({ message: 'Email sau parolă greșite.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        message: 'Autentificare reușită!',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare server la autentificare.' });
    }
  });
}

module.exports = { registerAuthRoutes };
