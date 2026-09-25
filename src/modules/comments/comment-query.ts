import {
  BuildQueryFilter,
  extractQueryFromParams,
  type FilteringQuery,
  type QueryParams,
} from "@nodewave/prisma-ezfilter";

export type CommentListQueryParams = QueryParams;

const COMMENT_ALLOWED_FIELDS = [
  "id",
  "content",
  "createdAt",
  "updatedAt",
] as const;

const commentQueryBuilder = new BuildQueryFilter({
  allowedFields: [...COMMENT_ALLOWED_FIELDS],
  maxPageSize: 100,
  defaultPageSize: 10,
  defaultSearchMode: "insensitive",
  forbiddenFields: [
    "deletedAt",
    "userId",
    "taskId",
  ],
});

export function buildCommentListQuery(
  params: CommentListQueryParams,
) {
  let filteringQuery: FilteringQuery;

  try {
    filteringQuery = extractQueryFromParams(params);
  } catch {
    throw new Error("Invalid comment query parameters");
  }

  const result = commentQueryBuilder.build(filteringQuery);

  if (!result.validation.isValid) {
    throw new Error(
      result.validation.errors[0] ??
        "Invalid comment query parameters",
    );
  }

  return {
    where: result.query.where,
    orderBy:
      result.query.orderBy ?? {
        createdAt: "asc" as const,
      },
    take: result.query.take,
    skip: result.query.skip,
    page: filteringQuery.page ?? 1,
    rows: filteringQuery.rows ?? 10,
  };
}
