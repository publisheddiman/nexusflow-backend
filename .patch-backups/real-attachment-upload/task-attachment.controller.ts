import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { taskAttachmentService } from "./task-attachment.service";
import { createTaskAttachmentSchema } from "./task-attachment.validation";

export class TaskAttachmentController {
  async getAll(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json({ message: "Task ID is required" }, 400);
      }

      const result = await taskAttachmentService.getAttachments(
        user,
        taskId,
        c.req.query(),
      );

      return c.json({
        message: "Task attachments retrieved successfully",
        data: result.entries,
        pagination: {
          page: result.page,
          rows: result.rows,
          totalData: result.totalData,
          totalPage: result.totalPage,
        },
      });
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  async create(c: Context<CurrentUserContext>) {
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

      const result = createTaskAttachmentSchema.safeParse(body);
      if (!result.success) {
        return c.json(
          { message: "Validation failed", errors: result.error.flatten() },
          400,
        );
      }

      const attachment = await taskAttachmentService.createAttachment(
        user,
        taskId,
        result.data,
      );

      return c.json(
        { message: "Attachment created successfully", data: attachment },
        201,
      );
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  async delete(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");
      const attachmentId = c.req.param("attachmentId");

      if (!taskId || !attachmentId) {
        return c.json(
          { message: "Task ID and attachment ID are required" },
          400,
        );
      }

      const deleted = await taskAttachmentService.deleteAttachment(
        user,
        taskId,
        attachmentId,
      );

      return c.json({
        message: "Attachment deleted successfully",
        data: deleted,
      });
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  private handleError(c: Context, error: unknown) {
    const message =
      error instanceof Error ? error.message : "Attachment operation failed";

    if (message === "Task not found" || message === "Attachment not found") {
      return c.json({ message }, 404);
    }

    if (
      message === "You do not have access to this project" ||
      message === "Client cannot upload task attachments" ||
      message === "Client cannot delete task attachments" ||
      message ===
        "Only the assigned executor can upload attachments to this task" ||
      message === "You cannot delete this attachment"
    ) {
      return c.json({ message }, 403);
    }

    if (
      message === "Invalid attachment query parameters" ||
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

    return c.json({ message: "Attachment operation failed" }, 500);
  }
}

export const taskAttachmentController = new TaskAttachmentController();
