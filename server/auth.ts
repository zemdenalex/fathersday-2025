import { Request, Response, NextFunction } from 'express';
import { getDb } from './db.js';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AuthRequest extends Request {
  sessionToken?: string;
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired sessions
 */
function cleanExpiredSessions(db: any): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP').run();
}

/**
 * Create a new session
 */
export function createSession(): string {
  const db = getDb();
  
  try {
    cleanExpiredSessions(db);
    
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    
    db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').run(
      token,
      expiresAt
    );
    
    return token;
  } finally {
    db.close();
  }
}

/**
 * Validate a session token
 */
export function validateSession(token: string): boolean {
  const db = getDb();
  
  try {
    cleanExpiredSessions(db);
    
    const session = db
      .prepare('SELECT id FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP')
      .get(token);
    
    return !!session;
  } finally {
    db.close();
  }
}

/**
 * Delete a session
 */
export function deleteSession(token: string): void {
  const db = getDb();
  
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } finally {
    db.close();
  }
}

/**
 * Verify admin password
 */
export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Middleware to protect admin routes
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.session;
  
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (!validateSession(token)) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  
  req.sessionToken = token;
  next();
}

/**
 * Login endpoint handler
 */
export function handleLogin(req: Request, res: Response): void {
  const { password } = req.body;
  
  if (!password || !verifyPassword(password)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  
  const token = createSession();
  
  // Set cookie
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_MS,
  });
  
  res.json({ token, expiresIn: SESSION_DURATION_MS });
}

/**
 * Logout endpoint handler
 */
export function handleLogout(req: AuthRequest, res: Response): void {
  const token = req.sessionToken || req.cookies?.session;
  
  if (token) {
    deleteSession(token);
  }
  
  res.clearCookie('session');
  res.json({ success: true });
}

export default {
  requireAuth,
  handleLogin,
  handleLogout,
  createSession,
  validateSession,
  deleteSession,
  verifyPassword,
};
