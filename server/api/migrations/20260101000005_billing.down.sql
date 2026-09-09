-- Down: Billing & Events
DROP TABLE IF EXISTS event_outbox CASCADE;
DROP TABLE IF EXISTS credit_holds CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS user_credit_balances CASCADE;
