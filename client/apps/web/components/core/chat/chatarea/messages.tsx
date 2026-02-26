"use client";

import type { ToolUIPart } from "ai";

import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowReloadHorizontalIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  PencilEdit01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { memo, useCallback, useState } from "react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MessageVersion {
  id: string;
  content: string;
}

export interface MessageType {
  key: string;
  from: "user" | "assistant";
  sources?: { id?: string; href: string; title: string }[];
  versions: MessageVersion[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
  attachments?: {
    id: string;
    type: "file" | "image" | "text" | "video" | "audio";
    url: string;
    mediaType?: string;
    filename?: string;
  }[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

const CopyButton = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <MessageAction tooltip={copied ? "Copied!" : "Copy"} onClick={handleCopy} label="Copy">
      {copied ? (
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
      ) : (
        <HugeiconsIcon icon={Copy01Icon} size={14} />
      )}
    </MessageAction>
  );
});
CopyButton.displayName = "CopyButton";

interface LikeActionProps {
  isLiked: boolean;
  onToggle: () => void;
}
const LikeAction = memo(({ isLiked, onToggle }: LikeActionProps) => (
  <MessageAction label="Like" onClick={onToggle} tooltip="Like this response">
    <HugeiconsIcon icon={ThumbsUpIcon} size={14} className={isLiked ? "fill-current" : ""} />
  </MessageAction>
));
LikeAction.displayName = "LikeAction";

interface DislikeActionProps {
  isDisliked: boolean;
  onToggle: () => void;
}
const DislikeAction = memo(({ isDisliked, onToggle }: DislikeActionProps) => (
  <MessageAction label="Dislike" onClick={onToggle} tooltip="Dislike this response">
    <HugeiconsIcon icon={ThumbsDownIcon} size={14} className={isDisliked ? "fill-current" : ""} />
  </MessageAction>
));
DislikeAction.displayName = "DislikeAction";

// ─── User Edit Form ───────────────────────────────────────────────────────────

interface UserEditFormProps {
  initialContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

const UserEditForm = memo(({ initialContent, onSave, onCancel }: UserEditFormProps) => {
  const [value, setValue] = useState(initialContent);

  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        className="min-h-[80px] resize-none rounded-lg border border-border bg-secondary px-4 py-3 text-sm focus-visible:ring-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            onSave(value);
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <HugeiconsIcon icon={Cancel01Icon} size={14} className="mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(value)} disabled={!value.trim()}>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="mr-1" />
          Save & Send
        </Button>
      </div>
    </div>
  );
});
UserEditForm.displayName = "UserEditForm";

// ─── Single Message Item ─────────────────────────────────────────────────────

interface MessageItemProps {
  message: MessageType;
  isStreaming?: boolean;
  onRegenerate?: (messageKey: string) => void;
  onEditMessage?: (messageKey: string, newContent: string) => void;
  onSwitchBranch?: (versionId: string) => void;
}

