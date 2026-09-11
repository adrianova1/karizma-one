import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service.js';
import { Role } from '../../types.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role | string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'توکن ورود ارسال نشده است.', code: 'TOKEN_MISSING' });
  }

  const decoded = TokenService.verify(token);
  if (!decoded) {
    return res.status(401).json({ error: 'توکن ورود نامعتبر یا منقضی شده است.', code: 'TOKEN_INVALID' });
  }

  req.user = decoded as AuthenticatedUser;
  next();
}

export function requireRole(roles: (Role | string)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'کاربر احراز هویت نشده است.', code: 'UNAUTHORIZED' });
    }

    const userRole = String(user.role || '').toLowerCase().trim();
    const allowedRoles = roles.map(r => String(r).toLowerCase().trim());

    // Admin role universally satisfies any required role check
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: 'شما سطح دسترسی مناسب برای انجام این کار را ندارید.', code: 'FORBIDDEN' });
  };
}
