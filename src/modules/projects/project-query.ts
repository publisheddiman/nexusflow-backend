import {
  BuildQueryFilter,
  extractQueryFromParams,
  type FilteringQuery,
  type QueryParams,
} from "@nodewave/prisma-ezfilter";
import type { AuthUser } from "../auth/type";

export type ProjectListQueryParams = QueryParams;

type UserRole = AuthUser["role"];

const PM_INTERNAL_FIELDS = [
  "id",
  "name",
  "description",
  "clientId",
  "createdAt",
  "updatedAt",
] as const;

const CLIENT_FIELDS = [
  "id",
  "name",
  "description",
  "createdAt",
  "updatedAt",
] as const;

function createBuilder(allowedFields: readonly string[]) {
  return new BuildQueryFilter({
    allowedFields: [...allowedFields],
    maxPageSize: 100,
    defaultPageSize: 10,
    defaultSearchMode: "insensitive",
    forbiddenFields: ["deletedAt"],
  });
}

const builders = {
  PM: createBuilder(PM_INTERNAL_FIELDS),
  INTERNAL: createBuilder(PM_INTERNAL_FIELDS),
  CLIENT: createBuilder(CLIENT_FIELDS),
} as const;

const allowedFieldsByRole: Record<UserRole, readonly string[]> = {
  PM: PM_INTERNAL_FIELDS,
  INTERNAL: PM_INTERNAL_FIELDS,
  CLIENT: CLIENT_FIELDS,
};

function validateRoleFields(
  filteringQuery: FilteringQuery,
  role: UserRole,
) {
  const allowed = new Set<string>(allowedFieldsByRole[role]);

  const requestedFields = [
    ...Object.keys(filteringQuery.filters ?? {}),
    ...Object.keys(filteringQuery.searchFilters ?? {}),
    ...(filteringQuery.rangedFilters ?? []).map(
      (range) => range.key,
    ),
    ...(filteringQuery.orderKey
      ? [filteringQuery.orderKey]
      : []),
  ];

  const invalidField = requestedFields.find(
    (field) => !allowed.has(field),
  );

  if (invalidField) {
    throw new Error(
      `Field "${invalidField}" is not allowed for role ${role}`,
    );
  }
}

export function buildProjectListQuery(
  params: ProjectListQueryParams,
  role: UserRole,
) {
  let filteringQuery: FilteringQuery;

  try {
    filteringQuery = extractQueryFromParams(params);
  } catch {
    throw new Error("Invalid project query parameters");
  }

  validateRoleFields(filteringQuery, role);

  const result = builders[role].build(filteringQuery);

  if (!result.validation.isValid) {
    throw new Error(
      result.validation.errors[0] ??
        "Invalid project query parameters",
    );
  }

  return {
    where: result.query.where,
    orderBy:
      result.query.orderBy ?? {
        createdAt: "desc" as const,
      },
    take: result.query.take,
    skip: result.query.skip,
    page: filteringQuery.page ?? 1,
    rows: filteringQuery.rows ?? 10,
  };
}
