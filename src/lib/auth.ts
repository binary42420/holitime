import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';
import type { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser extends User {
  password_hash?: string;
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

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
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
      'SELECT id, email, password_hash, name, role, avatar, client_id, is_active FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      role: row.role,
      avatar: row.avatar || '',
      clientId: row.client_id,
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
      'SELECT id, email, name, role, avatar, client_id FROM users WHERE id = $1 AND is_active = true',
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
      clientId: row.client_id,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Create new user
export async function createUser(userData: RegisterData): Promise<User | null> {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, client_id, avatar) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, role, avatar, client_id`,
      [
        userData.email,
        hashedPassword,
        userData.name,
        userData.role,
        userData.clientId || null,
        `https://i.pravatar.cc/32?u=${userData.email}` // Generate avatar URL
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
      clientId: row.client_id,
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
    if (!authUser || !authUser.password_hash) {
      return null;
    }
    
    const isValidPassword = await verifyPassword(credentials.password, authUser.password_hash);
    if (!isValidPassword) {
      return null;
    }
    
    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [authUser.id]
    );
    
    // Remove password hash from user object
    const { password_hash, ...user } = authUser;
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
