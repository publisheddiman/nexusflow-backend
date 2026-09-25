import { mkdir, unlink } from "node:fs/promises";
import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { taskAttachmentService } from "./task-attachment.service";
import { createTaskAttachmentSchema } from "./task-attachment.validation";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
};

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

  async upload(c: Context<CurrentUserContext>) {
    let filePath: string | null = null;

    try {
      const user = c.get("user");
      const taskId = c.req.param("taskId");

      if (!taskId) {
        return c.json({ message: "Task ID is required" }, 400);
      }

      await taskAttachmentService.assertCanUpload(user, taskId);

      const body = await c.req.parseBody();
      const file = body.file;

      if (!(file instanceof File)) {
        return c.json({ message: "Attachment file is required" }, 400);
      }

      if (file.size <= 0) {
        return c.json({ message: "Attachment file cannot be empty" }, 400);
      }

      if (file.size > MAX_ATTACHMENT_SIZE) {
        return c.json(
          { message: "Attachment file must not exceed 10 MB" },
          413,
        );
      }

      const extension = ATTACHMENT_TYPES[file.type];

      if (!extension) {
        return c.json(
          {
            message:
              "Unsupported attachment type. Allowed: PDF, JPG, PNG, WebP, TXT, CSV, ZIP, DOCX, XLSX, PPTX",
          },
          415,
        );
      }

      await mkdir("./uploads/attachments", {
        recursive: true,
      });

      const storedFileName =
        `${taskId}-${crypto.randomUUID()}.${extension}`;

      filePath =
        `./uploads/attachments/${storedFileName}`;

      await Bun.write(filePath, file);

      const origin = new URL(c.req.url).origin;
      const internalFileUrl =
        `${origin}/uploads/attachments/${storedFileName}`;

      const attachment =
        await taskAttachmentService.createAttachment(
          user,
          taskId,
          {
            fileName: file.name || `attachment.${extension}`,
            fileUrl: internalFileUrl,
            fileSize: file.size,
            mimeType: file.type,
          },
        );

      return c.json(
        {
          message: "Attachment uploaded successfully",
          data: attachment,
        },
        201,
      );
    } catch (error) {
      if (filePath) {
        await unlink(filePath).catch(() => undefined);
      }

      return this.handleError(c, error);
    }
  }

  async download(c: Context<CurrentUserContext>) {
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

      const attachment =
        await taskAttachmentService.getDownloadableAttachment(
          user,
          taskId,
          attachmentId,
        );

      let pathname: string;

      try {
        pathname = new URL(attachment.fileUrl).pathname;
      } catch {
        throw new Error("Attachment file is not locally stored");
      }

      const prefix = "/uploads/attachments/";

      if (!pathname.startsWith(prefix)) {
        throw new Error("Attachment file is not locally stored");
      }

      const storedFileName = pathname.slice(prefix.length);

      if (
        !storedFileName ||
        !/^[a-zA-Z0-9._-]+$/.test(storedFileName)
      ) {
        throw new Error("Attachment file not found");
      }

      const file = Bun.file(
        `./uploads/attachments/${storedFileName}`,
      );

      if (!(await file.exists())) {
        throw new Error("Attachment file not found");
      }

      return new Response(file, {
        headers: {
          "Content-Type":
            attachment.mimeType ?? "application/octet-stream",
          "Content-Disposition":
            `attachment; filename*=UTF-8''${encodeURIComponent(
              attachment.fileName,
            )}`,
          "Cache-Control": "private, no-store",
        },
      });
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
      error instanceof Error
        ? error.message
        : "Attachment operation failed";

    if (
      message === "Task not found" ||
      message === "Attachment not found" ||
      message === "Attachment file not found" ||
      message === "Attachment file is not locally stored"
    ) {
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
        {
          message: "Invalid query parameters",
          details: message,
        },
        400,
      );
    }

    return c.json(
      { message: "Attachment operation failed" },
      500,
    );
  }
}

export const taskAttachmentController =
  new TaskAttachmentController();
