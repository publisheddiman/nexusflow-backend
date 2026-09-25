import {
  BuildQueryFilter,
  extractQueryFromParams,
  type FilteringQuery,
  type QueryParams,
} from "@nodewave/prisma-ezfilter";
import type { AuthUser } from "../auth/type";

export type AttachmentListQueryParams = QueryParams;
type UserRole = AuthUser["role"];

const INTERNAL_FIELDS = [
  "id",
  "fileName",
  "fileUrl",
  "fileSize",
  "mimeType",
  "uploadedById",
  "createdAt",
] as const;

const CLIENT_FIELDS = [
  "id",
  "fileName",
  "fileUrl",
  "fileSize",
  "mimeType",
  "createdAt",
] as const;

function createBuilder(fields: readonly string[]) {
  return new BuildQueryFilter({
    allowedFields: [...fields],
    maxPageSize: 100,
    defaultPageSize: 10,
    defaultSearchMode: "insensitive",
    forbiddenFields: ["deletedAt", "taskId"],
  });
}

const builders = {
  PM: createBuilder(INTERNAL_FIELDS),
  INTERNAL: createBuilder(INTERNAL_FIELDS),
  CLIENT: createBuilder(CLIENT_FIELDS),
} as const;

export function buildAttachmentListQuery(
  params: AttachmentListQueryParams,
  role: UserRole,
) {
  let filteringQuery: FilteringQuery;

  try {
    filteringQuery = extractQueryFromParams(params);
  } catch {
    throw new Error("Invalid attachment query parameters");
  }

  const result = builders[role].build(filteringQuery);

  if (!result.validation.isValid) {
    throw new Error(
      result.validation.errors[0] ??
        "Invalid attachment query parameters",
    );
  }

  return {
    where: result.query.where,
    orderBy: result.query.orderBy ?? { createdAt: "desc" as const },
    take: result.query.take,
    skip: result.query.skip,
    page: filteringQuery.page ?? 1,
    rows: filteringQuery.rows ?? 10,
  };
}
