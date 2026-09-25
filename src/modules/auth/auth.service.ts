import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export class AuthService {
  async register(
    name: string,
    email: string,
    password: string,
    departmentId: string,
  ) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
      },
    });

    if (!department) {
      throw new Error("Department not found");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "INTERNAL",
        departmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || user.deletedAt !== null) {
      throw new Error("Invalid email or password");
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw new Error("Invalid email or password");
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    const payload = {
      sub: user.id,
      sessionId: session.id,
      role: user.role,
      departmentId: user.departmentId,
    };

    const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, {
      expiresIn: "24h",
    });

    return {
      token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async updateProfile(
    userId: string,
    input: {
      name?: string;
      avatarUrl?: string | null;
    },
  ) {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(input.name !== undefined
          ? {
              name: input.name,
            }
          : {}),
        ...(input.avatarUrl !== undefined
          ? {
              avatarUrl: input.avatarUrl,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        avatarUrl: true,
      },
    });

    return user;
  }

  async logout(userId: string, sessionId: string) {
    const session = await prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      throw new Error("Session not found or already revoked");
    }

    await prisma.authSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: "Session revoked successfully",
    };
  }
}

export const authService = new AuthService();









