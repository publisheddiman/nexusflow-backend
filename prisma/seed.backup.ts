import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seed...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // Departments
  const uiUxDepartment = await prisma.department.upsert({
    where: {
      name: "UI_UX",
    },
    update: {},
    create: {
      name: "UI_UX",
    },
  });

  const frontendDepartment = await prisma.department.upsert({
    where: {
      name: "FRONTEND",
    },
    update: {},
    create: {
      name: "FRONTEND",
    },
  });

  const backendDepartment = await prisma.department.upsert({
    where: {
      name: "BACKEND",
    },
    update: {},
    create: {
      name: "BACKEND",
    },
  });

  // PM
  const pm = await prisma.user.upsert({
    where: {
      email: "pm@nodewave.local",
    },
    update: {
      name: "NodeWave PM",
      passwordHash,
      role: "PM",
      departmentId: null,
      deletedAt: null,
    },
    create: {
      name: "NodeWave PM",
      email: "pm@nodewave.local",
      passwordHash,
      role: "PM",
    },
  });

  // UI/UX
  const uiUxUser = await prisma.user.upsert({
    where: {
      email: "uiux@nodewave.local",
    },
    update: {
      name: "UI UX Engineer",
      passwordHash,
      role: "INTERNAL",
      departmentId: uiUxDepartment.id,
      deletedAt: null,
    },
    create: {
      name: "UI UX Engineer",
      email: "uiux@nodewave.local",
      passwordHash,
      role: "INTERNAL",
      departmentId: uiUxDepartment.id,
    },
  });

  // Frontend
  const frontendUser = await prisma.user.upsert({
    where: {
      email: "frontend@nodewave.local",
    },
    update: {
      name: "Frontend Engineer",
      passwordHash,
      role: "INTERNAL",
      departmentId: frontendDepartment.id,
      deletedAt: null,
    },
    create: {
      name: "Frontend Engineer",
      email: "frontend@nodewave.local",
      passwordHash,
      role: "INTERNAL",
      departmentId: frontendDepartment.id,
    },
  });

  // Backend
  const backendUser = await prisma.user.upsert({
    where: {
      email: "backend@nodewave.local",
    },
    update: {
      name: "Backend Engineer",
      passwordHash,
      role: "INTERNAL",
      departmentId: backendDepartment.id,
      deletedAt: null,
    },
    create: {
      name: "Backend Engineer",
      email: "backend@nodewave.local",
      passwordHash,
      role: "INTERNAL",
      departmentId: backendDepartment.id,
    },
  });

  // Client
  const client = await prisma.user.upsert({
    where: {
      email: "client@nodewave.local",
    },
    update: {
      name: "NodeWave Client",
      passwordHash,
      role: "CLIENT",
      departmentId: null,
      deletedAt: null,
    },
    create: {
      name: "NodeWave Client",
      email: "client@nodewave.local",
      passwordHash,
      role: "CLIENT",
    },
  });

  // Project
  const existingProject = await prisma.project.findFirst({
    where: {
      name: "NodeWave Demo Project",
      clientId: client.id,
    },
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        name: "NodeWave Demo Project",
        description: "Demo project for Fullstack Engineer assessment.",
        clientId: client.id,
      },
    }));

  // Project members
  const members = [uiUxUser.id, frontendUser.id, backendUser.id];

  for (const userId of members) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId,
        },
      },
      update: {
        deletedAt: null,
      },
      create: {
        projectId: project.id,
        userId,
      },
    });
  }

  // UI/UX Task
  const uiTask = await prisma.task.create({
    data: {
      projectId: project.id,
      title: "UI Design",
      description: "Design the application interface and user flow.",
      status: "DONE",
      department: "UI_UX",
      assigneeId: uiUxUser.id,
      createdById: pm.id,
      isClientVisible: true,
    },
  });

  // Backend Task
  const backendTask = await prisma.task.create({
    data: {
      projectId: project.id,
      title: "Backend API Integration",
      description: "Develop the backend API required by the frontend.",
      status: "IN_PROGRESS",
      department: "BACKEND",
      assigneeId: backendUser.id,
      createdById: pm.id,
      isClientVisible: true,
    },
  });

  // Frontend Task
  const frontendTask = await prisma.task.create({
    data: {
      projectId: project.id,
      title: "Frontend Slicing",
      description:
        "Implement the approved UI design in the frontend application.",
      status: "BLOCKED",
      department: "FRONTEND",
      assigneeId: frontendUser.id,
      createdById: pm.id,
      isClientVisible: true,
    },
  });

  // Dependencies
  await prisma.taskDependency.createMany({
    data: [
      {
        taskId: frontendTask.id,
        dependsOnTaskId: uiTask.id,
      },
      {
        taskId: frontendTask.id,
        dependsOnTaskId: backendTask.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("");
  console.log("Database seed completed.");
  console.log("");
  console.log("Seed accounts:");
  console.log("PM       : pm@nodewave.local");
  console.log("UI/UX    : uiux@nodewave.local");
  console.log("Frontend : frontend@nodewave.local");
  console.log("Backend  : backend@nodewave.local");
  console.log("Client   : client@nodewave.local");
  console.log("Password : Password123!");
  console.log("");
  console.log(`Project ID: ${project.id}`);
  console.log(`Frontend Task ID: ${frontendTask.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
