import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'qianshao-ai-secret-key-2025';

export interface TokenPayload {
  userId: string;
  phone: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function authenticate(request: Request): TokenPayload | null {
  const authHeader = request.headers.get('Authorization');
  const token = extractToken(authHeader);
  if (!token) return null;
  return verifyToken(token);
}
