const crypto = require('crypto');

// Generează un cod de 10 caractere (A-Z, 0-9)
function generateSingleCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generează 10 coduri unice
function generateRecoveryCodes() {
  const codes = [];
  const usedCodes = new Set();

  while (codes.length < 10) {
    const code = generateSingleCode();
    if (!usedCodes.has(code)) {
      codes.push(code);
      usedCodes.add(code);
    }
  }

  return codes;
}

function registerRecoveryRoutes(app, { getSqlPool, sql, protect, bcrypt }) {
  // ✅ Generate initial recovery codes (called during registration)
  app.post('/api/recovery/generate-initial', protect, async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const userId = req.user.id;

      // Șterge codurile vechi
      await sqlPool.query`
        DELETE FROM RecoveryCodes
        WHERE UserId = ${userId}
      `;

      // Generează coduri noi
      const codes = generateRecoveryCodes();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Expire în 10 ani

      // Salvează în BD
      for (const code of codes) {
        await sqlPool.query`
          INSERT INTO RecoveryCodes (UserId, Code, ExpiresAt)
          VALUES (${userId}, ${code}, ${expiresAt})
        `;
      }

      res.json({
        message: 'Coduri de recuperare generate cu succes!',
        codes, // Afișează doar la prima generare
        warning: 'Salvează aceste coduri în loc sigur!'
      });
    } catch (err) {
      console.error('❌ Error generating recovery codes:', err);
      res.status(500).json({ message: 'Eroare la generarea codurilor.' });
    }
  });

  // ✅ Verify recovery code (used on "Forgot Password" page)
  app.post('/api/recovery/verify', async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, cod și parolă sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();

      // Găsește utilizatorul după email
      const userResult = await sqlPool.query`
        SELECT id, email, passwordHash
        FROM Users
        WHERE email = ${email}
      `;

      if (userResult.recordset.length === 0) {
        return res.status(401).json({ message: 'Email nu găsit.' });
      }

      const user = userResult.recordset[0];

      // Verifică dacă codul este valid și nefolosit
      const codeResult = await sqlPool.query`
        SELECT Id, UserId, IsUsed, ExpiresAt
        FROM RecoveryCodes
        WHERE UserId = ${user.id} 
          AND Code = ${code.toUpperCase()}
          AND IsUsed = 0
          AND ExpiresAt > GETDATE()
      `;

      if (codeResult.recordset.length === 0) {
        return res.status(401).json({ message: 'Cod invalid, expirat sau deja folosit.' });
      }

      const codeRecord = codeResult.recordset[0];

      // Validate new password format (8+ chars, uppercase, lowercase, digit, special char)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message: 'Parola trebuie să aibă min. 8 caractere, o literă mare, o literă mică, o cifră și un caracter special.'
        });
      }

      // Hash parolă nouă
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Actualizează parola utilizatorului
      await sqlPool.query`
        UPDATE Users
        SET passwordHash = ${newPasswordHash}, updatedAt = GETDATE()
        WHERE id = ${user.id}
      `;

      // Marchează codul ca utilizat
      await sqlPool.query`
        UPDATE RecoveryCodes
        SET IsUsed = 1, UsedAt = GETDATE()
        WHERE Id = ${codeRecord.Id}
      `;

      res.json({
        message: 'Parolă resetată cu succes! Poți să te conectezi acum.'
      });
    } catch (err) {
      console.error('❌ Error verifying recovery code:', err);
      res.status(500).json({ message: 'Eroare server.' });
    }
  });

  // ✅ Get all recovery codes for user (for settings page)
  app.get('/api/recovery/codes', protect, async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const userId = req.user.id;

      const result = await sqlPool.query`
        SELECT 
          Id,
          Code,
          IsUsed,
          UsedAt,
          CreatedAt,
          ExpiresAt
        FROM RecoveryCodes
        WHERE UserId = ${userId}
        ORDER BY CreatedAt DESC
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching recovery codes:', err);
      res.status(500).json({ message: 'Eroare la preluarea codurilor.' });
    }
  });

  // ✅ Regenerate recovery codes (from settings)
  app.post('/api/recovery/regenerate', protect, async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const userId = req.user.id;

      // Șterge codurile vechi
      await sqlPool.query`
        DELETE FROM RecoveryCodes
        WHERE UserId = ${userId}
      `;

      // Generează coduri noi
      const codes = generateRecoveryCodes();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);

      // Salvează în BD
      for (const code of codes) {
        await sqlPool.query`
          INSERT INTO RecoveryCodes (UserId, Code, ExpiresAt)
          VALUES (${userId}, ${code}, ${expiresAt})
        `;
      }

      res.json({
        message: 'Coduri regenerate cu succes!',
        codes // Afișează codurile în UI
      });
    } catch (err) {
      console.error('❌ Error regenerating recovery codes:', err);
      res.status(500).json({ message: 'Eroare la regenerarea codurilor.' });
    }
  });

  // ✅ Count unused codes (for quick status)
  app.get('/api/recovery/status', protect, async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const userId = req.user.id;

      const result = await sqlPool.query`
        SELECT COUNT(*) as unusedCount
        FROM RecoveryCodes
        WHERE UserId = ${userId} AND IsUsed = 0
      `;

      res.json({
        unusedCount: result.recordset[0].unusedCount || 0
      });
    } catch (err) {
      console.error('❌ Error checking recovery status:', err);
      res.status(500).json({ message: 'Eroare la verificare.' });
    }
  });
}

module.exports = { registerRecoveryRoutes };
