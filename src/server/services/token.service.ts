/**
 * Karizma Center Unified Token Service
 * Cryptographically secure JWT implementation with HMAC-SHA256 and comprehensive validation
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Role } from '../../types.js';

// Resolve JWT secret: prefer process.env.JWT_SECRET.
// If not provided in environment, persist a high-entropy secret to data/.jwt_secret
// so that server reboots / PM2 restarts do not invalidate existing client sessions and tokens.
const DATA_DIR = path.join(process.cwd(), 'data');
const secretFile = path.join(DATA_DIR, '.jwt_secret');

let resolvedSecret = (process.env.JWT_SECRET || '').trim();
if (!resolvedSecret) {
  try {
    if (fs.existsSync(secretFile)) {
      const fileSecret = fs.readFileSync(secretFile, 'utf8').trim();
      if (fileSecret.length >= 16) {
        resolvedSecret = fileSecret;
      }
    }
  } catch (e) {
    // ignore read error
  }
}

if (!resolvedSecret) {
  resolvedSecret = 'karizma_center_secret_key_' + crypto.randomBytes(32).toString('hex');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(secretFile, resolvedSecret, 'utf8');
  } catch (e) {
    // fallback in-memory
  }
}

const JWT_SECRET: string = resolvedSecret;

export interface TokenPayload {
  id: string;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export class TokenService {
  /**
   * Signs a payload into a secure HMAC-SHA256 JWT string
   */
  static sign(payload: { id: string; username: string; role: Role | string }, expiresInSeconds: number = 30 * 24 * 60 * 60): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    
    // Normalize role case-insensitively
    const rawRole = String(payload.role || '').toLowerCase().trim();
    let validRole: Role = Role.USER;
    if (rawRole === 'admin') {
      validRole = Role.ADMIN;
    } else if (rawRole === 'moderator') {
      validRole = Role.MODERATOR;
    }
    
    const claims: TokenPayload = {
      id: String(payload.id),
      username: String(payload.username),
      role: validRole,
      iat: now,
      exp: now + expiresInSeconds
    };

    const claimsEncoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${claimsEncoded}`)
      .digest('base64url');

    return `${header}.${claimsEncoded}.${signature}`;
  }

  /**
   * Verifies and validates a JWT string.
   * Performs signature verification, expiration check, role enum check, and payload structure validation.
   */
  static verify(token: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [headerB64, claimsB64, signatureB64] = parts;

      // 1. Verify algorithm in header
      const headerStr = Buffer.from(headerB64, 'base64url').toString('utf8');
      const header = JSON.parse(headerStr);
      if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
        return null;
      }

      // 2. Cryptographic signature check in constant time
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${headerB64}.${claimsB64}`)
        .digest('base64url');

      const expectedBuf = Buffer.from(expectedSignature);
      const actualBuf = Buffer.from(signatureB64);
      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return null;
      }

      // 3. Claims and expiration check
      const claimsStr = Buffer.from(claimsB64, 'base64url').toString('utf8');
      const payload: TokenPayload = JSON.parse(claimsStr);

      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < now) {
        return null; // Expired
      }

      if (!payload.id || !payload.username || !payload.role) {
        return null; // Missing mandatory claims
      }

      // 4. Validate and normalize role against standard Role enum (case-insensitive)
      const rawRole = String(payload.role || '').toLowerCase().trim();
      if (rawRole === 'admin') {
        payload.role = Role.ADMIN;
      } else if (rawRole === 'moderator') {
        payload.role = Role.MODERATOR;
      } else if (rawRole === 'user') {
        payload.role = Role.USER;
      } else {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
