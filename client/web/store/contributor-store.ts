import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SubmissionItem, SubmitResourceRequest } from '@/lib/api-types';
import { getMySubmissions, submitResourceForReview } from '@/lib/api/contributor-api';

type ContributorMessage = { type: 'success' | 'error'; text: string } | null;

interface ContributorState {
    title: string;
    content: string;
    resourceType: string;
    submitting: boolean;
    submissions: SubmissionItem[];
    isLoadingSubmissions: boolean;
    submissionsError: string | null;
    message: ContributorMessage;

    setTitle: (title: string) => void;
    setContent: (content: string) => void;
    setResourceType: (resourceType: string) => void;
    setMessage: (message: ContributorMessage) => void;

    fetchSubmissions: () => Promise<void>;
    submitResource: () => Promise<void>;
    resetForm: () => void;
    clearSubmissionsError: () => void;
}

const INITIAL_RESOURCE_TYPE = 'text';

export const useContributorStore = create<ContributorState>()(
    devtools(
        (set, get) => ({
            title: '',
            content: '',
            resourceType: INITIAL_RESOURCE_TYPE,
            submitting: false,
            submissions: [],
            isLoadingSubmissions: false,
            submissionsError: null,
            message: null,

            setTitle: (title) => set({ title }),
            setContent: (content) => set({ content }),
            setResourceType: (resourceType) => set({ resourceType }),
            setMessage: (message) => set({ message }),

            fetchSubmissions: async () => {
                set({ isLoadingSubmissions: true, submissionsError: null });
                try {
                    const items = await getMySubmissions(20);
                    set({ submissions: items, isLoadingSubmissions: false });
                } catch (err) {
                    set({
                        submissionsError: (err as Error).message,
                        isLoadingSubmissions: false,
                    });
                }
            },

            submitResource: async () => {
                const { title, content, resourceType, fetchSubmissions } = get();
                const body: SubmitResourceRequest = {
                    title: title.trim(),
                    content,
                    resource_type: resourceType,
                };

                set({ submitting: true, message: null });
                try {
                    const data = await submitResourceForReview(body);
                    set({
                        message: {
                            type: 'success',
                            text: `Submitted! Your resource is pending review (ID: ${data.submission_id})`,
                        },
                        title: '',
                        content: '',
                        resourceType: INITIAL_RESOURCE_TYPE,
                        submitting: false,
                    });
                    await fetchSubmissions();
                } catch (err) {
                    set({
                        message: {
                            type: 'error',
                            text: (err as Error).message,
                        },
                        submitting: false,
                    });
                    throw err;
                }
            },

            resetForm: () =>
                set({
                    title: '',
                    content: '',
                    resourceType: INITIAL_RESOURCE_TYPE,
                }),

            clearSubmissionsError: () => set({ submissionsError: null }),
        }),
        { name: 'ContributorStore' }
    )
);
