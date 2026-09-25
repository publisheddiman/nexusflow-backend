import {
  BuildQueryFilter,
  extractQueryFromParams,
  type FilteringQuery,
  type QueryParams,
} from "@nodewave/prisma-ezfilter";

export type DependencyListQueryParams = QueryParams;

const dependencyQueryBuilder = new BuildQueryFilter({
  allowedFields: ["id", "dependsOnTaskId", "createdAt"],
  maxPageSize: 100,
  defaultPageSize: 10,
  defaultSearchMode: "insensitive",
  forbiddenFields: ["taskId", "deletedAt"],
});

export function buildDependencyListQuery(
  params: DependencyListQueryParams,
) {
  let filteringQuery: FilteringQuery;

  try {
    filteringQuery = extractQueryFromParams(params);
  } catch {
    throw new Error("Invalid dependency query parameters");
  }

  const result = dependencyQueryBuilder.build(filteringQuery);

  if (!result.validation.isValid) {
    throw new Error(
      result.validation.errors[0] ??
        "Invalid dependency query parameters",
    );
  }

  return {
    where: result.query.where,
    orderBy: result.query.orderBy ?? { createdAt: "asc" as const },
    take: result.query.take,
    skip: result.query.skip,
    page: filteringQuery.page ?? 1,
    rows: filteringQuery.rows ?? 10,
  };
}

