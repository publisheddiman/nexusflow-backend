import { api } from "@/lib/api/client";
import {
  buildListParams,
  type ListQuery,
} from "@/lib/api/query";
import type {
  PaginatedResponse,
} from "@/types/api";

export type AttachmentUploader = {
  id: string;
  name: string;
  email: string;
  departmentId?: string | null;
};

export type AttachmentRecord = {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedById?: string;
  createdAt: string;
  uploadedBy?: AttachmentUploader;
};

export type CreateAttachmentPayload = {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
};

export async function getAttachments(
  taskId: string,
  query: ListQuery = {},
) {
  const response = await api.get<
    PaginatedResponse<AttachmentRecord>
  >(`/tasks/${taskId}/attachments`, {
    params: buildListParams(query),
  });

  return response.data;
}

export async function createAttachment(
  taskId: string,
  payload: CreateAttachmentPayload,
) {
  const response = await api.post<{
    message: string;
    data: AttachmentRecord;
  }>(
    `/tasks/${taskId}/attachments`,
    payload,
  );

  return response.data.data;
}

export async function deleteAttachment(
  taskId: string,
  attachmentId: string,
) {
  const response = await api.delete<{
    message: string;
    data: {
      id: string;
      deletedAt: string;
    };
  }>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
  );

  return response.data.data;
}

