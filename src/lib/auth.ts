import { NextRequest, NextResponse } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '48h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getRefreshTokenSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
  }
  return secret;
}

// 用户JWT Payload类型
export interface UserJWTPayload {
  userId: number;
  id?: number;
  name?: string;
  phone?: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// 生成访问Token
export function generateAccessToken(payload: Omit<UserJWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] });
}

// 生成刷新Token
export function generateRefreshToken(payload: Omit<UserJWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getRefreshTokenSecret(), { expiresIn: JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] });
}

// 验证Token
export function verifyToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as UserJWTPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, getRefreshTokenSecret()) as UserJWTPayload;
  } catch (error) {
    return null;
  }
}

// 从请求头中提取Token
export function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

// 从Cookie中提取Token
export function extractTokenFromCookie(request: NextRequest): string | null {
  const token = request.cookies.get('access_token')?.value;
  return token || null;
}

// 获取当前用户信息
export function getCurrentUser(request: NextRequest): UserJWTPayload | null {
  // 优先从Header获取
  let token = extractTokenFromHeader(request);
  
  // 如果没有，从Cookie获取
  if (!token) {
    token = extractTokenFromCookie(request);
  }
  
  if (!token) return null;
  
  return verifyToken(token);
}

// 验证用户是否登录
export function requireAuth(request: NextRequest): { user: UserJWTPayload; response: null } | { user: null; response: NextResponse } {
  const token = extractTokenFromHeader(request) || extractTokenFromCookie(request);

  if (!token) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'AUTH_TOKEN_MISSING', message: 'Unauthorized - Please login' },
        { status: 401 }
      )
    };
  }

  const user = verifyToken(token);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'AUTH_TOKEN_INVALID', message: 'Unauthorized - Token invalid or expired' },
        { status: 401 }
      )
    };
  }
  
  return { user, response: null };
}

// 验证用户是否为管理员
export function requireAdmin(request: NextRequest): { user: UserJWTPayload; response: null } | { user: null; response: NextResponse } {
  const result = requireAuth(request);
  
  if (result.response) {
    return result;
  }
  
  if (result.user.role !== 'admin') {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    };
  }
  
  return result;
}

// 验证用户只能访问自己的数据（或管理员可以访问所有）
export function requireOwnerOrAdmin(
  request: NextRequest,
  targetUserId: number
): { user: UserJWTPayload; response: null } | { user: null; response: NextResponse } {
  const result = requireAuth(request);
  
  if (result.response) {
    return result;
  }
  
  // 管理员可以访问所有数据
  if (result.user.role === 'admin') {
    return result;
  }
  
  // 普通用户只能访问自己的数据
  if (result.user.userId !== targetUserId) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Forbidden - Can only access your own data' },
        { status: 403 }
      )
    };
  }
  
  return result;
}
