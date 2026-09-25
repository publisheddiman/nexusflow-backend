import type { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import type { AuthUser } from "../modules/auth/type";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export type AuthContext = {
  Variables: {
    user: AuthUser;
    sessionId: string;
  };
};

export const authMiddleware = async (c: Context<AuthContext>, next: Next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    return c.json(
      {
        message: "Authorization header is required",
      },
      401,
    );
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return c.json(
      {
        message: "Invalid authorization format",
      },
      401,
    );
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET as jwt.Secret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.sessionId !== "string"
    ) {
      return c.json(
        {
          message: "Invalid token payload",
        },
        401,
      );
    }

    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session) {
      return c.json(
        {
          message: "Session is invalid, expired, or revoked",
        },
        401,
      );
    }

    const user = session.user;

    if (user.deletedAt !== null) {
      return c.json(
        {
          message: "User not found",
        },
        401,
      );
    }

    if (
      user.role !== "PM" &&
      user.role !== "INTERNAL" &&
      user.role !== "CLIENT"
    ) {
      return c.json(
        {
          message: "Invalid user role",
        },
        403,
      );
    }

    c.set("user", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      });

    c.set("sessionId", session.id);

    await next();
  } catch {
    return c.json(
      {
        message: "Invalid or expired token",
      },
      401,
    );
  }
};


