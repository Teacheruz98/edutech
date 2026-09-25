const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

const authMiddleware = (req, res, next) => {
    const raw = req.header('Authorization') || req.headers.authorization;
    const token = raw?.replace(/^Bearer\s+/i, '');
    if (!token) {
        return res.status(401).json({ message: "Avtorizatsiyadan o'ting" });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: "Token noto'g'ri" });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Faqat adminlar uchun" });
    }
    next();
};

const teacherOrAdmin = (req, res, next) => {
    if (!['teacher', 'admin', 'management'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
    }
    next();
};

const managementOrAdmin = (req, res, next) => {
    if (!['management', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Faqat Management va Admin uchun" });
    }
    next();
};

module.exports = { authMiddleware, adminOnly, teacherOrAdmin, managementOrAdmin, JWT_SECRET };
