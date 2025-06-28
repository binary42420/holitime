import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db';
import type { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser extends User {
  password?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'Employee' | 'Crew Chief' | 'Manager/Admin' | 'Client';
  clientId?: string;
}

// Verify password using bcrypt
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      name: '', // Will be filled from database
      avatar: '', // Will be filled from database
      role: decoded.role,
      clientId: decoded.clientId,
    };
  } catch (error) {
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const result = await query(
      'SELECT id, email, password_hash, name, role, avatar, is_active FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password_hash,
      name: row.name,
      role: row.role,
      avatar: row.avatar || '',
      clientId: row.role === 'Client' ? row.id : null,
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await query(
      'SELECT id, email, name, role, avatar FROM users WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      avatar: row.avatar || '',
      clientId: row.role === 'Client' ? row.id : null,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Create new user
export async function createUser(userData: RegisterData): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, avatar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, avatar`,
      [
        userData.email,
        hashedPassword,
        userData.name,
        userData.role,
        `https://i.pravatar.cc/32?u=${userData.email}`
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      avatar: row.avatar,
      clientId: row.role === 'Client' ? row.id : null,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

// Authenticate user
export async function authenticateUser(credentials: LoginCredentials): Promise<{ user: User; token: string } | null> {
  try {
    const authUser = await getUserByEmail(credentials.email);
    if (!authUser || !authUser.password) {
      return null;
    }

    const isValidPassword = await verifyPassword(credentials.password, authUser.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [authUser.id]
    );

    // Remove password from user object
    const { password, ...user } = authUser;
    const token = generateToken(user);

    return { user, token };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// Refresh user data (for token refresh)
export async function refreshUserData(userId: string): Promise<User | null> {
  return await getUserById(userId);
}
