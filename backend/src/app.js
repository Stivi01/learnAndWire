const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
    user: 'db_user',
    password: 'Licenta20252026',
    server: 'NTZ\\SQLEXPRESS',
    database: 'LAW',
    options: { trustServerCertificate: true }
};

const JWT_SECRET = '2121212121212121212';

let sqlPool;

async function connectDb() {
    try {
        sqlPool = new sql.ConnectionPool(config);
        await sqlPool.connect();
        console.log('✅ Connected to MSSQL Database: LAW');
    } catch (err) {
        console.error('❌ DB connection error:', err);
        process.exit(1);
    }
}

// ------------------------------
// UTILS
// ------------------------------
function getRoleFromEmail(email) {
    const lower = email.toLowerCase();
    if (lower.endsWith('@etti.upb.ro')) return 'Profesor';
    if (lower.endsWith('@stud.etti.upb.ro')) return 'Student';
    return 'Student';
}

// ------------------------------
// MIDDLEWARE AUTH
// ------------------------------
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

        const result = await sqlPool.query`
            SELECT id, email, role
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
        return res.status(403).json({ message: `Acces interzis. Ai nevoie de rolul ${role}.` });
    }
    next();
};

// ------------------------------
// REGISTER
// ------------------------------
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: 'Email și parolă obligatorii.' });

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const role = getRoleFromEmail(email);

        const result = await sqlPool.query`
            INSERT INTO Users (email, passwordHash, role)
            OUTPUT INSERTED.id, INSERTED.email, INSERTED.role
            VALUES (${email}, ${passwordHash}, ${role})
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
        if (err.number === 2627)
            return res.status(409).json({ message: 'Email deja înregistrat.' });

        res.status(500).json({ message: 'Eroare server la înregistrare.' });
    }
});

// ------------------------------
// LOGIN
// ------------------------------
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await sqlPool.query`
            SELECT id, email, passwordHash, role
            FROM Users
            WHERE email = ${email}
        `;

        if (result.recordset.length === 0)
            return res.status(401).json({ message: 'Email sau parolă greșite.' });

        const user = result.recordset[0];

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ message: 'Email sau parolă greșite.' });

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
                role: user.role
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare server la autentificare.' });
    }
});

// ------------------------------
// RUTA TEST PROTEJATĂ
// ------------------------------
app.get('/api/protected', protect, (req, res) => {
    res.json({
        message: 'Acces permis!',
        user: req.user
    });
});

const PORT = process.env.PORT || 3000;
connectDb().then(() => {
    app.listen(PORT, () =>
        console.log(`Server pornit pe http://localhost:${PORT}`)
    );
});