const MessageItem = memo(({
  message,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onSwitchBranch,
}: MessageItemProps) => {
  const { versions, attachments, ...rest } = message;
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [isDisliked, setIsDisliked] = useState<Record<string, boolean>>({});

  const handleToggleLike = useCallback((versionId: string) => {
    setIsLiked((prev) => ({ ...prev, [versionId]: !prev[versionId] }));
    setIsDisliked((prev) => ({ ...prev, [versionId]: false }));
  }, []);

  const handleToggleDislike = useCallback((versionId: string) => {
    setIsDisliked((prev) => ({ ...prev, [versionId]: !prev[versionId] }));
    setIsLiked((prev) => ({ ...prev, [versionId]: false }));
  }, []);

  const handleEdit = useCallback((versionId: string) => {
    setEditingVersionId(versionId);
  }, []);

  const handleSaveEdit = useCallback(
    (newContent: string) => {
      onEditMessage?.(message.key, newContent);
      setEditingVersionId(null);
    },
    [message.key, onEditMessage]
  );

  const renderExtras = () => (
    <div className="gap-2 p-2">
      {attachments && attachments.length > 0 && (
        <Attachments className="mb-2" variant="grid">
          {attachments.map((attachment) => (
            // @ts-expect-error type override
            <Attachment data={attachment} key={attachment.id}>
              <AttachmentPreview />
            </Attachment>
          ))}
        </Attachments>
      )}

      {rest.sources && rest.sources.length > 0 && (
        <Sources className="p-0 m-0 gap-0">
          <SourcesTrigger count={rest.sources.length} />
          <SourcesContent>
            {rest.sources.map((source, index) => (
              <Source href={source.href} key={source.id || index} title={source.title} />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {rest.reasoning && (
        <Reasoning duration={rest.reasoning.duration}>
          <ReasoningTrigger />
          <ReasoningContent>{rest.reasoning.content}</ReasoningContent>
        </Reasoning>
      )}
    </div>
  );

  const renderToolbar = (version: MessageVersion) => (
    <MessageToolbar className={cn(rest.from === "user" ? "flex-row-reverse" : "", isStreaming && "justify-start")}>
      {versions.length > 1 && (
        <MessageBranchSelector>
          <MessageBranchPrevious />
          <MessageBranchPage />
          <MessageBranchNext />
        </MessageBranchSelector>
      )}
      <MessageActions>
        {rest.from === "assistant" && isStreaming ? (
          <AnimatedShinyText className="text-xs px-2 dark:text-neutral-400/70 text-neutral-600/70">
            Thinking...
          </AnimatedShinyText>
        ) : (
          <>
            <CopyButton content={version.content} />
            {rest.from === "assistant" && (
              <>
                <MessageAction
                  label="Retry"
                  tooltip="Regenerate response"
                  onClick={() => onRegenerate?.(rest.key)}
                >
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} />
                </MessageAction>
                <LikeAction
                  isLiked={isLiked[version.id] ?? false}
                  onToggle={() => handleToggleLike(version.id)}
                />
                <DislikeAction
                  isDisliked={isDisliked[version.id] ?? false}
                  onToggle={() => handleToggleDislike(version.id)}
                />
              </>
            )}
            {rest.from === "user" && (
              <MessageAction label="Edit" tooltip="Edit" onClick={() => handleEdit(version.id)}>
                <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
              </MessageAction>
            )}
          </>
        )}
      </MessageActions>
    </MessageToolbar>
  );

  const renderMessageContent = (version: MessageVersion) => (
    rest.from === "user" && editingVersionId === version.id ? (
      <UserEditForm
        initialContent={version.content}
        onSave={handleSaveEdit}
        onCancel={() => setEditingVersionId(null)}
      />
    ) : (
      <MessageContent>
        {rest.from === "assistant" ? (
          <MessageResponse
            className={cn(
              "[&_[data-streamdown=code-block]]:w-full",
              "[&_[data-streamdown=code-block-header]]:justify-between",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:!static",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:!-mt-8",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:!h-8",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:flex",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:items-center",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:justify-end",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:!top-auto",
              "[&_[data-streamdown=code-block]>div:has([data-streamdown=code-block-actions])]:!pointer-events-auto",
              "[&_[data-streamdown=code-block-actions]]:!border-none",
              "[&_[data-streamdown=code-block-actions]]:!bg-transparent",
              "[&_[data-streamdown=code-block-actions]]:![backdrop-filter:none]",
              "[&_[data-streamdown=code-block-actions]]:!shadow-none",
              "[&_[data-streamdown=code-block-actions]]:!p-0",
              "[&_[data-streamdown=code-block-actions]]:!rounded-none",
              "[&_[data-streamdown=code-block-actions]]:!pointer-events-auto"
            )}
          >
            {version.content}
          </MessageResponse>
        ) : (
          version.content
        )}
      </MessageContent>
    )
  );

  return (
    <Message from={rest.from} key={rest.key}>
      {versions.length > 1 ? (
        <MessageBranch
          defaultBranch={versions.length - 1}
          onBranchChange={(index) => {
            const version = versions[index];
            if (version && onSwitchBranch) {
              onSwitchBranch(version.id);
            }
          }}
        >
          <MessageBranchContent>
            {versions.map((version) => (
              <div key={`${rest.key}-${version.id}`} className="space-y-4">
                {renderExtras()}
                {renderMessageContent(version)}
                {editingVersionId !== version.id && renderToolbar(version)}
              </div>
            ))}
          </MessageBranchContent>
        </MessageBranch>
      ) : (
        <div key={`${rest.key}-${versions[0].id}`} className="space-y-4">
          {renderExtras()}
          {renderMessageContent(versions[0])}
          {editingVersionId !== versions[0].id && renderToolbar(versions[0])}
        </div>
      )}
    </Message>
  );
});

MessageItem.displayName = "MessageItem";

// ─── Messages Component ──────────────────────────────────────────────────────

interface MessagesProps {
  messages: MessageType[];
  streamingMessageId?: string | null;
  onRegenerate?: (messageKey: string) => void;
  onEditMessage?: (messageKey: string, newContent: string) => void;
  onSwitchBranch?: (versionId: string) => void;
}

export const Messages = ({
  messages,
  streamingMessageId,
  onRegenerate,
  onEditMessage,
  onSwitchBranch,
}: MessagesProps) => {
  return (
    <>
      {messages.map((message) => (
        <MessageItem
          key={message.key}
          message={message}
          isStreaming={
            streamingMessageId != null &&
            message.versions.some((v) => v.id === streamingMessageId)
          }
          onRegenerate={onRegenerate}
          onEditMessage={onEditMessage}
          onSwitchBranch={onSwitchBranch}
        />
      ))}
    </>
  );
};