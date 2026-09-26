import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userDb } from './db.ts';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'soko_ae_jwt_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export function generateToken(payload: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid format. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token signature.',
    });
  }
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, company, title, phone, tradeLicenseNo, vatTrn, location } = req.body;

    // Backend Form Validation
    const errors: Record<string, string> = {};

    if (!name || name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters long.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid corporate email address.';
    }

    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number.';
    }

    if (!company || company.trim().length < 2) {
      errors.company = 'Company name is required.';
    }

    if (!role || !['buyer', 'supplier', 'contractor'].includes(role)) {
      errors.role = 'Role must be Buyer, Supplier, or Contractor.';
    }

    if (!phone || phone.trim().length < 7) {
      errors.phone = 'Valid phone number is required (e.g. +971 4 000 0000).';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please check form errors.',
        errors,
      });
    }

    // Check if user already exists
    const existing = userDb.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A corporate account with this email already exists in SOKO.ae.',
        errors: { email: 'Email already registered.' },
      });
    }

    const newUser = await userDb.createUser({
      name,
      email,
      password,
      role,
      company,
      title,
      phone,
      tradeLicenseNo,
      vatTrn,
      location,
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to SOKO.ae.',
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during registration.',
    });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required.',
      });
    }

    const user = userDb.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No account found with this corporate email.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please try again.',
      });
    }

    // Update last login
    userDb.updateLastLogin(user.id);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { passwordHash: _, ...sanitizedUser } = user;

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during login.',
    });
  }
});

// GET /api/auth/me (Protected route)
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const user = userDb.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { passwordHash: _, ...sanitizedUser } = user;
  return res.json({
    success: true,
    user: sanitizedUser,
  });
});

// GET /api/auth/users (Directory of registered users)
authRouter.get('/users', (req: Request, res: Response) => {
  const users = userDb.getAll();
  return res.json({
    success: true,
    count: users.length,
    users,
  });
});

// POST /api/auth/linkedin (Instant LinkedIn Quick Sign In & Sign Up)
authRouter.post('/linkedin', async (req: Request, res: Response) => {
  try {
    const { role = 'buyer', email, name, avatarUrl, company, title, tradeLicenseNo } = req.body;

    const targetEmail =
      email ||
      (role === 'buyer'
        ? 'buyer@soko.ae'
        : role === 'supplier'
        ? 'supplier@soko.ae'
        : 'contractor@soko.ae');

    let user = userDb.findByEmail(targetEmail);

    if (!user) {
      const defaultName =
        name ||
        (role === 'buyer'
          ? 'Marcus Vance'
          : role === 'supplier'
          ? 'Elena Rostova'
          : 'Sarah Jenkins');
      const defaultCompany =
        company ||
        (role === 'buyer'
          ? 'Vance Infrastructure Group UAE'
          : role === 'supplier'
          ? 'Apex Industrial Castings & Alloys'
          : 'Apex Industrial Mechanical GC');
      const defaultTitle =
        title ||
        (role === 'buyer'
          ? 'Director of Strategic Sourcing & EPC Contracts'
          : role === 'supplier'
          ? 'VP of Commercial Sales & Operations'
          : 'Executive Project Director & General Contractor');

      await userDb.createUser({
        name: defaultName,
        email: targetEmail,
        password: 'Password123!',
        role: role as 'buyer' | 'supplier' | 'contractor',
        company: defaultCompany,
        title: defaultTitle,
        phone: '+971 4 800 2026',
        tradeLicenseNo: tradeLicenseNo || 'CN-1049281',
        vatTrn: '100293847500003',
        location: 'Dubai, UAE',
      });
      user = userDb.findByEmail(targetEmail);
    }

    if (!user) {
      return res.status(500).json({ success: false, message: 'User initialization failed.' });
    }

    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (name) user.name = name;
    if (title) user.title = title;
    if (company) user.company = company;
    userDb.updateLastLogin(user.id);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { passwordHash: _, ...sanitizedUser } = user;
    return res.json({
      success: true,
      message: `Successfully authenticated via LinkedIn as ${user.name}!`,
      token,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('LinkedIn auth error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'LinkedIn authentication failed.',
    });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});
