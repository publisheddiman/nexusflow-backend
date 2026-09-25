import {
  BuildQueryFilter,
  extractQueryFromParams,
  type FilteringQuery,
  type QueryParams,
} from "@nodewave/prisma-ezfilter";

export type AuditListQueryParams = QueryParams;

const auditQueryBuilder = new BuildQueryFilter({
  allowedFields: [
    "id",
    "userId",
    "changedColumn",
    "oldValue",
    "newValue",
    "createdAt",
  ],
  maxPageSize: 100,
  defaultPageSize: 20,
  defaultSearchMode: "insensitive",
  forbiddenFields: ["taskId"],
});

export function buildAuditListQuery(params: AuditListQueryParams) {
  let filteringQuery: FilteringQuery;

  try {
    filteringQuery = extractQueryFromParams(params);
  } catch {
    throw new Error("Invalid audit query parameters");
  }

  const result = auditQueryBuilder.build(filteringQuery);

  if (!result.validation.isValid) {
    throw new Error(
      result.validation.errors[0] ?? "Invalid audit query parameters",
    );
  }

  return {
    where: result.query.where,
    orderBy: result.query.orderBy ?? { createdAt: "asc" as const },
    take: result.query.take,
    skip: result.query.skip,
    page: filteringQuery.page ?? 1,
    rows: filteringQuery.rows ?? 20,
  };
}
