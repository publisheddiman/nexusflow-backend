import { Hono } from "hono";
import { auditController } from "./audit.controller";
import {
  currentUserMiddleware,
  type CurrentUserContext,
} from "../../middleware/current-user.middleware";
import { requireRole } from "../../middleware/role.middleware";

const auditRoutes = new Hono<CurrentUserContext>();

auditRoutes.use("*", currentUserMiddleware);

auditRoutes.get(
  "/",
  requireRole("PM"),
  (c) => auditController.getLogs(c),
);

auditRoutes.get(
  "/tasks/:taskId",
  requireRole("PM"),
  (c) => auditController.getTaskLogs(c),
);

export default auditRoutes;

