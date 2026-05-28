/**
 * lib/auth.ts — JWT sessions + password hashing
 *
 * Uses:
 *  - jose       → JWT (Edge + Node compatible)
 *  - Web Crypto → PBKDF2 password hashing (globalThis.crypto, Edge + Node 18+)
 */
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

export const COOKIE_NAME = 'ft_session';

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-secret-change-in-production-please'
  );
}

// ── Password hashing (PBKDF2 via Web Crypto) ──────────────────────────────
function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexDecode(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr.buffer as ArrayBuffer;
}

async function pbkdf2(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const keyMat = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMat,
    256
  );
}

export async function hashPassword(password: string): Promise<string> {
  const saltArr = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const salt    = saltArr.buffer as ArrayBuffer;
  const hash    = await pbkdf2(password, salt);
  return `${hexEncode(salt)}:${hexEncode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  try {
    const salt    = hexDecode(saltHex);
    const hash    = await pbkdf2(password, salt);
    const derived = hexEncode(hash);
    // Constant-time comparison
    if (derived.length !== hashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < derived.length; i++) {
      diff |= derived.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── JWT session ───────────────────────────────────────────────────────────
export interface SessionUser {
  userId:      number;
  username:    string;
  displayName: string;
  isAdmin:     boolean;
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    uid: user.userId,
    un:  user.username,
    dn:  user.displayName,
    adm: user.isAdmin ? 1 : 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId:      payload.uid as number,
      username:    payload.un  as string,
      displayName: payload.dn  as string,
      isAdmin:     (payload.adm as number) === 1,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
