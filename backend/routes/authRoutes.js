import express from 'express';
import { register, login, getMe, getUsers, toggleUserStatus } from '../controllers/authController.js';
import { protect, admin } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Dynamic register middleware to bootstrap the first Admin user without auth
const bootstrapRegister = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments({});
    if (userCount === 0) {
      next(); // No users exist, let user register without credentials
    } else {
      // Users exist, enforce protect and admin permissions
      protect(req, res, () => {
        admin(req, res, next);
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/register', bootstrapRegister, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, admin, getUsers);
router.put('/users/:id/toggle', protect, admin, toggleUserStatus);

export default router;
