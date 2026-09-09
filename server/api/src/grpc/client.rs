use std::time::Duration;
use tokio::time::sleep;
use tonic::transport::{Channel, Endpoint};
use uuid::Uuid;

use crate::grpc::proto::opentier::intelligence::v1 as pb;
use crate::grpc::proto::opentier::intelligence::v1::chat_client::ChatClient;
use crate::grpc::proto::opentier::intelligence::v1::health_client::HealthClient;
use crate::grpc::proto::opentier::intelligence::v1::resource_service_client::ResourceServiceClient;

/// Per-RPC timeout configuration
#[derive(Clone)]
pub struct RpcTimeouts {
    /// Timeout for chat operations (default: 120s for LLM inference)
    pub chat: Duration,
    /// Timeout for streaming operations (default: 300s or 5 minutes)
    pub stream: Duration,
    /// Timeout for resource operations (default: 300s for large ingestions)
    pub resource: Duration,
    /// Timeout for health checks (default: 5s)
    pub health: Duration,
}

/// Retry configuration for transient failures
#[derive(Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Initial backoff duration
    pub initial_backoff: Duration,
    /// Maximum backoff duration
    pub max_backoff: Duration,
    /// Backoff multiplier (exponential factor)
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_backoff: Duration::from_millis(100),
            max_backoff: Duration::from_secs(10),
            backoff_multiplier: 2.0,
        }
    }
}

impl Default for RpcTimeouts {
    fn default() -> Self {
        Self {
            chat: Duration::from_secs(1200),
            stream: Duration::from_secs(300),
            resource: Duration::from_secs(3000),
            health: Duration::from_secs(5),
        }
    }
}

/// gRPC client for intelligence service
#[derive(Clone)]
pub struct IntelligenceClient {
    chat_client: ChatClient<Channel>,
    resource_client: ResourceServiceClient<Channel>,
    health_client: HealthClient<Channel>,
    timeouts: RpcTimeouts,
    retry_config: RetryConfig,
}

/// Check if a gRPC status code is retryable
///  Only retry transient failures
fn is_retryable(status: &tonic::Status) -> bool {
    matches!(
        status.code(),
        tonic::Code::Unavailable
            | tonic::Code::DeadlineExceeded
            | tonic::Code::ResourceExhausted
            | tonic::Code::Aborted
    )
}

impl IntelligenceClient {
    /// Connect to intelligence service with default timeouts
    pub async fn connect(uri: &str) -> Result<Self, tonic::transport::Error> {
        Self::connect_with_config(uri, RpcTimeouts::default(), RetryConfig::default()).await
    }

    /// Create a lazy connection that will connect on first use
    /// This allows the API to start even if Intelligence service is temporarily unavailable
    pub async fn connect_lazy(uri: &str) -> Result<Self, tonic::transport::Error> {
        Self::connect_lazy_with_config(uri, RpcTimeouts::default(), RetryConfig::default()).await
    }

    /// Connect to intelligence service with custom timeouts
    pub async fn connect_with_timeouts(
        uri: &str,
        timeouts: RpcTimeouts,
    ) -> Result<Self, tonic::transport::Error> {
        Self::connect_with_config(uri, timeouts, RetryConfig::default()).await
    }

    /// Create a lazy connection with custom configuration
    pub async fn connect_lazy_with_config(
        uri: &str,
        timeouts: RpcTimeouts,
        retry_config: RetryConfig,
    ) -> Result<Self, tonic::transport::Error> {
        // Use the longest timeout as the channel default
        let max_timeout = timeouts.chat.max(timeouts.stream).max(timeouts.resource);

        let endpoint = Endpoint::from_shared(uri.to_string())?
            .timeout(max_timeout)
            .connect_timeout(Duration::from_secs(10))
            .tcp_keepalive(Some(Duration::from_secs(60)))
            .http2_keep_alive_interval(Duration::from_secs(30))
            .keep_alive_while_idle(true);

        // Use connect_lazy instead of connect - defers connection to first request
        let channel = endpoint.connect_lazy();

        tracing::info!("Created lazy connection to intelligence service at {}", uri);

        Ok(Self {
            chat_client: ChatClient::new(channel.clone()),
            resource_client: ResourceServiceClient::new(channel.clone()),
            health_client: HealthClient::new(channel),
            timeouts,
            retry_config,
        })
    }

