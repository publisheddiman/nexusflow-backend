import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";
import {
  buildCommentListQuery,
  type CommentListQueryParams,
} from "./comment-query";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.validation";

export class CommentService {
  private ensureInternalAccess(user: AuthUser) {
    if (user.role === "CLIENT") {
      throw new Error(
        "Client cannot access internal comments",
      );
    }
  }

  private async ensureTaskAccess(
    user: AuthUser,
    taskId: string,
  ) {
    this.ensureInternalAccess(user);

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          deletedAt: null,
          ...(user.role === "INTERNAL"
            ? {
                members: {
                  some: {
                    userId: user.id,
                    deletedAt: null,
                  },
                },
              }
            : {}),
        },
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  }

  async getComments(
    user: AuthUser,
    taskId: string,
    queryParams: CommentListQueryParams,
  ) {
    await this.ensureTaskAccess(user, taskId);

    const query = buildCommentListQuery(queryParams);

    const where = {
      AND: [
        {
          taskId,
          deletedAt: null,
        },
        query.where,
      ],
    };

    const [entries, totalData] = await prisma.$transaction([
      prisma.comment.findMany({
        where,
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
        select: {
          id: true,
          taskId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              departmentId: true,
            },
          },
        },
      }),

      prisma.comment.count({
        where,
      }),
    ]);

    return {
      entries,
      totalData,
      totalPage:
        totalData === 0
          ? 0
          : Math.ceil(totalData / query.rows),
      page: query.page,
      rows: query.rows,
    };
  }

  async createComment(
    user: AuthUser,
    taskId: string,
    input: CreateCommentInput,
  ) {
    await this.ensureTaskAccess(user, taskId);

    return prisma.comment.create({
      data: {
        taskId,
        userId: user.id,
        content: input.content,
      },
      select: {
        id: true,
        taskId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
          },
        },
      },
    });
  }

  async updateComment(
    user: AuthUser,
    taskId: string,
    commentId: string,
    input: UpdateCommentInput,
  ) {
    await this.ensureTaskAccess(user, taskId);

    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== user.id) {
      throw new Error(
        "You can only update your own comment",
      );
    }

    return prisma.comment.update({
      where: {
        id: comment.id,
      },
      data: {
        content: input.content,
      },
      select: {
        id: true,
        taskId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
          },
        },
      },
    });
  }

  async deleteComment(
    user: AuthUser,
    taskId: string,
    commentId: string,
  ) {
    await this.ensureTaskAccess(user, taskId);

    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (
      user.role !== "PM" &&
      comment.userId !== user.id
    ) {
      throw new Error(
        "You can only delete your own comment",
      );
    }

    const deletedAt = new Date();

    await prisma.comment.update({
      where: {
        id: comment.id,
      },
      data: {
        deletedAt,
      },
    });

    return {
      id: comment.id,
      deletedAt,
    };
  }
}

export const commentService = new CommentService();
