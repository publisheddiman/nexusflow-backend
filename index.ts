import { Hono } from "hono";
import { cors } from "hono/cors";
import { prisma } from "./src/lib/prisma";
import authRoutes from "./src/modules/auth/auth.routes";
import taskRoutes from "./src/modules/tasks/task.routes";
import projectRoutes from "./src/modules/projects/project.routes";
import auditRoutes from "./src/modules/audit/audit.routes";
import usersRoutes from "./src/modules/users/users.routes";
import departmentRoutes from "./src/modules/departments/department.routes";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
    ],
    allowMethods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({
    message: "NodeWave Backend API is running",
  });
});

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return c.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error,
    );

    return c.json(
      {
        status: "error",
        database: "disconnected",
      },
      500,
    );
  }
});

app.get(
  "/uploads/avatars/:fileName",
  async (c) => {
    const fileName =
      c.req.param("fileName");

    if (
      !/^[a-zA-Z0-9._-]+$/.test(
        fileName,
      )
    ) {
      return c.json(
        {
          message: "Invalid file name",
        },
        400,
      );
    }

    const file = Bun.file(
      `./uploads/avatars/${fileName}`,
    );

    if (!(await file.exists())) {
      return c.json(
        {
          message: "Avatar not found",
        },
        404,
      );
    }

    return new Response(file, {
      headers: {
        "Content-Type":
          file.type ||
          "application/octet-stream",
        "Cache-Control":
          "public, max-age=86400",
      },
    });
  },
);

app.route("/auth", authRoutes);
app.route("/projects", projectRoutes);
app.route("/tasks", taskRoutes);
app.route("/audit", auditRoutes);
app.route("/users", usersRoutes);
app.route("/departments", departmentRoutes);

export default {
  port: 3000,
  fetch: app.fetch,
};






