import { Hono } from "hono";
import { projectController } from "./project.controller";
import {
  currentUserMiddleware,
  type CurrentUserContext,
} from "../../middleware/current-user.middleware";

const projectRoutes = new Hono<CurrentUserContext>();

projectRoutes.use("*", currentUserMiddleware);

projectRoutes.get("/", (c) =>
  projectController.getProjects(c),
);

projectRoutes.post("/", (c) =>
  projectController.createProject(c),
);

projectRoutes.get("/:projectId/metrics", (c) =>
  projectController.getProjectMetrics(c),
);

projectRoutes.get("/:projectId", (c) =>
  projectController.getProjectById(c),
);

projectRoutes.patch("/:projectId", (c) =>
  projectController.updateProject(c),
);

projectRoutes.delete("/:projectId", (c) =>
  projectController.deleteProject(c),
);

export default projectRoutes;
