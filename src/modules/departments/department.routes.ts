import { Hono } from "hono";
import { departmentController } from "./department.controller";

const departmentRoutes = new Hono();

departmentRoutes.get(
  "/",
  (c) => departmentController.getDepartments(c),
);

export default departmentRoutes;
