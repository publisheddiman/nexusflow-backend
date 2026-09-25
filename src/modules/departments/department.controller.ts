import type { Context } from "hono";
import { departmentService } from "./department.service";

export class DepartmentController {
  async getDepartments(c: Context) {
    try {
      const departments =
        await departmentService.getDepartments();

      return c.json({
        message: "Departments retrieved successfully",
        data: departments,
      });
    } catch {
      return c.json(
        {
          message: "Failed to retrieve departments",
        },
        500,
      );
    }
  }
}

export const departmentController =
  new DepartmentController();
