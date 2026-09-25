import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { auditService } from "./audit.service";

export class AuditController {
  async getLogs(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");

      if (user.role !== "PM") {
        return c.json(
          {
            message:
              "Only PM can view audit logs",
          },
          403,
        );
      }

      const result =
        await auditService.getLogs(
          c.req.query(),
        );

      return c.json({
        message:
          "Audit logs retrieved successfully",
        data: result.entries,
        pagination: {
          page: result.page,
          rows: result.rows,
          totalData:
            result.totalData,
          totalPage:
            result.totalPage,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve audit logs";

      if (
        message ===
          "Invalid audit query parameters" ||
        message
          .toLowerCase()
          .includes("field") ||
        message
          .toLowerCase()
          .includes("page") ||
        message
          .toLowerCase()
          .includes("rows") ||
        message
          .toLowerCase()
          .includes("order")
      ) {
        return c.json(
          {
            message:
              "Invalid query parameters",
            details: message,
          },
          400,
        );
      }

      return c.json(
        {
          message:
            "Failed to retrieve audit logs",
        },
        500,
      );
    }
  }

  async getTaskLogs(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json({ message: "Task ID is required" }, 400);
      }

      if (user.role !== "PM") {
        return c.json({ message: "Only PM can view audit logs" }, 403);
      }

      const result = await auditService.getTaskLogs(
        taskId,
        c.req.query(),
      );

      return c.json({
        message: "Audit logs retrieved successfully",
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
          : "Failed to retrieve audit logs";

      if (message === "Task not found") {
        return c.json({ message }, 404);
      }

      if (
        message === "Invalid audit query parameters" ||
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

      return c.json({ message: "Failed to retrieve audit logs" }, 500);
    }
  }
}

export const auditController = new AuditController();