    /// Connect to intelligence service with custom timeouts and retry config
    ///  Add retry configuration
    pub async fn connect_with_config(
        uri: &str,
        timeouts: RpcTimeouts,
        retry_config: RetryConfig,
    ) -> Result<Self, tonic::transport::Error> {
        // Use the longest timeout as the channel default
        // Per-RPC timeouts are set via request metadata
        let max_timeout = timeouts.chat.max(timeouts.stream).max(timeouts.resource);

        let endpoint = Endpoint::from_shared(uri.to_string())?
            .timeout(max_timeout)
            .connect_timeout(Duration::from_secs(10))
            .tcp_keepalive(Some(Duration::from_secs(60)))
            .http2_keep_alive_interval(Duration::from_secs(30))
            .keep_alive_while_idle(true);

        let channel = endpoint.connect().await?;

        tracing::info!("Connected to intelligence service at {}", uri);

        Ok(Self {
            chat_client: ChatClient::new(channel.clone()),
            resource_client: ResourceServiceClient::new(channel.clone()),
            health_client: HealthClient::new(channel),
            timeouts,
            retry_config,
        })
    }

    /// Create a request with the specified timeout
    fn request_with_timeout<T>(&self, inner: T, timeout: Duration) -> tonic::Request<T> {
        let mut request = tonic::Request::new(inner);
        request.set_timeout(timeout);
        request
    }

    /// Create a request with the specified timeout and a correlation ID for tracing.
    /// Propagate the caller-supplied correlation_id (from the HTTP
    /// `X-Correlation-ID` header) so the trace chain is unbroken; generate a
    /// fresh one only when none was provided.
    fn request_with_correlation<T>(
        &self,
        inner: T,
        timeout: Duration,
        correlation_id: Option<String>,
    ) -> tonic::Request<T> {
        let mut request = tonic::Request::new(inner);
        request.set_timeout(timeout);

        let correlation_id = correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        request.metadata_mut().insert(
            "x-correlation-id",
            correlation_id
                .parse()
                .unwrap_or_else(|_| "unknown".parse().unwrap()),
        );

        request
    }

    /// Calculate next backoff duration with exponential growth
    fn next_backoff(&self, current: Duration) -> Duration {
        std::cmp::min(
            Duration::from_secs_f64(current.as_secs_f64() * self.retry_config.backoff_multiplier),
            self.retry_config.max_backoff,
        )
    }

    /// Check if we should retry based on attempt count and status
    fn should_retry(&self, status: &tonic::Status, attempts: u32) -> bool {
        is_retryable(status) && attempts < self.retry_config.max_retries
    }

    /// Log retry attempt
    fn log_retry(&self, status: &tonic::Status, backoff: Duration, attempts: u32) {
        tracing::warn!(
            "gRPC call failed with {:?}, retrying in {:?} (attempt {}/{})",
            status.code(),
            backoff,
            attempts,
            self.retry_config.max_retries
        );
    }

    // Chat Methods
    pub async fn send_message(
        &mut self,
        request: pb::ChatRequest,
        correlation_id: Option<String>,
    ) -> Result<tonic::Response<pb::ChatResponse>, tonic::Status> {
        // Note: send_message is NOT idempotent, so we don't retry to avoid duplicate messages
        // Use correlation ID for distributed tracing
        let req = self.request_with_correlation(request, self.timeouts.chat, correlation_id);
        self.chat_client.send_message(req).await
    }

    pub async fn stream_chat(
        &mut self,
        request: pb::ChatRequest,
        correlation_id: Option<String>,
    ) -> Result<tonic::Response<tonic::codec::Streaming<pb::ChatStreamChunk>>, tonic::Status> {
        // Note: stream_chat is NOT idempotent, so we don't retry
        // Use correlation ID for distributed tracing
        let req = self.request_with_correlation(request, self.timeouts.stream, correlation_id);
        self.chat_client.stream_chat(req).await
    }

    pub async fn generate_title(
        &mut self,
        request: pb::GenerateTitleRequest,
    ) -> Result<tonic::Response<pb::GenerateTitleResponse>, tonic::Status> {
        // Title generation is idempotent (same input = same output), safe to retry
        let mut attempts = 0;
        let mut backoff = self.retry_config.initial_backoff;

        loop {
            let req = self.request_with_timeout(request.clone(), self.timeouts.chat);
            match self.chat_client.generate_title(req).await {
                Ok(result) => return Ok(result),
                Err(status) if self.should_retry(&status, attempts) => {
                    attempts += 1;
                    self.log_retry(&status, backoff, attempts);
                    sleep(backoff).await;
                    backoff = self.next_backoff(backoff);
                }
                Err(status) => return Err(status),
            }
        }
    }

