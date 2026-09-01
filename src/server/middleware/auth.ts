import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Role } from '../../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'karizma_center_stable_jwt_secret_key_2026';

export class TokenService {
  static sign(payload: { id: string; username: string; role: string }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24h
    const claims = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${claims}`)
      .digest('base64url');

    return `${header}.${claims}.${signature}`;
  }

  static verify(token: string): { id: string; username: string; role: Role } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, claims, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${claims}`)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'));
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: Role;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'دسترسی غیرمجاز. لطفاً وارد حساب کاربری خود شوید.' });
  }

  const user = TokenService.verify(token);
  if (!user) {
    return res.status(401).json({ code: 'AUTH_EXPIRED', error: 'نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد حساب کاربری خود شوید.' });
  }

  req.user = user;
  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ code: 'ROLE_FORBIDDEN', error: 'شما سطح دسترسی لازم برای انجام این عملیات را ندارید.' });
    }
    next();
  };
}
