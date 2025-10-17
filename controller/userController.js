const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, 'your_jwt_secret', { expiresIn: '7d' });
}

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    res.status(201).json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
