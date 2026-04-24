const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../data/db');
const JWT_SECRET = process.env.JWT_SECRET || 'erp_secret_2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success:false, message:'username and password required' });
  const user = (db.security_roles||[]).find(u => u.user_name === username);
  if (!user) return res.status(401).json({ success:false, message:'Invalid credentials' });
  if (user.password !== password) return res.status(401).json({ success:false, message:'Invalid credentials' });
  const access = (db.table_access||[]).filter(a => a.security_roles_id === user.security_roles_id);
  const token = jwt.sign({
    userId: user.security_roles_id,
    username: user.user_name,
    company_id: user.COMPANY_id,
    business_type_id: user.business_type_id,
    bg_id: user.bg_id,
    role_id: user.role_id,
  }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success:true, token, user:{ id:user.security_roles_id, username:user.user_name, company_id:user.COMPANY_id, business_type_id:user.business_type_id, bg_id:user.bg_id, access } });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success:false, message:'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json({ success:true, user:decoded });
  } catch { res.status(401).json({ success:false, message:'Invalid token' }); }
});

module.exports = router;
