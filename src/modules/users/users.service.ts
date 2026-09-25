import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../auth/type";

export class UsersService {
  async getUsers(user: AuthUser) {
    if (user.role !== "PM") {
      throw new Error("Only PM can view users");
    }

    return prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const usersService = new UsersService();
