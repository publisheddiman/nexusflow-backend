import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";
import {
  buildAttachmentListQuery,
  type AttachmentListQueryParams,
} from "./task-attachment-query";

type CreateAttachmentInput = {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
};

export class TaskAttachmentService {
  private async getAccessibleTask(user: AuthUser, taskId: string) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        projectId: true,
        assigneeId: true,
        isClientVisible: true,
        project: {
          select: {
            clientId: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (user.role === "PM") {
      return task;
    }

    if (user.role === "CLIENT") {
      if (task.project.clientId !== user.id || !task.isClientVisible) {
        throw new Error("Task not found");
      }

      return task;
    }

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new Error("You do not have access to this project");
    }

    return task;
  }

  async getAttachments(
    user: AuthUser,
    taskId: string,
    queryParams: AttachmentListQueryParams,
  ) {
    await this.getAccessibleTask(user, taskId);
    const query = buildAttachmentListQuery(queryParams, user.role);

    const where = {
      AND: [
        {
          taskId,
          deletedAt: null,
        },
        query.where,
      ],
    };

    const [attachments, totalData] = await prisma.$transaction([
      prisma.taskAttachment.findMany({
        where,
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
        select: {
          id: true,
          taskId: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          uploadedById: true,
          createdAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
            },
          },
        },
      }),
      prisma.taskAttachment.count({ where }),
    ]);

    const entries =
      user.role === "CLIENT"
        ? attachments.map((attachment) => ({
            id: attachment.id,
            taskId: attachment.taskId,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
            createdAt: attachment.createdAt,
          }))
        : attachments;

    return {
      entries,
      totalData,
      totalPage:
        totalData === 0 ? 0 : Math.ceil(totalData / query.rows),
      page: query.page,
      rows: query.rows,
    };
  }

  async createAttachment(
    user: AuthUser,
    taskId: string,
    input: CreateAttachmentInput,
  ) {
    const task = await this.getAccessibleTask(user, taskId);

    if (user.role === "CLIENT") {
      throw new Error("Client cannot upload task attachments");
    }

    if (user.role === "INTERNAL" && task.assigneeId !== user.id) {
      throw new Error(
        "Only the assigned executor can upload attachments to this task",
      );
    }

    return prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedById: user.id,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
      select: {
        id: true,
        taskId: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        uploadedById: true,
        createdAt: true,
      },
    });
  }

  async deleteAttachment(
    user: AuthUser,
    taskId: string,
    attachmentId: string,
  ) {
    const task = await this.getAccessibleTask(user, taskId);

    if (user.role === "CLIENT") {
      throw new Error("Client cannot delete task attachments");
    }

    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        uploadedById: true,
      },
    });

    if (!attachment) {
      throw new Error("Attachment not found");
    }

    if (
      user.role === "INTERNAL" &&
      (task.assigneeId !== user.id || attachment.uploadedById !== user.id)
    ) {
      throw new Error("You cannot delete this attachment");
    }

    const deletedAt = new Date();

    const result = await prisma.taskAttachment.updateMany({
      where: {
        id: attachmentId,
        taskId,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    if (result.count === 0) {
      throw new Error("Attachment not found");
    }

    return {
      id: attachmentId,
      deletedAt,
    };
  }
}

export const taskAttachmentService = new TaskAttachmentService();
