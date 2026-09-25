import type { Context, Next } from "hono";
import { prisma } from "../lib/prisma";
import type { CurrentUserContext } from "./current-user.middleware";

export const requireProjectAccess = (paramName = "projectId") => {
  return async (c: Context<CurrentUserContext>, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          message: "Unauthorized",
        },
        401,
      );
    }

    const projectId = c.req.param(paramName);

    if (!projectId) {
      return c.json(
        {
          message: "Project ID is required",
        },
        400,
      );
    }

    if (user.role === "PM") {
      await next();
      return;
    }

    if (user.role === "CLIENT") {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          clientId: user.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        return c.json(
          {
            message: "Project not found",
          },
          404,
        );
      }

      await next();
      return;
    }

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        deletedAt: null,
        project: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return c.json(
        {
          message: "You do not have access to this project",
        },
        403,
      );
    }

    await next();
  };
};
