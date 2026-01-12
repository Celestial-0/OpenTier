from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class MessageRole(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    MESSAGE_ROLE_UNSPECIFIED: _ClassVar[MessageRole]
    MESSAGE_ROLE_USER: _ClassVar[MessageRole]
    MESSAGE_ROLE_ASSISTANT: _ClassVar[MessageRole]
    MESSAGE_ROLE_SYSTEM: _ClassVar[MessageRole]

class ResourceType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    RESOURCE_TYPE_UNSPECIFIED: _ClassVar[ResourceType]
    RESOURCE_TYPE_TEXT: _ClassVar[ResourceType]
    RESOURCE_TYPE_MARKDOWN: _ClassVar[ResourceType]
    RESOURCE_TYPE_PDF: _ClassVar[ResourceType]
    RESOURCE_TYPE_HTML: _ClassVar[ResourceType]
    RESOURCE_TYPE_WEBSITE: _ClassVar[ResourceType]
    RESOURCE_TYPE_CODE: _ClassVar[ResourceType]

class ResourceStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    RESOURCE_STATUS_UNSPECIFIED: _ClassVar[ResourceStatus]
    RESOURCE_STATUS_QUEUED: _ClassVar[ResourceStatus]
    RESOURCE_STATUS_PROCESSING: _ClassVar[ResourceStatus]
    RESOURCE_STATUS_COMPLETED: _ClassVar[ResourceStatus]
    RESOURCE_STATUS_FAILED: _ClassVar[ResourceStatus]
    RESOURCE_STATUS_PARTIAL: _ClassVar[ResourceStatus]

class DocumentType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DOCUMENT_TYPE_UNSPECIFIED: _ClassVar[DocumentType]
    DOCUMENT_TYPE_TEXT: _ClassVar[DocumentType]
    DOCUMENT_TYPE_MARKDOWN: _ClassVar[DocumentType]
    DOCUMENT_TYPE_HTML: _ClassVar[DocumentType]
    DOCUMENT_TYPE_PDF: _ClassVar[DocumentType]
    DOCUMENT_TYPE_CODE: _ClassVar[DocumentType]
MESSAGE_ROLE_UNSPECIFIED: MessageRole
MESSAGE_ROLE_USER: MessageRole
MESSAGE_ROLE_ASSISTANT: MessageRole
MESSAGE_ROLE_SYSTEM: MessageRole
RESOURCE_TYPE_UNSPECIFIED: ResourceType
RESOURCE_TYPE_TEXT: ResourceType
RESOURCE_TYPE_MARKDOWN: ResourceType
RESOURCE_TYPE_PDF: ResourceType
RESOURCE_TYPE_HTML: ResourceType
RESOURCE_TYPE_WEBSITE: ResourceType
RESOURCE_TYPE_CODE: ResourceType
RESOURCE_STATUS_UNSPECIFIED: ResourceStatus
RESOURCE_STATUS_QUEUED: ResourceStatus
RESOURCE_STATUS_PROCESSING: ResourceStatus
RESOURCE_STATUS_COMPLETED: ResourceStatus
RESOURCE_STATUS_FAILED: ResourceStatus
RESOURCE_STATUS_PARTIAL: ResourceStatus
DOCUMENT_TYPE_UNSPECIFIED: DocumentType
DOCUMENT_TYPE_TEXT: DocumentType
DOCUMENT_TYPE_MARKDOWN: DocumentType
DOCUMENT_TYPE_HTML: DocumentType
DOCUMENT_TYPE_PDF: DocumentType
DOCUMENT_TYPE_CODE: DocumentType

class HealthCheckRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class HealthCheckResponse(_message.Message):
    __slots__ = ("status", "version", "uptime_seconds")
    STATUS_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    UPTIME_SECONDS_FIELD_NUMBER: _ClassVar[int]
    status: str
    version: str
    uptime_seconds: int
    def __init__(self, status: _Optional[str] = ..., version: _Optional[str] = ..., uptime_seconds: _Optional[int] = ...) -> None: ...

class ReadyCheckRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ReadyCheckResponse(_message.Message):
    __slots__ = ("ready", "dependencies", "dependency_status")
    class DependencyStatusEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: bool
        def __init__(self, key: _Optional[str] = ..., value: bool = ...) -> None: ...
    READY_FIELD_NUMBER: _ClassVar[int]
    DEPENDENCIES_FIELD_NUMBER: _ClassVar[int]
    DEPENDENCY_STATUS_FIELD_NUMBER: _ClassVar[int]
    ready: bool
    dependencies: _containers.RepeatedScalarFieldContainer[str]
    dependency_status: _containers.ScalarMap[str, bool]
    def __init__(self, ready: bool = ..., dependencies: _Optional[_Iterable[str]] = ..., dependency_status: _Optional[_Mapping[str, bool]] = ...) -> None: ...

class ChatRequest(_message.Message):
    __slots__ = ("user_id", "conversation_id", "message", "config", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    conversation_id: str
    message: str
    config: ChatConfig
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, user_id: _Optional[str] = ..., conversation_id: _Optional[str] = ..., message: _Optional[str] = ..., config: _Optional[_Union[ChatConfig, _Mapping]] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...

class ChatConfig(_message.Message):
    __slots__ = ("temperature", "max_tokens", "use_rag", "model", "context_limit")
    TEMPERATURE_FIELD_NUMBER: _ClassVar[int]
    MAX_TOKENS_FIELD_NUMBER: _ClassVar[int]
    USE_RAG_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    CONTEXT_LIMIT_FIELD_NUMBER: _ClassVar[int]
    temperature: float
    max_tokens: int
    use_rag: bool
    model: str
    context_limit: int
    def __init__(self, temperature: _Optional[float] = ..., max_tokens: _Optional[int] = ..., use_rag: bool = ..., model: _Optional[str] = ..., context_limit: _Optional[int] = ...) -> None: ...

class ChatResponse(_message.Message):
    __slots__ = ("conversation_id", "message_id", "response", "sources", "metrics", "created_at")
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_ID_FIELD_NUMBER: _ClassVar[int]
    RESPONSE_FIELD_NUMBER: _ClassVar[int]
    SOURCES_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    conversation_id: str
    message_id: str
    response: str
    sources: _containers.RepeatedCompositeFieldContainer[ContextChunk]
    metrics: ChatMetrics
    created_at: int
    def __init__(self, conversation_id: _Optional[str] = ..., message_id: _Optional[str] = ..., response: _Optional[str] = ..., sources: _Optional[_Iterable[_Union[ContextChunk, _Mapping]]] = ..., metrics: _Optional[_Union[ChatMetrics, _Mapping]] = ..., created_at: _Optional[int] = ...) -> None: ...

class ChatStreamChunk(_message.Message):
    __slots__ = ("conversation_id", "message_id", "token", "source", "metrics", "error", "is_final")
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_ID_FIELD_NUMBER: _ClassVar[int]
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    SOURCE_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    IS_FINAL_FIELD_NUMBER: _ClassVar[int]
    conversation_id: str
    message_id: str
    token: str
    source: ContextChunk
    metrics: ChatMetrics
    error: str
    is_final: bool
    def __init__(self, conversation_id: _Optional[str] = ..., message_id: _Optional[str] = ..., token: _Optional[str] = ..., source: _Optional[_Union[ContextChunk, _Mapping]] = ..., metrics: _Optional[_Union[ChatMetrics, _Mapping]] = ..., error: _Optional[str] = ..., is_final: bool = ...) -> None: ...

class ChatMetrics(_message.Message):
    __slots__ = ("tokens_used", "prompt_tokens", "completion_tokens", "latency_ms", "sources_retrieved")
    TOKENS_USED_FIELD_NUMBER: _ClassVar[int]
    PROMPT_TOKENS_FIELD_NUMBER: _ClassVar[int]
    COMPLETION_TOKENS_FIELD_NUMBER: _ClassVar[int]
    LATENCY_MS_FIELD_NUMBER: _ClassVar[int]
    SOURCES_RETRIEVED_FIELD_NUMBER: _ClassVar[int]
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    sources_retrieved: int
    def __init__(self, tokens_used: _Optional[int] = ..., prompt_tokens: _Optional[int] = ..., completion_tokens: _Optional[int] = ..., latency_ms: _Optional[float] = ..., sources_retrieved: _Optional[int] = ...) -> None: ...

class ContextChunk(_message.Message):
    __slots__ = ("chunk_id", "document_id", "content", "relevance_score", "document_title", "source_url", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    CHUNK_ID_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    RELEVANCE_SCORE_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_TITLE_FIELD_NUMBER: _ClassVar[int]
    SOURCE_URL_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    chunk_id: str
    document_id: str
    content: str
    relevance_score: float
    document_title: str
    source_url: str
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, chunk_id: _Optional[str] = ..., document_id: _Optional[str] = ..., content: _Optional[str] = ..., relevance_score: _Optional[float] = ..., document_title: _Optional[str] = ..., source_url: _Optional[str] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...

class GetConversationRequest(_message.Message):
    __slots__ = ("user_id", "conversation_id", "limit", "cursor")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    CURSOR_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    conversation_id: str
    limit: int
    cursor: str
    def __init__(self, user_id: _Optional[str] = ..., conversation_id: _Optional[str] = ..., limit: _Optional[int] = ..., cursor: _Optional[str] = ...) -> None: ...

class ConversationResponse(_message.Message):
    __slots__ = ("conversation_id", "messages", "next_cursor", "created_at", "updated_at", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    NEXT_CURSOR_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    conversation_id: str
    messages: _containers.RepeatedCompositeFieldContainer[ChatMessage]
    next_cursor: str
    created_at: int
    updated_at: int
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, conversation_id: _Optional[str] = ..., messages: _Optional[_Iterable[_Union[ChatMessage, _Mapping]]] = ..., next_cursor: _Optional[str] = ..., created_at: _Optional[int] = ..., updated_at: _Optional[int] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...

class ChatMessage(_message.Message):
    __slots__ = ("message_id", "role", "content", "sources", "created_at")
    MESSAGE_ID_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    SOURCES_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    message_id: str
    role: MessageRole
    content: str
    sources: _containers.RepeatedCompositeFieldContainer[ContextChunk]
    created_at: int
    def __init__(self, message_id: _Optional[str] = ..., role: _Optional[_Union[MessageRole, str]] = ..., content: _Optional[str] = ..., sources: _Optional[_Iterable[_Union[ContextChunk, _Mapping]]] = ..., created_at: _Optional[int] = ...) -> None: ...

class DeleteConversationRequest(_message.Message):
    __slots__ = ("user_id", "conversation_id")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    conversation_id: str
    def __init__(self, user_id: _Optional[str] = ..., conversation_id: _Optional[str] = ...) -> None: ...

class DeleteConversationResponse(_message.Message):
    __slots__ = ("success", "conversation_id")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    success: bool
    conversation_id: str
    def __init__(self, success: bool = ..., conversation_id: _Optional[str] = ...) -> None: ...

class AddResourceRequest(_message.Message):
    __slots__ = ("user_id", "resource_id", "text", "url", "file_content", "type", "title", "metadata", "config")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    FILE_CONTENT_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    resource_id: str
    text: str
    url: str
    file_content: bytes
    type: ResourceType
    title: str
    metadata: _containers.ScalarMap[str, str]
    config: IngestionConfig
    def __init__(self, user_id: _Optional[str] = ..., resource_id: _Optional[str] = ..., text: _Optional[str] = ..., url: _Optional[str] = ..., file_content: _Optional[bytes] = ..., type: _Optional[_Union[ResourceType, str]] = ..., title: _Optional[str] = ..., metadata: _Optional[_Mapping[str, str]] = ..., config: _Optional[_Union[IngestionConfig, _Mapping]] = ...) -> None: ...

class IngestionConfig(_message.Message):
    __slots__ = ("chunk_size", "chunk_overlap", "auto_clean", "generate_embeddings", "max_depth", "follow_links")
    CHUNK_SIZE_FIELD_NUMBER: _ClassVar[int]
    CHUNK_OVERLAP_FIELD_NUMBER: _ClassVar[int]
    AUTO_CLEAN_FIELD_NUMBER: _ClassVar[int]
    GENERATE_EMBEDDINGS_FIELD_NUMBER: _ClassVar[int]
    MAX_DEPTH_FIELD_NUMBER: _ClassVar[int]
    FOLLOW_LINKS_FIELD_NUMBER: _ClassVar[int]
    chunk_size: int
    chunk_overlap: int
    auto_clean: bool
    generate_embeddings: bool
    max_depth: int
    follow_links: bool
    def __init__(self, chunk_size: _Optional[int] = ..., chunk_overlap: _Optional[int] = ..., auto_clean: bool = ..., generate_embeddings: bool = ..., max_depth: _Optional[int] = ..., follow_links: bool = ...) -> None: ...

class AddResourceResponse(_message.Message):
    __slots__ = ("job_id", "resource_id", "status")
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    resource_id: str
    status: ResourceStatus
    def __init__(self, job_id: _Optional[str] = ..., resource_id: _Optional[str] = ..., status: _Optional[_Union[ResourceStatus, str]] = ...) -> None: ...

class GetResourceStatusRequest(_message.Message):
    __slots__ = ("job_id", "resource_id", "user_id")
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    resource_id: str
    user_id: str
    def __init__(self, job_id: _Optional[str] = ..., resource_id: _Optional[str] = ..., user_id: _Optional[str] = ...) -> None: ...

class ResourceStatusResponse(_message.Message):
    __slots__ = ("job_id", "resource_id", "status", "chunks_created", "error", "progress")
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    CHUNKS_CREATED_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    resource_id: str
    status: ResourceStatus
    chunks_created: int
    error: str
    progress: float
    def __init__(self, job_id: _Optional[str] = ..., resource_id: _Optional[str] = ..., status: _Optional[_Union[ResourceStatus, str]] = ..., chunks_created: _Optional[int] = ..., error: _Optional[str] = ..., progress: _Optional[float] = ...) -> None: ...

class ListResourcesRequest(_message.Message):
    __slots__ = ("user_id", "limit", "cursor", "type_filter", "status_filter")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    CURSOR_FIELD_NUMBER: _ClassVar[int]
    TYPE_FILTER_FIELD_NUMBER: _ClassVar[int]
    STATUS_FILTER_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    limit: int
    cursor: str
    type_filter: ResourceType
    status_filter: ResourceStatus
    def __init__(self, user_id: _Optional[str] = ..., limit: _Optional[int] = ..., cursor: _Optional[str] = ..., type_filter: _Optional[_Union[ResourceType, str]] = ..., status_filter: _Optional[_Union[ResourceStatus, str]] = ...) -> None: ...

class ListResourcesResponse(_message.Message):
    __slots__ = ("items", "next_cursor", "total_count")
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    NEXT_CURSOR_FIELD_NUMBER: _ClassVar[int]
    TOTAL_COUNT_FIELD_NUMBER: _ClassVar[int]
    items: _containers.RepeatedCompositeFieldContainer[ResourceItem]
    next_cursor: str
    total_count: int
    def __init__(self, items: _Optional[_Iterable[_Union[ResourceItem, _Mapping]]] = ..., next_cursor: _Optional[str] = ..., total_count: _Optional[int] = ...) -> None: ...

class ResourceItem(_message.Message):
    __slots__ = ("id", "type", "content", "status", "stats", "created_at", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    ID_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    STATS_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    id: str
    type: ResourceType
    content: str
    status: ResourceStatus
    stats: ResourceStats
    created_at: int
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, id: _Optional[str] = ..., type: _Optional[_Union[ResourceType, str]] = ..., content: _Optional[str] = ..., status: _Optional[_Union[ResourceStatus, str]] = ..., stats: _Optional[_Union[ResourceStats, _Mapping]] = ..., created_at: _Optional[int] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...

class ResourceStats(_message.Message):
    __slots__ = ("documents", "chunks")
    DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    CHUNKS_FIELD_NUMBER: _ClassVar[int]
    documents: int
    chunks: int
    def __init__(self, documents: _Optional[int] = ..., chunks: _Optional[int] = ...) -> None: ...

class DeleteResourceRequest(_message.Message):
    __slots__ = ("user_id", "resource_id")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    resource_id: str
    def __init__(self, user_id: _Optional[str] = ..., resource_id: _Optional[str] = ...) -> None: ...

class DeleteResourceResponse(_message.Message):
    __slots__ = ("success", "resource_id")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    RESOURCE_ID_FIELD_NUMBER: _ClassVar[int]
    success: bool
    resource_id: str
    def __init__(self, success: bool = ..., resource_id: _Optional[str] = ...) -> None: ...

class CancelIngestionRequest(_message.Message):
    __slots__ = ("user_id", "job_id")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    job_id: str
    def __init__(self, user_id: _Optional[str] = ..., job_id: _Optional[str] = ...) -> None: ...

class CancelIngestionResponse(_message.Message):
    __slots__ = ("success", "job_id", "message")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    success: bool
    job_id: str
    message: str
    def __init__(self, success: bool = ..., job_id: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class Document(_message.Message):
    __slots__ = ("id", "title", "content", "type", "source_url", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    SOURCE_URL_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    id: str
    title: str
    content: str
    type: DocumentType
    source_url: str
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, id: _Optional[str] = ..., title: _Optional[str] = ..., content: _Optional[str] = ..., type: _Optional[_Union[DocumentType, str]] = ..., source_url: _Optional[str] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...
