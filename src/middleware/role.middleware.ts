import type { Context, Next } from "hono";
import type { CurrentUserContext } from "./current-user.middleware";

type AllowedRole = "PM" | "INTERNAL" | "CLIENT";

export const requireRole = (...allowedRoles: AllowedRole[]) => {
  return async (c: Context<CurrentUserContext>, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          message: "Unauthorized",
        },
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          message: "Forbidden",
        },
        403,
      );
    }

    await next();
  };
};
