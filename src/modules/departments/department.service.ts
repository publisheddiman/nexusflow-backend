import { prisma } from "../../lib/prisma";

export class DepartmentService {
  async getDepartments() {
    return prisma.department.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }
}

export const departmentService =
  new DepartmentService();
