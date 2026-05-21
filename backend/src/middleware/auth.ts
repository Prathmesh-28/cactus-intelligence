import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, JwtPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '24h';
const JWT_LONG_EXPIRY = '7d';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, rememberMe = false): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: rememberMe ? JWT_LONG_EXPIRY : JWT_EXPIRY });
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Unauthenticated' }); return; }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireAnalyst = requireRole('admin', 'analyst');
