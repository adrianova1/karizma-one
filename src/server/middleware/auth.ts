import { Request, Response, NextFunction } from 'express';
import { Role } from '../../types.js';
import { TokenService, TokenPayload } from '../services/token.service.js';

export { TokenService };

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
