use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DataPoint {
    pub label: String,
    pub value: i32,
}

#[derive(Debug, Serialize)]
pub struct MetricsOverview {
    pub total_users: i32,
    pub active_users_24h: i32,
    pub total_conversations: i32,
    pub total_messages: i32,
    pub user_growth: Vec<DataPoint>,
    pub message_activity: Vec<DataPoint>,
}
