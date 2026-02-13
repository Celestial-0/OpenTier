import { useState, useEffect } from "react";

interface QueryOptions<T> {
    queryKey: string[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
}

interface QueryResult<T> {
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * A simplified, centralized data fetching hook.
 * For production use, consider @tanstack/react-query.
 */
export function useQuery<T>({
    queryKey,
    queryFn,
    enabled = true
}: QueryOptions<T>): QueryResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setIsError(false);
        setError(null);
        try {
            const result = await queryFn();
            setData(result);
        } catch (err: any) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (enabled) {
            fetchData();
        }
    }, [JSON.stringify(queryKey), enabled]);

    return { data, isLoading, isError, error, refetch: fetchData };
}
