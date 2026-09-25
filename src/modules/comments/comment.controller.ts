import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { commentService } from "./comment.service";
import {
  createCommentSchema,
  getCommentValidationError,
  updateCommentSchema,
} from "./comment.validation";

export class CommentController {
  async getAll(c: Context<CurrentUserContext>) {
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

      const result = await commentService.getComments(
        user,
        taskId,
        c.req.query(),
      );

      return c.json({
        message: "Comments retrieved successfully",
        data: result.entries,
        pagination: {
          page: result.page,
          rows: result.rows,
          totalData: result.totalData,
          totalPage: result.totalPage,
        },
      });
    } catch (error) {
      return this.handleError(
        c,
        error,
        "Failed to retrieve comments",
      );
    }
  }

  async create(c: Context<CurrentUserContext>) {
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
      const parsed = createCommentSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getCommentValidationError(
              parsed.error,
            ),
          },
          400,
        );
      }

      const comment =
        await commentService.createComment(
          user,
          taskId,
          parsed.data,
        );

      return c.json(
        {
          message: "Comment created successfully",
          data: comment,
        },
        201,
      );
    } catch (error) {
      return this.handleError(
        c,
        error,
        "Failed to create comment",
      );
    }
  }

  async update(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");
      const commentId = c.req.param("commentId");

      if (!taskId || !commentId) {
        return c.json(
          {
            message:
              "Task ID and Comment ID are required",
          },
          400,
        );
      }

      const body = await c.req.json();
      const parsed = updateCommentSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            message: getCommentValidationError(
              parsed.error,
            ),
          },
          400,
        );
      }

      const comment =
        await commentService.updateComment(
          user,
          taskId,
          commentId,
          parsed.data,
        );

      return c.json({
        message: "Comment updated successfully",
        data: comment,
      });
    } catch (error) {
      return this.handleError(
        c,
        error,
        "Failed to update comment",
      );
    }
  }

  async delete(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");
      const commentId = c.req.param("commentId");

      if (!taskId || !commentId) {
        return c.json(
          {
            message:
              "Task ID and Comment ID are required",
          },
          400,
        );
      }

      const result =
        await commentService.deleteComment(
          user,
          taskId,
          commentId,
        );

      return c.json({
        message: "Comment deleted successfully",
        data: result,
      });
    } catch (error) {
      return this.handleError(
        c,
        error,
        "Failed to delete comment",
      );
    }
  }

  private handleError(
    c: Context<CurrentUserContext>,
    error: unknown,
    fallbackMessage: string,
  ) {
    const message =
      error instanceof Error
        ? error.message
        : fallbackMessage;

    if (
      message ===
      "Client cannot access internal comments"
    ) {
      return c.json(
        {
          message,
        },
        403,
      );
    }

    if (
      message ===
        "You can only update your own comment" ||
      message ===
        "You can only delete your own comment"
    ) {
      return c.json(
        {
          message,
        },
        403,
      );
    }

    if (
      message === "Task not found" ||
      message === "Comment not found"
    ) {
      return c.json(
        {
          message,
        },
        404,
      );
    }

    if (
      message === "Invalid comment query parameters" ||
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
        message: fallbackMessage,
      },
      500,
    );
  }
}

export const commentController =
  new CommentController();
