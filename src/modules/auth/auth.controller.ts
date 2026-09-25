import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { authService } from "./auth.service";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schema";

export class AuthController {
  async register(c: Context) {
    try {
      const body = await c.req.json();

      const result = registerSchema.safeParse(body);

      if (!result.success) {
        return c.json(
          {
            message: "Validation failed",
            errors: result.error.flatten(),
          },
          400,
        );
      }

      const {
        name,
        email,
        password,
        departmentId,
      } = result.data;

      const user = await authService.register(
        name,
        email,
        password,
        departmentId,
      );

      return c.json(
        {
          message: "Registration successful",
          data: user,
        },
        201,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";

      if (message === "Email already registered") {
        return c.json(
          {
            message,
          },
          409,
        );
      }

      return c.json(
        {
          message: "Registration failed",
        },
        500,
      );
    }
  }

  async login(c: Context) {
    try {
      const body = await c.req.json();

      const result = loginSchema.safeParse(body);

      if (!result.success) {
        return c.json(
          {
            message: "Validation failed",
            errors: result.error.flatten(),
          },
          400,
        );
      }

      const { email, password } = result.data;

      const resultLogin = await authService.login(email, password);

      return c.json({
        message: "Login successful",
        data: resultLogin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";

      if (message === "Invalid email or password") {
        return c.json(
          {
            message,
          },
          401,
        );
      }

      return c.json(
        {
          message: "Login failed",
        },
        500,
      );
    }
  }

  async updateProfile(
    c: Context<CurrentUserContext>,
  ) {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      const result =
        updateProfileSchema.safeParse(body);

      if (!result.success) {
        return c.json(
          {
            message: "Validation failed",
            errors: result.error.flatten(),
          },
          400,
        );
      }

      const updatedUser =
        await authService.updateProfile(
          user.id,
          result.data,
        );

      return c.json({
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch {
      return c.json(
        {
          message: "Unable to update profile",
        },
        500,
      );
    }
  }

  async uploadAvatar(
    c: Context<CurrentUserContext>,
  ) {
    try {
      const user = c.get("user");
      const body = await c.req.parseBody();

      const file = body.avatar;

      if (!(file instanceof File)) {
        return c.json(
          {
            message: "Avatar file is required",
          },
          400,
        );
      }

      const allowedTypes: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension =
        allowedTypes[file.type];

      if (!extension) {
        return c.json(
          {
            message:
              "Only JPG, PNG, and WebP images are allowed",
          },
          400,
        );
      }

      const maxSize =
        2 * 1024 * 1024;

      if (file.size > maxSize) {
        return c.json(
          {
            message:
              "Profile picture must be 2 MB or smaller",
          },
          400,
        );
      }

      const fileName =
        `${user.id}-${crypto.randomUUID()}.${extension}`;

      const filePath =
        `./uploads/avatars/${fileName}`;

      await Bun.write(
        filePath,
        file,
      );

      const origin =
        new URL(c.req.url).origin;

      const avatarUrl =
        `${origin}/uploads/avatars/${fileName}`;

      const updatedUser =
        await authService.updateProfile(
          user.id,
          {
            avatarUrl,
          },
        );

      return c.json({
        message:
          "Profile picture updated successfully",
        data: updatedUser,
      });
    } catch {
      return c.json(
        {
          message:
            "Unable to upload profile picture",
        },
        500,
      );
    }
  }

  async logout(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");
      const sessionId = c.get("sessionId");

      await authService.logout(user.id, sessionId);

      return c.json({
        message: "Logout successful",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";

      if (message === "Session not found or already revoked") {
        return c.json(
          {
            message,
          },
          401,
        );
      }

      return c.json(
        {
          message: "Logout failed",
        },
        500,
      );
    }
  }
}

export const authController = new AuthController();






