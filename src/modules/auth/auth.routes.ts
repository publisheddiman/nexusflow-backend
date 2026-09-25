import { Hono } from "hono";
import {
  currentUserMiddleware,
  type CurrentUserContext,
} from "../../middleware/current-user.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { authController } from "./auth.controller";

const authRoutes = new Hono<CurrentUserContext>();

authRoutes.post(
  "/register",
  currentUserMiddleware,
  requireRole("PM"),
  (c) => authController.register(c),
);

authRoutes.post("/login", (c) => authController.login(c));

authRoutes.get("/me", currentUserMiddleware, (c) => {
  const user = c.get("user");

  return c.json({
    message: "Authenticated user",
    data: user,
  });
});

authRoutes.patch(
  "/profile",
  currentUserMiddleware,
  (c) => authController.updateProfile(c),
);

authRoutes.post(
  "/avatar",
  currentUserMiddleware,
  (c) => authController.uploadAvatar(c),
);

authRoutes.post("/logout", currentUserMiddleware, (c) =>
  authController.logout(c),
);

export default authRoutes;


