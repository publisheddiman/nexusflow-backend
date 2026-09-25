import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { projectService } from "./project.service";
import {
  createProjectSchema,
  getProjectValidationError,
  updateProjectSchema,
} from "./project.validation";

export class ProjectController {
  async getProjects(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const queryParams = c.req.query();

      const result = await projectService.getProjects(
        user,
        queryParams,
      );

      return c.json({
        message: "Projects retrieved successfully",
        data: result.entries,
        pagination: {
          page: result.page,
          rows: result.rows,
          totalData: result.totalData,
          totalPage: result.totalPage,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve projects";

      if (
        message === "Invalid project query parameters" ||
        message.toLowerCase().includes("field") ||
        message.toLowerCase().includes("page") ||
        message.toLowerCase().includes("rows") ||
        message.toLowerCase().includes("order")
      ) {
        return c.json(
          {
            message: "Invalid query parameters",
            details: message,
          },
          400,
        );
      }

      return c.json(
        {
          message: "Failed to retrieve projects",
        },
        500,
      );
    }
  }

  async getProjectById(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const projectId = c.req.param("projectId");

      if (!projectId) {
        return c.json(
          {
            message: "Project ID is required",
          },
          400,
        );
      }

      const project = await projectService.getProjectById(
        user,
        projectId,
      );

      return c.json({
        message: "Project retrieved successfully",
        data: project,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve project";

      if (message === "Project not found") {
        return c.json({ message }, 404);
      }

      return c.json(
        {
          message: "Failed to retrieve project",
        },
        500,
      );
    }
  }

  async createProject(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      const parsed = createProjectSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getProjectValidationError(
              parsed.error,
            ),
          },
          400,
        );
      }

      const project = await projectService.createProject(
        user,
        parsed.data,
      );

      return c.json(
        {
          message: "Project created successfully",
          data: project,
        },
        201,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create project";

      if (message === "Only PM can create projects") {
        return c.json({ message }, 403);
      }

      if (
        message === "Client not found" ||
        message ===
          "One or more project members are invalid"
      ) {
        return c.json({ message }, 400);
      }

      return c.json(
        {
          message: "Failed to create project",
        },
        500,
      );
    }
  }

  async updateProject(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const projectId = c.req.param("projectId");

      if (!projectId) {
        return c.json(
          {
            message: "Project ID is required",
          },
          400,
        );
      }

      const body = await c.req.json();
      const parsed = updateProjectSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getProjectValidationError(
              parsed.error,
            ),
          },
          400,
        );
      }

      const project = await projectService.updateProject(
        user,
        projectId,
        parsed.data,
      );

      return c.json({
        message: "Project updated successfully",
        data: project,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update project";

      if (message === "Only PM can update projects") {
        return c.json({ message }, 403);
      }

      if (message === "Project not found") {
        return c.json({ message }, 404);
      }

      if (
        message === "Client not found" ||
        message ===
          "One or more project members are invalid"
      ) {
        return c.json({ message }, 400);
      }

      return c.json(
        {
          message: "Failed to update project",
        },
        500,
      );
    }
  }

  async deleteProject(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const projectId = c.req.param("projectId");

      if (!projectId) {
        return c.json(
          {
            message: "Project ID is required",
          },
          400,
        );
      }

      const result = await projectService.deleteProject(
        user,
        projectId,
      );

      return c.json({
        message: "Project deleted successfully",
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete project";

      if (message === "Only PM can delete projects") {
        return c.json({ message }, 403);
      }

      if (message === "Project not found") {
        return c.json({ message }, 404);
      }

      return c.json(
        {
          message: "Failed to delete project",
        },
        500,
      );
    }
  }

  async getProjectMetrics(
    c: Context<CurrentUserContext>,
  ) {
    try {
      const user = c.get("user");
      const projectId = c.req.param("projectId");

      if (!projectId) {
        return c.json(
          {
            message: "Project ID is required",
          },
          400,
        );
      }

      const metrics =
        await projectService.getProjectMetrics(
          user,
          projectId,
        );

      return c.json({
        message:
          "Project metrics retrieved successfully",
        data: metrics,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve project metrics";

      if (message === "Project not found") {
        return c.json({ message }, 404);
      }

      return c.json(
        {
          message:
            "Failed to retrieve project metrics",
        },
        500,
      );
    }
  }
}

export const projectController =
  new ProjectController();
