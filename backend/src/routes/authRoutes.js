// Generate 10 random recovery codes
function generateRecoveryCodes() {
  const codes = [];
  const usedCodes = new Set();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  while (codes.length < 10) {
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!usedCodes.has(code)) {
      codes.push(code);
      usedCodes.add(code);
    }
  }
  return codes;
}

function getRoleFromEmail(email) {
  const lower = email.toLowerCase();

  if (lower.endsWith('@etti.upb.ro')) return 'Profesor';
  if (lower.endsWith('@stud.etti.upb.ro')) return 'Student';

  return 'Student';
}

function registerAuthRoutes(app, { getSqlPool, bcrypt, jwt, JWT_SECRET, protect }) {
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

      // ✅ Generate recovery codes for new user
      const codes = generateRecoveryCodes();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);

      for (const code of codes) {
        await sqlPool.query`
          INSERT INTO RecoveryCodes (UserId, Code, ExpiresAt)
          VALUES (${newUser.id}, ${code}, ${expiresAt})
        `;
      }

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({
        message: 'Cont creat cu succes!',
        token,
        user: newUser,
        recoveryCodes: codes, // ✅ Return recovery codes to display during registration
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

      // Actualizează ultima logare
      await sqlPool.query`
        UPDATE Users
        SET lastLogin = GETDATE()
        WHERE id = ${user.id}
      `;

      // Preia din nou pentru a obține valoarea exactă a lastLogin
      const userResult = await sqlPool.query`
        SELECT id, email, role, firstName, lastName, avatar, lastLogin
        FROM Users
        WHERE id = ${user.id}
      `;
      const userWithLastLogin = userResult.recordset[0];

      res.json({
        message: 'Autentificare reușită!',
        token,
        user: {
          id: userWithLastLogin.id,
          email: userWithLastLogin.email,
          role: userWithLastLogin.role,
          firstName: userWithLastLogin.firstName,
          lastName: userWithLastLogin.lastName,
          avatar: userWithLastLogin.avatar,
          lastLogin: userWithLastLogin.lastLogin
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare server la autentificare.' });
    }
  });

  // ✅ Change password (authenticated route)
  app.post('/api/auth/change-password', protect, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Parola veche și parolă nouă sunt obligatorii.' });
    }

    // Validate new password format (8+ chars, uppercase, lowercase, digit, special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Parola trebuie să aibă min. 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.'
      });
    }

    try {
      const sqlPool = getSqlPool();
      const userId = req.user.id;

      // Get current password hash
      const userResult = await sqlPool.query`
        SELECT id, passwordHash
        FROM Users
        WHERE id = ${userId}
      `;

      if (userResult.recordset.length === 0) {
        return res.status(401).json({ message: 'Utilizator nu găsit.' });
      }

      const user = userResult.recordset[0];

      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: 'Parola veche este incorectă.' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await sqlPool.query`
        UPDATE Users
        SET passwordHash = ${newPasswordHash}, updatedAt = GETDATE()
        WHERE id = ${userId}
      `;

      res.json({
        message: 'Parolă schimbată cu succes!'
      });
    } catch (err) {
      console.error('❌ Error changing password:', err);
      res.status(500).json({ message: 'Eroare server la schimbarea parolei.' });
    }
  });
}

module.exports = { registerAuthRoutes };
