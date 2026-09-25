import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";
import {
  buildProjectListQuery,
  type ProjectListQueryParams,
} from "./project-query";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.validation";

export class ProjectService {
  private getAccessWhere(user: AuthUser) {
    if (user.role === "PM") {
      return {
        deletedAt: null,
      };
    }

    if (user.role === "CLIENT") {
      return {
        clientId: user.id,
        deletedAt: null,
      };
    }

    return {
      deletedAt: null,
      members: {
        some: {
          userId: user.id,
          deletedAt: null,
        },
      },
    };
  }

  private async validateClient(clientId: string) {
    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: "CLIENT",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!client) {
      throw new Error("Client not found");
    }
  }

  private async validateMembers(memberIds: string[]) {
    const uniqueMemberIds = [...new Set(memberIds)];

    if (uniqueMemberIds.length === 0) {
      return uniqueMemberIds;
    }

    const members = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueMemberIds,
        },
        role: "INTERNAL",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (members.length !== uniqueMemberIds.length) {
      throw new Error("One or more project members are invalid");
    }

    return uniqueMemberIds;
  }

  async getProjects(
    user: AuthUser,
    queryParams: ProjectListQueryParams,
  ) {
    const query = buildProjectListQuery(queryParams, user.role);
    const accessWhere = this.getAccessWhere(user);

    const where = {
      AND: [accessWhere, query.where],
    };

    const [entries, totalData] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy: query.orderBy,
        take: query.take,
        skip: query.skip,
        select:
          user.role === "CLIENT"
            ? {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              }
            : {
                id: true,
                name: true,
                description: true,
                clientId: true,
                createdAt: true,
                updatedAt: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                members: {
                  where: {
                    deletedAt: null,
                  },
                  select: {
                    id: true,
                    userId: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        departmentId: true,
                      },
                    },
                  },
                },
              },
      }),

      prisma.project.count({
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

  async getProjectById(
    user: AuthUser,
    projectId: string,
  ) {
    const accessWhere = this.getAccessWhere(user);

    const project = await prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          accessWhere,
        ],
      },
      select:
        user.role === "CLIENT"
          ? {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            }
          : {
              id: true,
              name: true,
              description: true,
              clientId: true,
              createdAt: true,
              updatedAt: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              members: {
                where: {
                  deletedAt: null,
                },
                select: {
                  id: true,
                  userId: true,
                  createdAt: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      departmentId: true,
                    },
                  },
                },
              },
            },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  }

  async createProject(
    user: AuthUser,
    input: CreateProjectInput,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can create projects");
    }

    await this.validateClient(input.clientId);

    const memberIds = await this.validateMembers(
      input.memberIds,
    );

    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          clientId: input.clientId,
        },
      });

      if (memberIds.length > 0) {
        await tx.projectMember.createMany({
          data: memberIds.map((userId) => ({
            projectId: project.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.project.findUnique({
        where: {
          id: project.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          clientId: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  departmentId: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async updateProject(
    user: AuthUser,
    projectId: string,
    input: UpdateProjectInput,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can update projects");
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingProject) {
      throw new Error("Project not found");
    }

    if (input.clientId !== undefined) {
      await this.validateClient(input.clientId);
    }

    const memberIds =
      input.memberIds !== undefined
        ? await this.validateMembers(input.memberIds)
        : undefined;

    return prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: {
          id: projectId,
        },
        data: {
          ...(input.name !== undefined
            ? { name: input.name }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.clientId !== undefined
            ? { clientId: input.clientId }
            : {}),
        },
      });

      if (memberIds !== undefined) {
        await tx.projectMember.updateMany({
          where: {
            projectId,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });

        for (const userId of memberIds) {
          await tx.projectMember.upsert({
            where: {
              projectId_userId: {
                projectId,
                userId,
              },
            },
            update: {
              deletedAt: null,
            },
            create: {
              projectId,
              userId,
            },
          });
        }
      }

      return tx.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          clientId: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  departmentId: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async deleteProject(
    user: AuthUser,
    projectId: string,
  ) {
    if (user.role !== "PM") {
      throw new Error("Only PM can delete projects");
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        tasks: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const deletedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: {
          id: projectId,
        },
        data: {
          deletedAt,
        },
      });

      await tx.projectMember.updateMany({
        where: {
          projectId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });

      if (project.tasks.length > 0) {
        await tx.task.updateMany({
          where: {
            projectId,
            deletedAt: null,
          },
          data: {
            deletedAt,
            version: {
              increment: 1,
            },
          },
        });

        await tx.auditLog.createMany({
          data: project.tasks.map((task) => ({
            taskId: task.id,
            userId: user.id,
            changedColumn: "deletedAt",
            oldValue: null,
            newValue: deletedAt.toISOString(),
          })),
        });
      }
    });

    return {
      id: projectId,
      deletedAt,
    };
  }

  async getProjectMetrics(
    user: AuthUser,
    projectId: string,
  ) {
    const accessWhere = this.getAccessWhere(user);

    const project = await prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          accessWhere,
        ],
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const taskWhere = {
      projectId: project.id,
      deletedAt: null,
      ...(user.role === "CLIENT"
        ? {
            isClientVisible: true,
          }
        : {}),
    };

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      todoTasks,
    ] = await Promise.all([
      prisma.task.count({
        where: taskWhere,
      }),
      prisma.task.count({
        where: {
          ...taskWhere,
          status: "DONE",
        },
      }),
      prisma.task.count({
        where: {
          ...taskWhere,
          status: "IN_PROGRESS",
        },
      }),
      prisma.task.count({
        where: {
          ...taskWhere,
          status: "BLOCKED",
        },
      }),
      prisma.task.count({
        where: {
          ...taskWhere,
          status: "TODO",
        },
      }),
    ]);

    const completionPercentage =
      totalTasks === 0
        ? 0
        : Math.round(
            (completedTasks / totalTasks) * 100,
          );

    return {
      project: {
        id: project.id,
        name: project.name,
      },
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        todoTasks,
        completionPercentage,
      },
    };
  }
}

export const projectService = new ProjectService();
