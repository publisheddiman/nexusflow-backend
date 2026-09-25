import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { taskDependencyService } from "./task-dependency.service";

export class TaskDependencyController {
  async getDependencies(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json({ message: "Task ID is required" }, 400);
      }

      const result = await taskDependencyService.getDependencies(
        user,
        taskId,
        c.req.query(),
      );

      return c.json({
        message: "Task dependencies retrieved successfully",
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
          : "Failed to retrieve task dependencies";

      if (message === "Task not found") {
        return c.json({ message }, 404);
      }

      if (
        message === "Invalid dependency query parameters" ||
        message.toLowerCase().includes("field") ||
        message.toLowerCase().includes("page") ||
        message.toLowerCase().includes("rows") ||
        message.toLowerCase().includes("order")
      ) {
        return c.json(
          { message: "Invalid query parameters", details: message },
          400,
        );
      }

      return c.json(
        { message: "Failed to retrieve task dependencies" },
        500,
      );
    }
  }

  async addDependency(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json({ message: "Task ID is required" }, 400);
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ message: "Invalid JSON body" }, 400);
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("dependsOnTaskId" in body) ||
        typeof body.dependsOnTaskId !== "string" ||
        body.dependsOnTaskId.trim().length === 0
      ) {
        return c.json({ message: "Dependency task ID is required" }, 400);
      }

      const dependency = await taskDependencyService.addDependency(
        user,
        taskId,
        body.dependsOnTaskId.trim(),
      );

      return c.json(
        { message: "Task dependency added successfully", data: dependency },
        201,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Task not found") {
          return c.json({ message: error.message }, 404);
        }

        if (error.message === "Only PM can manage task dependencies") {
          return c.json({ message: error.message }, 403);
        }

        if (
          error.message === "Task cannot depend on itself" ||
          error.message ===
            "Dependency tasks must belong to the same project" ||
          error.message === "Task dependency already exists" ||
          error.message === "Circular task dependency is not allowed"
        ) {
          return c.json({ message: error.message }, 400);
        }
      }

      return c.json({ message: "Failed to add task dependency" }, 500);
    }
  }

  async removeDependency(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");
      const dependsOnTaskId = c.req.param("dependsOnTaskId");

      if (!taskId || !dependsOnTaskId) {
        return c.json({ message: "Task dependency IDs are required" }, 400);
      }

      const result = await taskDependencyService.removeDependency(
        user,
        taskId,
        dependsOnTaskId,
      );

      return c.json({
        message: "Task dependency removed successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Task not found" ||
          error.message === "Task dependency not found"
        ) {
          return c.json({ message: error.message }, 404);
        }

        if (error.message === "Only PM can manage task dependencies") {
          return c.json({ message: error.message }, 403);
        }
      }

      return c.json({ message: "Failed to remove task dependency" }, 500);
    }
  }
}

export const taskDependencyController = new TaskDependencyController();