    // Resource Methods
    pub async fn add_resource(
        &mut self,
        request: pb::AddResourceRequest,
    ) -> Result<tonic::Response<pb::AddResourceResponse>, tonic::Status> {
        // Note: add_resource is NOT idempotent unless resource_id is provided
        // Only retry if resource_id is set (makes it idempotent)
        if request.resource_id.is_empty() {
            let req = self.request_with_timeout(request, self.timeouts.resource);
            self.resource_client.add_resource(req).await
        } else {
            //  Retry when resource_id provided (idempotent)
            let mut attempts = 0;
            let mut backoff = self.retry_config.initial_backoff;

            loop {
                let req = self.request_with_timeout(request.clone(), self.timeouts.resource);
                match self.resource_client.add_resource(req).await {
                    Ok(result) => return Ok(result),
                    Err(status) if self.should_retry(&status, attempts) => {
                        attempts += 1;
                        self.log_retry(&status, backoff, attempts);
                        sleep(backoff).await;
                        backoff = self.next_backoff(backoff);
                    }
                    Err(status) => return Err(status),
                }
            }
        }
    }

    pub async fn get_resource_status(
        &mut self,
        request: pb::GetResourceStatusRequest,
    ) -> Result<tonic::Response<pb::ResourceStatusResponse>, tonic::Status> {
        //  Retry for read-only operations
        let mut attempts = 0;
        let mut backoff = self.retry_config.initial_backoff;

        loop {
            let req = self.request_with_timeout(request.clone(), self.timeouts.resource);
            match self.resource_client.get_resource_status(req).await {
                Ok(result) => return Ok(result),
                Err(status) if self.should_retry(&status, attempts) => {
                    attempts += 1;
                    self.log_retry(&status, backoff, attempts);
                    sleep(backoff).await;
                    backoff = self.next_backoff(backoff);
                }
                Err(status) => return Err(status),
            }
        }
    }

    pub async fn list_resources(
        &mut self,
        request: pb::ListResourcesRequest,
    ) -> Result<tonic::Response<pb::ListResourcesResponse>, tonic::Status> {
        //  Retry for read-only operations
        let mut attempts = 0;
        let mut backoff = self.retry_config.initial_backoff;

        loop {
            let req = self.request_with_timeout(request.clone(), self.timeouts.resource);
            match self.resource_client.list_resources(req).await {
                Ok(result) => return Ok(result),
                Err(status) if self.should_retry(&status, attempts) => {
                    attempts += 1;
                    self.log_retry(&status, backoff, attempts);
                    sleep(backoff).await;
                    backoff = self.next_backoff(backoff);
                }
                Err(status) => return Err(status),
            }
        }
    }

    pub async fn delete_resource(
        &mut self,
        request: pb::DeleteResourceRequest,
    ) -> Result<tonic::Response<pb::DeleteResourceResponse>, tonic::Status> {
        //  Delete is idempotent, safe to retry
        let mut attempts = 0;
        let mut backoff = self.retry_config.initial_backoff;

        loop {
            let req = self.request_with_timeout(request.clone(), self.timeouts.resource);
            match self.resource_client.delete_resource(req).await {
                Ok(result) => return Ok(result),
                Err(status) if self.should_retry(&status, attempts) => {
                    attempts += 1;
                    self.log_retry(&status, backoff, attempts);
                    sleep(backoff).await;
                    backoff = self.next_backoff(backoff);
                }
                Err(status) => return Err(status),
            }
        }
    }

    pub async fn reembed_all(
        &mut self,
        model_slug: Option<String>,
    ) -> Result<tonic::Response<pb::ReembedAllResponse>, tonic::Status> {
        let req =
            self.request_with_timeout(pb::ReembedAllRequest { model_slug }, self.timeouts.resource);
        self.resource_client.reembed_all(req).await
    }

    // Health Methods
    pub async fn check_health(
        &mut self,
    ) -> Result<tonic::Response<pb::HealthCheckResponse>, tonic::Status> {
        //  Retry for health checks
        let mut attempts = 0;
        let mut backoff = self.retry_config.initial_backoff;

        loop {
            let req = self.request_with_timeout(pb::HealthCheckRequest {}, self.timeouts.health);
            match self.health_client.check(req).await {
                Ok(result) => return Ok(result),
                Err(status) if self.should_retry(&status, attempts) => {
                    attempts += 1;
                    self.log_retry(&status, backoff, attempts);
                    sleep(backoff).await;
                    backoff = self.next_backoff(backoff);
                }
                Err(status) => return Err(status),
            }
        }
    }
}
