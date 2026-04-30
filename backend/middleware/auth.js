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
    req.user.bg_id = req.headers['x-bg-id'] || req.query.bg_id || req.user.bg_id;
    req.user.company_id = req.headers['x-company-id'] || req.query.COMPANY_id || req.query.company_id || req.user.company_id;
    req.user.business_type_id = req.headers['x-business-type-id'] || req.query.business_type_id || req.user.business_type_id;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
