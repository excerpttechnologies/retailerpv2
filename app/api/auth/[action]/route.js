import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { COOKIE, cookieOptions, signSession, readSession, verifyPassword } from '@/lib/auth';

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, index: true },
    password: String,
    role: { type: String, default: 'Super Admin' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const User = mongoose.models.user || mongoose.model('user', userSchema, 'user');

const json = (d, s = 200) => Response.json(d, { status: s });

export async function POST(req, { params }) {
  const { action } = await params;
  const jar = await cookies();

  if (action === 'logout') {
    jar.delete(COOKIE);
    return json({ ok: true });
  }

  if (action === 'login') {
    const { email, password } = await req.json();
    if (!email || !password) return json({ error: 'Enter your email and password.' }, 422);

    await dbConnect();
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();

    /* one generic message either way - never reveal which half was wrong */
    if (!user || !verifyPassword(password, user.password)) {
      return json({ error: 'Those credentials do not match our records.' }, 401);
    }
    if (user.isActive === false) return json({ error: 'This account is disabled.' }, 403);

    jar.set(COOKIE, signSession({
      id: String(user._id), name: user.name, email: user.email, role: user.role,
    }), cookieOptions);

    return json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
  }

  return json({ error: 'Unknown action' }, 404);
}

export async function GET(req, { params }) {
  const { action } = await params;
  if (action !== 'me') return json({ error: 'Unknown action' }, 404);
  const jar = await cookies();
  const session = readSession(jar.get(COOKIE)?.value);
  if (!session) return json({ user: null }, 401);
  return json({ user: { name: session.name, email: session.email, role: session.role } });
}
