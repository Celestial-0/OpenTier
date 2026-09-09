import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
    AdjustCreditsRequest,
    AdjustCreditsResponse,
    CreditTransactionItem,
    ModelUsageItem,
    PlatformCreditsStats,
    UserCreditSummary,
} from "@/types/credits";
import {
    adjustUserCreditsApi,
    fetchCreditsStatsApi,
    fetchUserCreditsApi,
    fetchUserCreditTransactionsApi,
    fetchUserUsageSummaryApi,
} from "@/lib/api/credits-api";

interface CreditsState {
    // User Data
    summary: UserCreditSummary | null;
    transactions: CreditTransactionItem[];
    totalTransactions: number;
    transactionLimit: number;
    transactionOffset: number;
    selectedReasonFilter: string;
    modelUsage: ModelUsageItem[];

    // Platform Admin Data
    platformStats: PlatformCreditsStats | null;

    // Loading states
    isLoadingSummary: boolean;
    isLoadingTransactions: boolean;
    isLoadingModelUsage: boolean;
    isLoadingPlatformStats: boolean;
    isAdjustingCredits: boolean;
    error: string | null;

    // User Actions
    fetchSummary: () => Promise<void>;
    fetchTransactions: (params?: { limit?: number; offset?: number; reason?: string }) => Promise<void>;
    fetchModelUsage: () => Promise<void>;
    setReasonFilter: (reason: string) => Promise<void>;
    setPage: (page: number) => Promise<void>;

    // Admin Actions
    fetchPlatformStats: () => Promise<void>;
    adjustUserCredits: (userId: string, payload: AdjustCreditsRequest) => Promise<AdjustCreditsResponse>;

    clearError: () => void;
}

export const useCreditsStore = create<CreditsState>()(
    devtools(
        (set, get) => ({
            summary: null,
            transactions: [],
            totalTransactions: 0,
            transactionLimit: 20,
            transactionOffset: 0,
            selectedReasonFilter: "all",
            modelUsage: [],
            platformStats: null,

            isLoadingSummary: false,
            isLoadingTransactions: false,
            isLoadingModelUsage: false,
            isLoadingPlatformStats: false,
            isAdjustingCredits: false,
            error: null,

            fetchSummary: async () => {
                set({ isLoadingSummary: true, error: null });
                try {
                    const summary = await fetchUserCreditsApi();
                    set({ summary, isLoadingSummary: false });
                } catch (err: unknown) {
                    const error = err instanceof Error ? err.message : "Failed to load credits summary";
                    set({ error, isLoadingSummary: false });
                }
            },

            fetchTransactions: async (params = {}) => {
                const limit = params.limit ?? get().transactionLimit;
                const offset = params.offset ?? get().transactionOffset;
                const reason = params.reason ?? get().selectedReasonFilter;

                set({ isLoadingTransactions: true, error: null });
                try {
                    const res = await fetchUserCreditTransactionsApi({ limit, offset, reason });
                    set({
                        transactions: res.transactions,
                        totalTransactions: res.total,
                        transactionLimit: res.limit,
                        transactionOffset: res.offset,
                        isLoadingTransactions: false,
                    });
                } catch (err: unknown) {
                    const error = err instanceof Error ? err.message : "Failed to load transactions";
                    set({ error, isLoadingTransactions: false });
                }
            },

            fetchModelUsage: async () => {
                set({ isLoadingModelUsage: true, error: null });
                try {
                    const modelUsage = await fetchUserUsageSummaryApi();
                    set({ modelUsage, isLoadingModelUsage: false });
                } catch (err: unknown) {
                    const error = err instanceof Error ? err.message : "Failed to load usage breakdown";
                    set({ error, isLoadingModelUsage: false });
                }
            },

            setReasonFilter: async (reason: string) => {
                set({ selectedReasonFilter: reason, transactionOffset: 0 });
                await get().fetchTransactions({ offset: 0, reason });
            },

            setPage: async (page: number) => {
                const limit = get().transactionLimit;
                const offset = Math.max(0, (page - 1) * limit);
                set({ transactionOffset: offset });
                await get().fetchTransactions({ offset });
            },

            fetchPlatformStats: async () => {
                set({ isLoadingPlatformStats: true, error: null });
                try {
                    const platformStats = await fetchCreditsStatsApi();
                    set({ platformStats, isLoadingPlatformStats: false });
                } catch (err: unknown) {
                    const error = err instanceof Error ? err.message : "Failed to load platform stats";
                    set({ error, isLoadingPlatformStats: false });
                }
            },

            adjustUserCredits: async (userId: string, payload: AdjustCreditsRequest) => {
                set({ isAdjustingCredits: true, error: null });
                try {
                    const response = await adjustUserCreditsApi(userId, payload);
                    set({ isAdjustingCredits: false });
                    return response;
                } catch (err: unknown) {
                    const error = err instanceof Error ? err.message : "Failed to adjust user credits";
                    set({ error, isAdjustingCredits: false });
                    throw err;
                }
            },

            clearError: () => set({ error: null }),
        }),
        { name: "CreditsStore" }
    )
);
