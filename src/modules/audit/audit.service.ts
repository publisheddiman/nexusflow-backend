import { prisma } from "../../lib/prisma";
import {
  buildAuditListQuery,
  type AuditListQueryParams,
} from "./audit-query";

type CreateAuditInput = {
  taskId: string;
  userId: string;
  changedColumn: string;
  oldValue: string | null;
  newValue: string | null;
};

export class AuditService {
  async createLog(input: CreateAuditInput) {
    return prisma.auditLog.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        changedColumn: input.changedColumn,
        oldValue: input.oldValue,
        newValue: input.newValue,
      },
    });
  }

  async getLogs(
    queryParams: AuditListQueryParams,
  ) {
    const query =
      buildAuditListQuery(queryParams);

    const [entries, totalData] =
      await prisma.$transaction([
        prisma.auditLog.findMany({
          where: query.where,
          orderBy: query.orderBy,
          take: query.take,
          skip: query.skip,
          select: {
            id: true,
            taskId: true,
            userId: true,
            changedColumn: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.auditLog.count({
          where: query.where,
        }),
      ]);

    return {
      entries,
      totalData,
      totalPage:
        totalData === 0
          ? 0
          : Math.ceil(
              totalData / query.rows,
            ),
      page: query.page,
      rows: query.rows,
    };
  }

  async getTaskLogs(
    taskId: string,
    queryParams: AuditListQueryParams,
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const query = buildAuditListQuery(queryParams);
    const where = {
      AND: [{ taskId }, query.where],
    };

    const [entries, totalData] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      entries,
      totalData,
      totalPage:
        totalData === 0 ? 0 : Math.ceil(totalData / query.rows),
      page: query.page,
      rows: query.rows,
    };
  }
}

export const auditService = new AuditService();

