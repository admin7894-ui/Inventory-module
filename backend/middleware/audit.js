
const MOCK_USER = 'admin';

module.exports = (req, res, next) => {
  const user = req.user?.username || MOCK_USER;

  if (req.method === 'POST') {
    // Force created_by and updated_by for new records
    req.body.created_by = user;
    req.body.updated_by = user;
    req.body.created_at = new Date().toISOString();
    req.body.updated_at = new Date().toISOString();
  } else if (req.method === 'PUT') {
    // Force updated_by for updates and ensure created_by is NOT modified from frontend
    delete req.body.created_by;
    delete req.body.created_at;
    req.body.updated_by = user;
    req.body.updated_at = new Date().toISOString();
  }

  next();
};
