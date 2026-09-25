import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { taskService } from "./task.service";
import { taskStatusService } from "./task-status.service";
import {
  changeTaskStatusSchema,
  createTaskSchema,
  deleteTaskSchema,
  getValidationError,
  updateTaskSchema,
} from "./task.validation";

export class TaskController {
  async getAll(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const queryParams = c.req.query();

      const result = await taskService.getTasks(user, queryParams);

      return c.json({
        message: "Tasks retrieved successfully",
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
        error instanceof Error ? error.message : "Failed to get tasks";

      if (
        message === "Invalid task query parameters" ||
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
          message: "Failed to get tasks",
        },
        500,
      );
    }
  }

  async create(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      const parsed = createTaskSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getValidationError(parsed.error),
          },
          400,
        );
      }

      const task = await taskService.createTask(user, parsed.data);

      return c.json(
        {
          message: "Task created successfully",
          data: task,
        },
        201,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create task";

      if (message === "Only PM can create tasks") {
        return c.json(
          {
            message,
          },
          403,
        );
      }

      if (message === "Project not found") {
        return c.json(
          {
            message,
          },
          404,
        );
      }

      if (
        message === "Assignee not found" ||
        message === "Assignee department does not match task department" ||
        message === "Assignee is not a member of this project"
      ) {
        return c.json(
          {
            message,
          },
          400,
        );
      }

      return c.json(
        {
          message: "Failed to create task",
        },
        500,
      );
    }
  }

  async getById(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json(
          {
            message: "Task ID is required",
          },
          400,
        );
      }

      const task = await taskService.getTaskById(user, taskId);

      return c.json({
        message: "Task retrieved successfully",
        data: task,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get task";

      if (message === "Task not found") {
        return c.json(
          {
            message,
          },
          404,
        );
      }

      if (message === "You do not have access to this project") {
        return c.json(
          {
            message,
          },
          403,
        );
      }

      return c.json(
        {
          message: "Failed to get task",
        },
        500,
      );
    }
  }

  async update(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json(
          {
            message: "Task ID is required",
          },
          400,
        );
      }

      const body = await c.req.json();

      const parsed = updateTaskSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getValidationError(parsed.error),
          },
          400,
        );
      }

      const { version, ...input } = parsed.data;

      const task = await taskService.updateTask(user, taskId, input, version);

      return c.json({
        message: "Task updated successfully",
        data: task,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update task";

      if (message === "Task has been modified by another user") {
        return c.json(
          {
            message,
          },
          409,
        );
      }

      if (message === "Task not found") {
        return c.json(
          {
            message,
          },
          404,
        );
      }

      if (message === "Only PM can edit task details") {
        return c.json(
          {
            message,
          },
          403,
        );
      }

      if (
        message === "Assignee not found" ||
        message === "Assignee department does not match task department" ||
        message === "Assignee is not a member of this project" ||
        message === "No task fields were changed"
      ) {
        return c.json(
          {
            message,
          },
          400,
        );
      }

      return c.json(
        {
          message: "Failed to update task",
        },
        500,
      );
    }
  }

  async delete(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json(
          {
            message: "Task ID is required",
          },
          400,
        );
      }

      const body = await c.req.json();

      const parsed = deleteTaskSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getValidationError(parsed.error),
          },
          400,
        );
      }

      const result = await taskService.deleteTask(
        user,
        taskId,
        parsed.data.version,
      );

      return c.json({
        message: "Task deleted successfully",
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete task";

      if (message === "Task has been modified by another user") {
        return c.json(
          {
            message,
          },
          409,
        );
      }

      if (message === "Task not found") {
        return c.json(
          {
            message,
          },
          404,
        );
      }

      if (message === "Only PM can delete tasks") {
        return c.json(
          {
            message,
          },
          403,
        );
      }

      return c.json(
        {
          message: "Failed to delete task",
        },
        500,
      );
    }
  }

  async changeStatus(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json(
          {
            message: "Task ID is required",
          },
          400,
        );
      }

      const body = await c.req.json();

      const parsed = changeTaskStatusSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getValidationError(parsed.error),
          },
          400,
        );
      }

      const task = await taskStatusService.changeStatus(
        user,
        taskId,
        parsed.data.status,
        parsed.data.version,
      );

      return c.json({
        message: "Task status updated successfully",
        data: task,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update task status";

      if (message === "Task has been modified by another user") {
        return c.json(
          {
            message,
          },
          409,
        );
      }

      if (message === "Task not found") {
        return c.json(
          {
            message,
          },
          404,
        );
      }

      if (
        message === "You do not have access to this project" ||
        message === "You are not assigned to this task" ||
        message === "Only the assigned executor can change this task status" ||
        message === "Only PM and internal team can change task status" ||
        message === "Client cannot change task status" ||
        message === "PM cannot complete tasks" ||
        message === "PM cannot move a task to DONE"
      ) {
        return c.json(
          {
            message,
          },
          403,
        );
      }

      if (
        message === "Task dependencies are not completed" ||
        message === "Task is blocked by unfinished dependencies"
      ) {
        return c.json(
          {
            message,
          },
          409,
        );
      }

      return c.json(
        {
          message: "Failed to update task status",
        },
        500,
      );
    }
  }
}

export const taskController = new TaskController();

