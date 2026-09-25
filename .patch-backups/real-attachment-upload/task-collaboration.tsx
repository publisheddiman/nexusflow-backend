"use client";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import {
  ExternalLink,
  FileText,
  MessageSquareText,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  createAttachment,
  deleteAttachment,
  getAttachments,
} from "@/lib/api/attachments";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "@/lib/api/comments";
import type { User } from "@/types/api";

type Props = {
  taskId: string;
  user: User;
  taskAssigneeId?: string | null;
};

function apiMessage(error: unknown) {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.message ===
      "string"
  ) {
    return error.response.data.message;
  }

  return "Request failed.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value?: number | null) {
  if (!value) return null;

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export function TaskCollaboration({
  taskId,
  user,
  taskAssigneeId,
}: Props) {
  const queryClient =
    useQueryClient();

  const [comment, setComment] =
    useState("");
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editingContent, setEditingContent] =
    useState("");
  const [commentBusy, setCommentBusy] =
    useState(false);
  const [attachmentBusy, setAttachmentBusy] =
    useState(false);
  const [message, setMessage] =
    useState("");

  const [fileName, setFileName] =
    useState("");
  const [fileUrl, setFileUrl] =
    useState("");
  const [fileSize, setFileSize] =
    useState("");
  const [mimeType, setMimeType] =
    useState("");

  const attachmentsQuery = useQuery({
    queryKey: [
      "task-attachments",
      taskId,
    ],
    queryFn: () =>
      getAttachments(taskId, {
        page: 1,
        rows: 100,
        orderKey: "createdAt",
        orderRule: "desc",
      }),
  });

  const commentsQuery = useQuery({
    queryKey: [
      "task-comments",
      taskId,
    ],
    enabled: user.role !== "CLIENT",
    queryFn: () =>
      getComments(taskId, {
        page: 1,
        rows: 100,
        orderKey: "createdAt",
        orderRule: "asc",
      }),
  });

  const attachments =
    attachmentsQuery.data?.data ?? [];
  const comments =
    commentsQuery.data?.data ?? [];

  const canUpload =
    user.role === "PM" ||
    (user.role === "INTERNAL" &&
      taskAssigneeId === user.id);

  const canComment =
    user.role === "PM" ||
    user.role === "INTERNAL";

  const sortedAttachments = useMemo(
    () =>
      [...attachments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
    [attachments],
  );

  async function refreshAttachments() {
    await queryClient.invalidateQueries({
      queryKey: [
        "task-attachments",
        taskId,
      ],
    });
  }

  async function refreshComments() {
    await queryClient.invalidateQueries({
      queryKey: [
        "task-comments",
        taskId,
      ],
    });
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const content = comment.trim();

    if (!content) return;

    setCommentBusy(true);
    setMessage("");

    try {
      await createComment(
        taskId,
        content,
      );
      setComment("");
      await refreshComments();
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setCommentBusy(false);
    }
  }

  async function saveEdit(
    commentId: string,
  ) {
    const content =
      editingContent.trim();

    if (!content) return;

    setCommentBusy(true);
    setMessage("");

    try {
      await updateComment(
        taskId,
        commentId,
        content,
      );
      setEditingId(null);
      setEditingContent("");
      await refreshComments();
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeComment(
    commentId: string,
  ) {
    setCommentBusy(true);
    setMessage("");

    try {
      await deleteComment(
        taskId,
        commentId,
      );
      await refreshComments();
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setCommentBusy(false);
    }
  }

  async function submitAttachment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = fileName.trim();
    const url = fileUrl.trim();

    if (!name || !url) return;

    setAttachmentBusy(true);
    setMessage("");

    try {
      const parsedSize =
        fileSize.trim()
          ? Number(fileSize)
          : undefined;

      await createAttachment(
        taskId,
        {
          fileName: name,
          fileUrl: url,
          ...(parsedSize &&
          Number.isFinite(parsedSize) &&
          parsedSize > 0
            ? {
                fileSize:
                  Math.round(
                    parsedSize,
                  ),
              }
            : {}),
          ...(mimeType.trim()
            ? {
                mimeType:
                  mimeType.trim(),
              }
            : {}),
        },
      );

      setFileName("");
      setFileUrl("");
      setFileSize("");
      setMimeType("");
      await refreshAttachments();
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function removeAttachment(
    attachmentId: string,
  ) {
    setAttachmentBusy(true);
    setMessage("");

    try {
      await deleteAttachment(
        taskId,
        attachmentId,
      );
      await refreshAttachments();
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setAttachmentBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-cyan-600" />
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.14em] text-cyan-600">
              ATTACHMENTS
            </div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">
              Work files
            </h3>
          </div>
        </div>

        {attachmentsQuery.isPending ? (
          <div className="mt-4 text-xs text-slate-400">
            Loading attachments...
          </div>
        ) : attachmentsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            Unable to load attachments.
          </div>
        ) : sortedAttachments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
            No work attachments yet.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {sortedAttachments.map(
              (attachment) => {
                const mayDelete =
                  user.role === "PM" ||
                  (user.role ===
                    "INTERNAL" &&
                    taskAssigneeId ===
                      user.id &&
                    attachment.uploadedById ===
                      user.id);

                return (
                  <div
                    key={attachment.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div className="flex min-w-0 gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <FileText className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 truncate text-xs font-semibold text-slate-700 hover:text-cyan-700"
                        >
                          <span className="truncate">
                            {attachment.fileName}
                          </span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>

                        <div className="mt-1 text-[10px] text-slate-400">
                          {formatDate(
                            attachment.createdAt,
                          )}
                          {formatBytes(
                            attachment.fileSize,
                          )
                            ? ` Â· ${formatBytes(
                                attachment.fileSize,
                              )}`
                            : ""}
                        </div>

                        {user.role !==
                          "CLIENT" &&
                          attachment.uploadedBy && (
                            <div className="mt-1 text-[10px] text-slate-400">
                              Uploaded by{" "}
                              {
                                attachment
                                  .uploadedBy
                                  .name
                              }
                            </div>
                          )}
                      </div>
                    </div>

                    {mayDelete && (
                      <button
                        type="button"
                        disabled={
                          attachmentBusy
                        }
                        onClick={() =>
                          void removeAttachment(
                            attachment.id,
                          )
                        }
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label="Delete attachment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        {canUpload ? (
          <form
            onSubmit={submitAttachment}
            className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="text-[11px] font-semibold text-slate-600">
              Add work attachment
            </div>

            <input
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value,
                )
              }
              placeholder="File name"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-400"
            />

            <input
              value={fileUrl}
              onChange={(event) =>
                setFileUrl(
                  event.target.value,
                )
              }
              placeholder="https://..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-400"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                min="1"
                value={fileSize}
                onChange={(event) =>
                  setFileSize(
                    event.target.value,
                  )
                }
                placeholder="File size (bytes)"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-400"
              />

              <input
                value={mimeType}
                onChange={(event) =>
                  setMimeType(
                    event.target.value,
                  )
                }
                placeholder="MIME type (optional)"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={
                  attachmentBusy ||
                  !fileName.trim() ||
                  !fileUrl.trim()
                }
              >
                <Paperclip className="size-3.5" />
                {attachmentBusy
                  ? "Adding..."
                  : "Add attachment"}
              </Button>
            </div>
          </form>
        ) : user.role === "INTERNAL" ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
            Only the assigned executor
            can upload work attachments
            to this task.
          </div>
        ) : null}
      </section>

      {user.role !== "CLIENT" && (
        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-cyan-600" />
            <div>
              <div className="text-[10px] font-extrabold tracking-[0.14em] text-cyan-600">
                INTERNAL COMMENTS
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                Team discussion
              </h3>
            </div>
          </div>

          {commentsQuery.isPending ? (
            <div className="mt-4 text-xs text-slate-400">
              Loading comments...
            </div>
          ) : commentsQuery.isError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              Unable to load internal comments.
            </div>
          ) : comments.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
              No internal comments yet.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {comments.map(
                (entry) => {
                  const own =
                    entry.user.id ===
                    user.id;
                  const mayDelete =
                    user.role ===
                      "PM" || own;

                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            {
                              entry.user
                                .name
                            }
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {formatDate(
                              entry.createdAt,
                            )}
                            {entry.updatedAt !==
                            entry.createdAt
                              ? " Â· edited"
                              : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {own && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(
                                  entry.id,
                                );
                                setEditingContent(
                                  entry.content,
                                );
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Edit comment"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}

                          {mayDelete && (
                            <button
                              type="button"
                              disabled={
                                commentBusy
                              }
                              onClick={() =>
                                void removeComment(
                                  entry.id,
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingId ===
                      entry.id ? (
                        <div className="mt-3">
                          <textarea
                            rows={3}
                            value={
                              editingContent
                            }
                            onChange={(
                              event,
                            ) =>
                              setEditingContent(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-cyan-400"
                          />

                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(
                                  null,
                                );
                                setEditingContent(
                                  "",
                                );
                              }}
                            >
                              <X className="size-3.5" />
                              Cancel
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                commentBusy ||
                                !editingContent.trim()
                              }
                              onClick={() =>
                                void saveEdit(
                                  entry.id,
                                )
                              }
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {
                            entry.content
                          }
                        </p>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}

          {canComment && (
            <form
              onSubmit={submitComment}
              className="mt-4"
            >
              <textarea
                rows={3}
                value={comment}
                onChange={(event) =>
                  setComment(
                    event.target.value,
                  )
                }
                placeholder="Write an internal comment..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-cyan-400 focus:bg-white"
              />

              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    commentBusy ||
                    !comment.trim()
                  }
                >
                  <Send className="size-3.5" />
                  {commentBusy
                    ? "Sending..."
                    : "Comment"}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
          {message}
        </div>
      )}
    </>
  );
}

