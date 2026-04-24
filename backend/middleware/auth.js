const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'erp_secret_2024';

// Public routes that don't need auth
const PUBLIC = ['/api/auth/login', '/api/health'];

module.exports = (req, res, next) => {
  if (PUBLIC.some(p => req.path.startsWith(p))) return next();

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization required' });
  }
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
