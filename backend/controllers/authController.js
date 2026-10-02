import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'local_retail_pos_secret_key_2026_super_secure_offline_app', {
    expiresIn: '30d'
  });
};

// Seed default admin if missing
export const seedDefaultAdmin = async () => {
  try {
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('[Auth]: Creating default admin user (admin / admin123)...');
      await User.create({
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      console.log('[Auth]: Default admin created successfully.');
    }
  } catch (err) {
    console.error('[Auth Seed Error]:', err.message);
  }
};

// @desc    Get auth status & system user availability
// @route   GET /api/auth/status
// @access  Public
export const getAuthStatus = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      return res.json({
        success: true,
        dbConnected: false,
        userCount: 0,
        hasAdmin: false,
        users: []
      });
    }

    const users = await User.find({}, 'name username role isActive');
    const hasAdmin = users.some(u => u.role === 'admin' && u.isActive);

    res.json({
      success: true,
      dbConnected: true,
      userCount: users.length,
      hasAdmin,
      users: users.map(u => ({
        name: u.name,
        username: u.username,
        role: u.role,
        isActive: u.isActive
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Emergency reset / ensure default admin account
// @route   POST /api/auth/reset-admin
// @access  Public (Emergency POS Recovery)
export const resetAdminPassword = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      return res.status(503).json({ success: false, message: 'Database not connected. Ensure MongoDB is running.' });
    }

    let adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      adminUser.password = 'admin123';
      adminUser.isActive = true;
      adminUser.role = 'admin';
      await adminUser.save();
    } else {
      adminUser = await User.create({
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
    }

    res.json({
      success: true,
      message: 'Admin credentials reset successfully! Use username "admin" and password "admin123".',
      data: {
        username: 'admin',
        defaultPassword: 'admin123'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new user (bootstrap or admin only)
// @route   POST /api/auth/register
// @access  Public (if first user) / Admin
export const register = async (req, res) => {
  let { name, username, password, role } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    username = username.trim().toLowerCase();

    const userCount = await User.countDocuments({});

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // First user is automatically admin
    const finalRole = userCount === 0 ? 'admin' : (role || 'staff');

    const user = await User.create({
      name: name || username,
      username,
      password,
      role: finalRole
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  let { username, password } = req.body;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected. Please ensure MongoDB is running.'
      });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both username and password' });
    }

    username = username.trim().toLowerCase();
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `Account "${username}" not found. Check available accounts or initialize default admin.`
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again or use Admin Reset.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact your administrator.'
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle user active status
// @route   PUT /api/auth/users/:id/toggle
// @access  Private/Admin
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff/user details
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  const { name, username, role, password, isActive } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (username && username.trim().toLowerCase() !== user.username) {
      const trimmedUsername = username.trim().toLowerCase();
      const userExists = await User.findOne({ username: trimmedUsername });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
      user.username = trimmedUsername;
    }

    if (name) user.name = name.trim();
    if (role && ['admin', 'staff'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = password.trim();
    }

    const updatedUser = await user.save();
    res.json({
      success: true,
      message: 'Staff account updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

