import type { Context } from "hono";
import type { CurrentUserContext } from "../../middleware/current-user.middleware";
import { usersService } from "./users.service";

export class UsersController {
  async getUsers(c: Context<CurrentUserContext>) {
    try {
      const user = c.get("user");

      const users = await usersService.getUsers(user);

      return c.json({
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve users";

      if (message === "Only PM can view users") {
        return c.json({ message }, 403);
      }

      return c.json(
        {
          message: "Failed to retrieve users",
        },
        500,
      );
    }
  }
}

export const usersController = new UsersController();
