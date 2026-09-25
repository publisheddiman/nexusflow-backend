import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";
import {
  buildDependencyListQuery,
  type DependencyListQueryParams,
} from "./task-dependency-query";

export class TaskDependencyService {
  async getDependencies(
    user: AuthUser,
    taskId: string,
    queryParams: DependencyListQueryParams,
  ) {
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
        isClientVisible: true,
        project: {
          select: {
            clientId: true,
            members: {
              where: {
                userId: user.id,
                deletedAt: null,
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (user.role === "CLIENT") {
      if (task.project.clientId !== user.id || !task.isClientVisible) {
        throw new Error("Task not found");
      }
    } else if (
      user.role === "INTERNAL" &&
      task.project.members.length === 0
    ) {
      throw new Error("Task not found");
    }

    const query = buildDependencyListQuery(queryParams);

    const dependencyVisibility =
      user.role === "CLIENT"
        ? {
            deletedAt: null,
            isClientVisible: true,
          }
        : {
            deletedAt: null,
          };

    const where = {
      AND: [
        {
          taskId,
          dependsOnTask: dependencyVisibility,
        },
        query.where,
      ],
    };

    const [relations, totalData] = await prisma.$transaction([
      prisma.taskDependency.findMany({
        where,
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
        select: {
          id: true,
          dependsOnTaskId: true,
          createdAt: true,
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              department: true,
            },
          },
        },
      }),
      prisma.taskDependency.count({ where }),
    ]);

    const entries = relations.map((relation) =>
      user.role === "CLIENT"
        ? {
            id: relation.dependsOnTask.id,
            title: relation.dependsOnTask.title,
            status: relation.dependsOnTask.status,
          }
        : {
            id: relation.dependsOnTask.id,
            title: relation.dependsOnTask.title,
            status: relation.dependsOnTask.status,
            department: relation.dependsOnTask.department,
          },
    );

    return {
      entries,
      totalData,
      totalPage:
        totalData === 0 ? 0 : Math.ceil(totalData / query.rows),
      page: query.page,
      rows: query.rows,
    };
  }

  async addDependency(
    user: AuthUser,
    taskId: string,
    dependsOnTaskId: string,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can manage task dependencies");
    }

    if (taskId === dependsOnTaskId) {
      throw new Error("Task cannot depend on itself");
    }

    const [task, dependencyTask] = await Promise.all([
      prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, status: true },
      }),
      prisma.task.findFirst({
        where: { id: dependsOnTaskId, deletedAt: null },
        select: { id: true, projectId: true, status: true },
      }),
    ]);

    if (!task || !dependencyTask) {
      throw new Error("Task not found");
    }

    if (task.projectId !== dependencyTask.projectId) {
      throw new Error("Dependency tasks must belong to the same project");
    }

    const existingDependency = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnTaskId: { taskId, dependsOnTaskId },
      },
      select: { id: true },
    });

    if (existingDependency) {
      throw new Error("Task dependency already exists");
    }

    const createsCycle = await this.hasDependencyPath(
      dependsOnTaskId,
      taskId,
    );

    if (createsCycle) {
      throw new Error("Circular task dependency is not allowed");
    }

    return prisma.$transaction(async (tx) => {
      const dependency = await tx.taskDependency.create({
        data: { taskId, dependsOnTaskId },
        select: {
          id: true,
          taskId: true,
          dependsOnTaskId: true,
          createdAt: true,
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              department: true,
            },
          },
        },
      });

      if (
        dependencyTask.status !== "DONE" &&
        task.status !== "BLOCKED" &&
        task.status !== "DONE"
      ) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            status: "BLOCKED",
            version: { increment: 1 },
          },
        });

        await tx.auditLog.create({
          data: {
            taskId: task.id,
            userId: user.id,
            changedColumn: "status",
            oldValue: task.status,
            newValue: "BLOCKED",
          },
        });
      }

      return dependency;
    });
  }

  async removeDependency(
    user: AuthUser,
    taskId: string,
    dependsOnTaskId: string,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can manage task dependencies");
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const dependency = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnTaskId: { taskId, dependsOnTaskId },
      },
      select: { id: true },
    });

    if (!dependency) {
      throw new Error("Task dependency not found");
    }

    return prisma.$transaction(async (tx) => {
      await tx.taskDependency.delete({ where: { id: dependency.id } });

      const unfinishedDependencies = await tx.taskDependency.count({
        where: {
          taskId,
          dependsOnTask: {
            deletedAt: null,
            status: { not: "DONE" },
          },
        },
      });

      if (task.status === "BLOCKED" && unfinishedDependencies === 0) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            status: "TODO",
            version: { increment: 1 },
          },
        });

        await tx.auditLog.create({
          data: {
            taskId: task.id,
            userId: user.id,
            changedColumn: "status",
            oldValue: "BLOCKED",
            newValue: "TODO",
          },
        });
      }

      return { taskId, dependsOnTaskId };
    });
  }

  private async hasDependencyPath(
    startTaskId: string,
    targetTaskId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [startTaskId];

    while (queue.length > 0) {
      const currentTaskId = queue.shift();
      if (!currentTaskId) continue;
      if (currentTaskId === targetTaskId) return true;
      if (visited.has(currentTaskId)) continue;

      visited.add(currentTaskId);

      const dependencies = await prisma.taskDependency.findMany({
        where: {
          taskId: currentTaskId,
          dependsOnTask: { deletedAt: null },
        },
        select: { dependsOnTaskId: true },
      });

      for (const dependency of dependencies) {
        if (!visited.has(dependency.dependsOnTaskId)) {
          queue.push(dependency.dependsOnTaskId);
        }
      }
    }

    return false;
  }
}

export const taskDependencyService = new TaskDependencyService();
