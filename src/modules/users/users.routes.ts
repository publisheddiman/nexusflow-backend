import { Hono } from "hono";
import {
  currentUserMiddleware,
  type CurrentUserContext,
} from "../../middleware/current-user.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { usersController } from "./users.controller";

const usersRoutes = new Hono<CurrentUserContext>();

usersRoutes.use("*", currentUserMiddleware);

usersRoutes.get(
  "/",
  requireRole("PM"),
  (c) => usersController.getUsers(c),
);

export default usersRoutes;
