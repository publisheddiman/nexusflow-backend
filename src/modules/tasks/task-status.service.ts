import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export class TaskStatusService {
  async changeStatus(
    user: AuthUser,
    taskId: string,
    targetStatus: TaskStatus,
    expectedVersion: number,
  ) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          deletedAt: null,
        },
      },
      include: {
        project: {
          select: {
            members: {
              where: {
                userId: user.id,
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
          },
        },
        dependencies: {
          where: {
            deletedAt: null,
          },
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.version !== expectedVersion) {
      throw new Error("Task has been modified by another user");
    }

    if (user.role !== "PM") {
      if (user.role !== "INTERNAL") {
        throw new Error("Only PM and internal team can change task status");
      }

      if (task.project.members.length === 0) {
        throw new Error("You do not have access to this project");
      }

      if (task.assigneeId !== user.id) {
        throw new Error(
          "Only the assigned executor can change this task status",
        );
      }
    }

    if (targetStatus === "DONE" && user.role === "PM") {
      throw new Error("PM cannot move a task to DONE");
    }

    if (task.status === targetStatus) {
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        version: task.version,
        department: task.department,
        assigneeId: task.assigneeId,
        isClientVisible: task.isClientVisible,
        updatedAt: task.updatedAt,
      };
    }

    const unfinishedDependencies = task.dependencies.filter(
      (dependency) =>
        dependency.dependsOnTask.deletedAt === null &&
        dependency.dependsOnTask.status !== "DONE",
    );

    if (
      unfinishedDependencies.length > 0 &&
      targetStatus !== "BLOCKED"
    ) {
      throw new Error("Task is blocked by unfinished dependencies");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.updateMany({
        where: {
          id: taskId,
          version: expectedVersion,
          deletedAt: null,
        },
        data: {
          status: targetStatus,
          version: {
            increment: 1,
          },
        },
      });

      if (updatedTask.count === 0) {
        throw new Error("Task has been modified by another user");
      }

      const updated = await tx.task.findUnique({
        where: {
          id: taskId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          version: true,
          department: true,
          assigneeId: true,
          isClientVisible: true,
          updatedAt: true,
        },
      });

      if (!updated) {
        throw new Error("Task not found");
      }

      await tx.auditLog.create({
        data: {
          taskId: task.id,
          userId: user.id,
          changedColumn: "status",
          oldValue: task.status,
          newValue: targetStatus,
        },
      });

      if (targetStatus === "DONE") {
        const dependentRelations = await tx.taskDependency.findMany({
          where: {
            dependsOnTaskId: task.id,
            deletedAt: null,
            task: {
              deletedAt: null,
              status: "BLOCKED",
            },
          },
          select: {
            taskId: true,
          },
        });

        for (const relation of dependentRelations) {
          const unfinished = await tx.taskDependency.count({
            where: {
              taskId: relation.taskId,
              deletedAt: null,
              dependsOnTask: {
                deletedAt: null,
                status: {
                  not: "DONE",
                },
              },
            },
          });

          if (unfinished === 0) {
            const unblocked = await tx.task.updateMany({
              where: {
                id: relation.taskId,
                deletedAt: null,
                status: "BLOCKED",
              },
              data: {
                status: "TODO",
                version: {
                  increment: 1,
                },
              },
            });

            if (unblocked.count > 0) {
              await tx.auditLog.create({
                data: {
                  taskId: relation.taskId,
                  userId: user.id,
                  changedColumn: "status",
                  oldValue: "BLOCKED",
                  newValue: "TODO",
                },
              });
            }
          }
        }
      }

      return updated;
    });

    return result;
  }
}

export const taskStatusService = new TaskStatusService();

