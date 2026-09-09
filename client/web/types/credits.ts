// ============================================================================
// CREDITS & BILLING TYPES
// ============================================================================

export interface UserCreditSummary {
    balance: number;
    held: number;
    total_spent: number;
    total_granted: number;
    total_tokens_in: number;
    total_tokens_out: number;
    total_messages: number;
}

export type CreditTransactionReason =
    | "signup_bonus"
    | "usage"
    | "admin_adjustment"
    | "grant"
    | "refund"
    | string;

export interface CreditTransactionItem {
    id: string;
    delta: number;
    balance_after: number;
    reason: CreditTransactionReason;
    model_name: string | null;
    model_slug: string | null;
    tokens_in: number;
    tokens_out: number;
    cost_input: number;
    cost_output: number;
    conversation_id: string | null;
    created_at: string;
}

export interface UserTransactionsResponse {
    transactions: CreditTransactionItem[];
    total: number;
    limit: number;
    offset: number;
}

export interface ModelUsageItem {
    model_name: string;
    model_slug: string;
    tokens_in: number;
    tokens_out: number;
    total_cost: number;
    request_count: number;
}

export interface PlatformCreditsStats {
    total_balance_circulating: number;
    total_held: number;
    total_burned_lifetime: number;
    total_granted_lifetime: number;
    active_funded_users: number;
    burned_24h: number;
    granted_24h: number;
}

export interface AdjustCreditsRequest {
    delta: number;
    reason?: "admin_adjustment" | "grant" | "refund";
    note?: string;
}

export interface AdjustCreditsResponse {
    user_id: string;
    delta: number;
    new_balance: number;
    transaction_id: string;
    message: string;
}

export interface AdminUserCreditsResponse {
    user_id: string;
    summary: UserCreditSummary;
    recent_transactions: CreditTransactionItem[];
}
