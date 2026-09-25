import { Hono } from "hono";
import { taskController } from "./task.controller";
import { taskDependencyController } from "./task-dependency.controller";
import { taskAttachmentController } from "./task-attachment.controller";
import { commentController } from "../comments/comment.controller";
import {
  currentUserMiddleware,
  type CurrentUserContext,
} from "../../middleware/current-user.middleware";
import { requireRole } from "../../middleware/role.middleware";

const taskRoutes = new Hono<CurrentUserContext>();

taskRoutes.use("*", currentUserMiddleware);

taskRoutes.get("/", (c) =>
  taskController.getAll(c),
);

taskRoutes.post(
  "/",
  requireRole("PM"),
  (c) => taskController.create(c),
);

taskRoutes.get("/:taskId", (c) =>
  taskController.getById(c),
);

taskRoutes.patch(
  "/:taskId",
  requireRole("PM"),
  (c) => taskController.update(c),
);

taskRoutes.delete(
  "/:taskId",
  requireRole("PM"),
  (c) => taskController.delete(c),
);

taskRoutes.patch(
  "/:taskId/status",
  requireRole("PM", "INTERNAL"),
  (c) => taskController.changeStatus(c),
);

taskRoutes.get(
  "/:taskId/dependencies",
  (c) =>
    taskDependencyController.getDependencies(c),
);

taskRoutes.post(
  "/:taskId/dependencies",
  requireRole("PM"),
  (c) =>
    taskDependencyController.addDependency(c),
);

taskRoutes.delete(
  "/:taskId/dependencies/:dependsOnTaskId",
  requireRole("PM"),
  (c) =>
    taskDependencyController.removeDependency(c),
);

taskRoutes.get(
  "/:taskId/attachments",
  (c) =>
    taskAttachmentController.getAll(c),
);

taskRoutes.post(
  "/:taskId/attachments",
  requireRole("PM", "INTERNAL"),
  (c) =>
    taskAttachmentController.create(c),
);

taskRoutes.delete(
  "/:taskId/attachments/:attachmentId",
  requireRole("PM", "INTERNAL"),
  (c) =>
    taskAttachmentController.delete(c),
);

taskRoutes.get(
  "/:taskId/comments",
  requireRole("PM", "INTERNAL"),
  (c) => commentController.getAll(c),
);

taskRoutes.post(
  "/:taskId/comments",
  requireRole("PM", "INTERNAL"),
  (c) => commentController.create(c),
);

taskRoutes.patch(
  "/:taskId/comments/:commentId",
  requireRole("PM", "INTERNAL"),
  (c) => commentController.update(c),
);

taskRoutes.delete(
  "/:taskId/comments/:commentId",
  requireRole("PM", "INTERNAL"),
  (c) => commentController.delete(c),
);

export default taskRoutes;
