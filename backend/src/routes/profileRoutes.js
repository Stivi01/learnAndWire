const multer = require('multer');
const path = require('path');

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `user_${req.user.id}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

function registerProfileRoutes(app, { getSqlPool, protect }) {
  app.get('/api/profile', protect, async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT id, email, role, firstName, lastName, phone, address, academicYear, avatar, updatedAt, lastLogin
        FROM Users
        WHERE id = ${req.user.id}
      `;

      const profile = result.recordset[0];

      if (!profile.avatar) {
        profile.avatar = 'assets/avatar-default.png';
      }

      if (profile.academicYear === -1 || profile.academicYear === null) {
        profile.academicYear = '-';
      }

      res.json(profile);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare server la încărcarea profilului.' });
    }
  });

  app.put('/api/profile', protect, async (req, res) => {
    const { firstName, lastName, phone, address, academicYear } = req.body;

    const parsedAcademicYear = academicYear === '-' ? -1 : (Number.isNaN(Number(academicYear)) ? null : Number(academicYear));

    try {
      const sqlPool = getSqlPool();
      await sqlPool.query`
        UPDATE Users
        SET 
          firstName = ${firstName},
          lastName = ${lastName},
          phone = ${phone},
          address = ${address},
          academicYear = ${parsedAcademicYear},
          updatedAt = GETDATE()
        WHERE id = ${req.user.id}
      `;

      res.json({ message: 'Profil actualizat cu succes!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare server la actualizarea profilului.' });
    }
  });

  app.post('/api/profile/avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const avatarPath = req.file
        ? path.posix.join('uploads/avatars', req.file.filename)
        : null;

      await sqlPool.query`
        UPDATE Users
        SET avatar = ${avatarPath}, updatedAt = GETDATE()
        WHERE id = ${req.user.id}
      `;

      res.json({
        message: 'Avatar actualizat!',
        avatar: avatarPath
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare server la upload avatar.' });
    }
  });
}

module.exports = { registerProfileRoutes };
