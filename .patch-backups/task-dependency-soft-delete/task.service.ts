import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";
import {
  buildTaskListQuery,
  type TaskListQueryParams,
} from "./task-query";

type DepartmentType = "UI_UX" | "FRONTEND" | "BACKEND";

type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string;
  department: DepartmentType;
  assigneeId?: string;
  isClientVisible?: boolean;
};

type UpdateTaskInput = {
  title?: string;
  description?: string;
  department?: DepartmentType;
  assigneeId?: string | null;
  isClientVisible?: boolean;
};

export class TaskService {
  async getTasks(
    user: AuthUser,
    queryParams: TaskListQueryParams,
  ) {
    const query = buildTaskListQuery(queryParams, user.role);

    if (user.role === "CLIENT") {
      const accessWhere = {
        deletedAt: null,
        isClientVisible: true,
        project: {
          deletedAt: null,
          clientId: user.id,
        },
      };

      const where = {
        AND: [accessWhere, query.where],
      };

      const [tasks, totalData] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          select: {
            id: true,
            projectId: true,
            title: true,
            description: true,
            status: true,
            isClientVisible: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: query.orderBy,
          take: query.take,
          skip: query.skip,
        }),
        prisma.task.count({
          where,
        }),
      ]);

      return {
        entries: tasks,
        totalData,
        totalPage: Math.ceil(totalData / query.rows),
        page: query.page,
        rows: query.rows,
      };
    }

    if (user.role === "INTERNAL") {
      const accessWhere = {
        deletedAt: null,
        project: {
          deletedAt: null,
          members: {
            some: {
              userId: user.id,
              deletedAt: null,
            },
          },
        },
      };

      const where = {
        AND: [accessWhere, query.where],
      };

      const [tasks, totalData] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          select: {
            id: true,
            projectId: true,
            title: true,
            description: true,
            status: true,
            version: true,
            department: true,
            assigneeId: true,
            isClientVisible: true,
            createdAt: true,
            updatedAt: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                departmentId: true,
              },
            },
          },
          orderBy: query.orderBy,
          take: query.take,
          skip: query.skip,
        }),
        prisma.task.count({
          where,
        }),
      ]);

      return {
        entries: tasks,
        totalData,
        totalPage: Math.ceil(totalData / query.rows),
        page: query.page,
        rows: query.rows,
      };
    }

    const accessWhere = {
      deletedAt: null,
      project: {
        deletedAt: null,
      },
    };

    const where = {
      AND: [accessWhere, query.where],
    };

    const [tasks, totalData] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          title: true,
          description: true,
          status: true,
          version: true,
          department: true,
          assigneeId: true,
          createdById: true,
          isClientVisible: true,
          createdAt: true,
          updatedAt: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
      }),
      prisma.task.count({
        where,
      }),
    ]);

    return {
      entries: tasks,
      totalData,
      totalPage: Math.ceil(totalData / query.rows),
      page: query.page,
      rows: query.rows,
    };
  }

  private async validateAssignee(
    assigneeId: string,
    projectId: string,
    department: DepartmentType,
  ) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assigneeId,
        role: "INTERNAL",
        deletedAt: null,
      },
      select: {
        id: true,
        department: {
          select: {
            name: true,
            deletedAt: true,
          },
        },
        projectMemberships: {
          where: {
            projectId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!assignee) {
      throw new Error("Assignee not found");
    }

    if (
      !assignee.department ||
      assignee.department.deletedAt !== null ||
      assignee.department.name !== department
    ) {
      throw new Error(
        "Assignee department does not match task department",
      );
    }

    if (assignee.projectMemberships.length === 0) {
      throw new Error("Assignee is not a member of this project");
    }
  }

  async createTask(
    user: AuthUser,
    input: CreateTaskInput,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can create tasks");
    }

    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (input.assigneeId) {
      await this.validateAssignee(
        input.assigneeId,
        input.projectId,
        input.department,
      );
    }

    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          department: input.department,
          assigneeId: input.assigneeId,
          createdById: user.id,
          isClientVisible:
            input.isClientVisible ?? false,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
            },
          },
        },
      });

      await tx.auditLog.createMany({
        data: [
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "projectId",
            oldValue: null,
            newValue: input.projectId,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "title",
            oldValue: null,
            newValue: input.title,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "description",
            oldValue: null,
            newValue: input.description ?? null,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "department",
            oldValue: null,
            newValue: input.department,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "assigneeId",
            oldValue: null,
            newValue: input.assigneeId ?? null,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "createdById",
            oldValue: null,
            newValue: user.id,
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "isClientVisible",
            oldValue: null,
            newValue: String(
              input.isClientVisible ?? false,
            ),
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "status",
            oldValue: null,
            newValue: "TODO",
          },
          {
            taskId: task.id,
            userId: user.id,
            changedColumn: "version",
            oldValue: null,
            newValue: "1",
          },
        ],
      });

      return task;
    });
  }

  async getTaskById(
    user: AuthUser,
    taskId: string,
  ) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            departmentId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
          },
        },
        dependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
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
      if (
        task.project.clientId !== user.id ||
        !task.isClientVisible
      ) {
        throw new Error("Task not found");
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        isClientVisible: task.isClientVisible,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }

    const hasProjectAccess =
      await prisma.projectMember.findFirst({
        where: {
          projectId: task.projectId,
          userId: user.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

    if (!hasProjectAccess) {
      throw new Error(
        "You do not have access to this project",
      );
    }

    return task;
  }

  async updateTask(
    user: AuthUser,
    taskId: string,
    input: UpdateTaskInput,
    expectedVersion: number,
  ) {
    if (user.role !== "PM") {
      throw new Error(
        "Only PM can edit task details",
      );
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        department: true,
        assigneeId: true,
        isClientVisible: true,
        version: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.version !== expectedVersion) {
      throw new Error(
        "Task has been modified by another user",
      );
    }

    const finalDepartment =
      input.department ?? task.department;

    const finalAssigneeId =
      input.assigneeId !== undefined
        ? input.assigneeId
        : task.assigneeId;

    if (finalAssigneeId) {
      await this.validateAssignee(
        finalAssigneeId,
        task.projectId,
        finalDepartment,
      );
    }

    const changedFields: Array<{
      column: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    if (
      input.title !== undefined &&
      input.title !== task.title
    ) {
      changedFields.push({
        column: "title",
        oldValue: task.title,
        newValue: input.title,
      });
    }

    if (
      input.description !== undefined &&
      input.description !== task.description
    ) {
      changedFields.push({
        column: "description",
        oldValue: task.description,
        newValue: input.description,
      });
    }

    if (
      input.department !== undefined &&
      input.department !== task.department
    ) {
      changedFields.push({
        column: "department",
        oldValue: task.department,
        newValue: input.department,
      });
    }

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== task.assigneeId
    ) {
      changedFields.push({
        column: "assigneeId",
        oldValue: task.assigneeId,
        newValue: input.assigneeId,
      });
    }

    if (
      input.isClientVisible !== undefined &&
      input.isClientVisible !== task.isClientVisible
    ) {
      changedFields.push({
        column: "isClientVisible",
        oldValue: String(task.isClientVisible),
        newValue: String(input.isClientVisible),
      });
    }

    if (changedFields.length === 0) {
      throw new Error(
        "No task fields were changed",
      );
    }

    return prisma.$transaction(async (tx) => {
      const updatedTask =
        await tx.task.updateMany({
          where: {
            id: taskId,
            version: expectedVersion,
            deletedAt: null,
          },
          data: {
            ...input,
            version: {
              increment: 1,
            },
          },
        });

      if (updatedTask.count === 0) {
        throw new Error(
          "Task has been modified by another user",
        );
      }

      const updated =
        await tx.task.findUnique({
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

      await tx.auditLog.createMany({
        data: changedFields.map((field) => ({
          taskId: task.id,
          userId: user.id,
          changedColumn: field.column,
          oldValue: field.oldValue,
          newValue: field.newValue,
        })),
      });

      return updated;
    });
  }

  async deleteTask(
    user: AuthUser,
    taskId: string,
    expectedVersion: number,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can delete tasks");
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.version !== expectedVersion) {
      throw new Error(
        "Task has been modified by another user",
      );
    }

    const deletedAt = new Date();

    return prisma.$transaction(async (tx) => {
      const deletedTask =
        await tx.task.updateMany({
          where: {
            id: taskId,
            version: expectedVersion,
            deletedAt: null,
          },
          data: {
            deletedAt,
            version: {
              increment: 1,
            },
          },
        });

      if (deletedTask.count === 0) {
        throw new Error(
          "Task has been modified by another user",
        );
      }

      await tx.auditLog.create({
        data: {
          taskId,
          userId: user.id,
          changedColumn: "deletedAt",
          oldValue: null,
          newValue: deletedAt.toISOString(),
        },
      });

      return {
        id: taskId,
        version: expectedVersion + 1,
        deletedAt,
      };
    });
  }
}

export const taskService = new TaskService();
