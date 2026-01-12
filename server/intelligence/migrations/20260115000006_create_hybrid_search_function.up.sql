-- Create hybrid search function (combines vector and keyword search)
CREATE OR REPLACE FUNCTION hybrid_search(
        query_embedding vector(384),
        query_text text,
        p_user_id text,
        p_limit integer DEFAULT 20,
        vector_weight float DEFAULT 0.7,
        keyword_weight float DEFAULT 0.3
    ) RETURNS TABLE (
        chunk_id uuid,
        document_id uuid,
        content text,
        similarity_score float,
        rank integer
    ) AS $$ BEGIN RETURN QUERY WITH vector_results AS (
        SELECT dc.id AS chunk_id,
            dc.document_id,
            dc.content,
            1 - (dc.embedding <=> query_embedding) AS vector_score,
            ROW_NUMBER() OVER (
                ORDER BY dc.embedding <=> query_embedding
            ) AS vector_rank
        FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = p_user_id
            AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> query_embedding
        LIMIT 100
    ), keyword_results AS (
        SELECT dc.id AS chunk_id,
            dc.document_id,
            dc.content,
            ts_rank_cd(
                to_tsvector('english', dc.content),
                plainto_tsquery('english', query_text)
            ) AS keyword_score,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(
                        to_tsvector('english', dc.content),
                        plainto_tsquery('english', query_text)
                    ) DESC
            ) AS keyword_rank
        FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = p_user_id
            AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
        LIMIT 100
    ), combined AS (
        SELECT COALESCE(v.chunk_id, k.chunk_id) AS chunk_id,
            COALESCE(v.document_id, k.document_id) AS document_id,
            COALESCE(v.content, k.content) AS content,
            (
                vector_weight / (60 + COALESCE(v.vector_rank, 1000))
            ) + (
                keyword_weight / (60 + COALESCE(k.keyword_rank, 1000))
            ) AS rrf_score
        FROM vector_results v
            FULL OUTER JOIN keyword_results k ON v.chunk_id = k.chunk_id
    )
SELECT combined.chunk_id,
    combined.document_id,
    combined.content,
    combined.rrf_score AS similarity_score,
    ROW_NUMBER() OVER (
        ORDER BY combined.rrf_score DESC
    )::integer AS rank
FROM combined
ORDER BY combined.rrf_score DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
-- Add comment
COMMENT ON FUNCTION hybrid_search IS 'Hybrid search combining vector similarity and keyword search using Reciprocal Rank Fusion';