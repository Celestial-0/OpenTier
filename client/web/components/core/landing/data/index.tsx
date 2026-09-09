import {
    SiRust,
    SiPython,
    SiPostgresql,
    SiNextdotjs,
    SiRedis,
} from "react-icons/si";
import { GrpcLogo, TokioLogo, SqlAlchemyLogo, QdrantLogo } from "@/components/core/common/logos";
import { Database, FileSearch, Gauge, Layers, MessageSquare, Shield, Server as ServerIcon, GitBranch as GitBranchIcon, Network, Cpu, Sparkles, Radio } from "lucide-react";
import { TwitterIcon, LinkedinIcon, GithubIcon, InstagramIcon, IdCardIcon } from "@/components/core/common/icons/animated";
import {
    IngestionVisual,
    IntegrationVisual,
    LogicIsolationVisual,
    PrivacyVisual
} from "@/components/core/landing/faq/visuals";

// --- Shared Tech Definitions ---
export const TECH_DEFINITIONS: Record<string, { title: string; description: string; icon?: React.ReactNode }> = {
    rust: {
        title: "Rust",
        description: "High-performance API gateway with memory safety and blazing-fast execution",
        icon: <SiRust className="w-8 h-8" />
    },
    python: {
        title: "Python",
        description: "Powers the intelligence layer with multi-provider LLMs, RAG, and reasoning",
        icon: <SiPython className="w-8 h-8" />
    },
    qdrant: {
        title: "Qdrant Vector DB",
        description: "Sub-millisecond hybrid retrieval combining dense neural vectors (up to 3072d) and sparse BM25 tokens",
        icon: <QdrantLogo className="h-8 w-auto text-foreground" uniColor />
    },
    redis: {
        title: "Redis 8 Streams",
        description: "Durable event bus backbone with consumer groups, automatic DLQ replay, and distributed locking",
        icon: <SiRedis className="w-8 h-8" />
    },
    postgres: {
        title: "PostgreSQL 18",
        description: "ACID relational system of record for accounts, permissions, audit logs, and document catalogs",
        icon: <SiPostgresql className="w-8 h-8" />
    },
    worker: {
        title: "Autonomous Workers",
        description: "Decoupled background stream consumers for asynchronous scraping, chunking, and credit metering",
        icon: <Cpu className="w-8 h-8" />
    },
    grpc: {
        title: "gRPC",
        description: "High-performance RPC framework bridging control and cognitive microservices",
        icon: <GrpcLogo className="h-8 w-auto text-foreground" uniColor />
    },
    tokio: {
        title: "Tokio (Axum)",
        description: "Asynchronous runtime for Rust, employing Axum for ergonomic web framework capabilities.",
        icon: <TokioLogo className="h-8 w-auto text-foreground" uniColor />
    },
    sqlalchemy: {
        title: "SQLAlchemy",
        description: "Python SQL toolkit and Object-Relational Mapping library",
        icon: <SqlAlchemyLogo className="h-8 w-auto text-foreground" uniColor />
    },
    nextjs: {
        title: "Next.js",
        description: "React framework for production-grade web applications",
        icon: <SiNextdotjs className="w-8 h-8" />
    }
};

// --- Feature Grid Data ---
export const FEATURE_LIST = [
    {
        title: "Rust-Powered Gateway",
        description: "Blazing-fast API gateway built with Axum for maximum throughput, memory safety, and native SSE streaming.",
        icon: <SiRust className="w-7 h-7 text-orange-500" />,
    },
    {
        title: "Qdrant Hybrid Retrieval",
        description: "Dense neural embeddings (up to 3072d) fused with sparse BM25 lexical tokens via Reciprocal Rank Fusion.",
        icon: <QdrantLogo className="h-7 w-auto" uniColor={false} />,
    },
    {
        title: "Redis Event Backbone",
        description: "Redis 8 AOF event streaming with consumer groups, distributed locks, SHA-256 deduplication, and DLQs.",
        icon: <SiRedis className="w-7 h-7 text-red-500" />,
    },
    {
        title: "Autonomous Workers",
        description: "Decoupled background workers executing long-running web scraping, document chunking, and billing metering.",
        icon: <Cpu className="w-7 h-7 text-emerald-500" />,
    },
    {
        title: "Enterprise Security",
        description: "OAuth 2.0, AES-256 encrypted provider keys at rest, session management, and granular RBAC built-in.",
        icon: <Shield className="w-7 h-7 text-sky-500" />,
    },
    {
        title: "Multi-Model Intelligence",
        description: "Seamlessly route across Google Gemini, OpenAI GPT, and local Ollama models with custom endpoint overrides.",
        icon: <Sparkles className="w-7 h-7 text-amber-500" />,
    },
    {
        title: "Real-Time Streaming",
        description: "Server-sent events and gRPC server streaming for instant, responsive token-by-token chat experiences.",
        icon: <MessageSquare className="w-7 h-7 text-blue-500" />,
    },
    {
        title: "Production Ready",
        description: "Docker Compose orchestration, self-healing workers, built-in observability, and zero-downtime migrations.",
        icon: <Gauge className="w-7 h-7 text-violet-500" />,
    },
];


// --- Architecture Steps ---
export const ARCHITECTURE_STEPS = [
    {
        title: "Control Gateway (Rust)",
        description: "Handles public API traffic, authentication, tiered rate limits, and SSE streaming with zero-cost abstractions and sub-millisecond overhead.",
        icon: <ServerIcon className="w-5 h-5 text-orange-500" />
    },
    {
        title: "gRPC & Redis Backbone",
        description: "Strongly-typed Protobuf RPCs connect services while Redis 8 Streams coordinates decoupled events with zero loss guarantees.",
        icon: <Network className="w-5 h-5 text-purple-500" />
    },
    {
        title: "Cognition Engine (Python)",
        description: "Orchestrates multi-provider LLM inference, conversation history, query expansion, and hybrid retrieval isolated from public traffic.",
        icon: <Layers className="w-5 h-5 text-blue-500" />
    },
    {
        title: "Hybrid Vectors (Qdrant)",
        description: "System of record for vector embeddings, executing sub-millisecond dense cosine search fused with sparse BM25 lexical tokens.",
        icon: <QdrantLogo className="h-5 w-auto text-rose-500" uniColor />
    },
    {
        title: "Autonomous Workers",
        description: "Dedicated stream consumers handle heavy background tasks: web scraping, token chunking, embedding generation, and billing metering.",
        icon: <Cpu className="w-5 h-5 text-emerald-500" />
    },
    {
        title: "ACID System of Record",
        description: "PostgreSQL 18 stores users, organizations, permissions, document metadata, and immutable credit transaction ledgers.",
        icon: <Database className="w-5 h-5 text-sky-500" />
    }
];
// --- Footer Data ---

export const BRAND_CONFIG = {
    name: "OpenTier",
    description: "The intelligent middle-tier for AI applications. Build, manage, and scale production-ready RAG pipelines with ease.",
} as const;

export const DEVELOPER_PROFILE = {
    name: "Yash Kumar Singh",
    username: "Celestial-0",
    role: "Full Stack Developer · AI & Systems",
    bio: "I design and engineer production-grade AI platforms, real-time systems, and modern developer experiences.",
    buildingSince: "Dec 2023",
    portfolioUrl: "https://yashkumarsingh.me",
    githubUrl: "https://github.com/Celestial-0",
    avatarUrl: "https://github.com/Celestial-0.png",
    avatarFallback: "YS",
} as const;

export const MOTION_VARIANTS = {
    container: {
        hidden: {},
        show: {
            transition: {
                staggerChildren: 0.12,
            },
        },
    },
    item: {
        hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)" },
    },
} as const;

export const FOOTER_TEXT = {
    heading: "OpenTier footer",
    exploreTitle: "Explore",
    systemStatusTitle: "System Status",
    systemStatusBadge: "Operational",
    socialFollowText: "Follow us",
    designedBy: "Designed & Built by",
    copyright: (year: number) => `© ${year} OpenTier. Crafted with precision.`,
} as const;

export const MAIN_LINKS = [

    { name: "Blog", href: "https://celestial-0.github.io/OpenTier/blog" },
    { name: "About", href: "/about" },

    { name: "Terms", href: "/legal/#terms" },
    { name: "Privacy", href: "/legal/#privacy" },

    { name: "Roadmap", href: "https://celestial-0.github.io/OpenTier/roadmap" },
    { name: "Contact", href: "#contact" },

    { name: "Features", href: "#features" },
    { name: "Documentation", href: "https://celestial-0.github.io/OpenTier" }

] as const;

export const SOCIAL_LINKS = [
    { label: "Portfolio", href: "https://yashkumarsingh.me", icon: IdCardIcon, hover: "hover:text-[#FF5555]" },
    { label: "GitHub", href: "https://github.com/Celestial-0/OpenTier", icon: GithubIcon, hover: "hover:text-[#2ea44f]" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/celestial0/", icon: LinkedinIcon, hover: "hover:text-[#0A66C2]" },
    { label: "Instagram", href: "https://www.instagram.com/yash.kumar.singh.30/", icon: InstagramIcon, hover: "hover:text-[#E4405F]" },
    { label: "Twitter", href: "https://x.com/Celestial_Yash", icon: TwitterIcon, hover: "hover:text-[#1DA1F2]" },
] as const;

export const SYSTEM_STATUS = [
    { label: "Rust API Layer", icon: SiRust, color: "text-orange-500" },
    { label: "Python Intelligence", icon: SiPython, color: "text-blue-500" },
    { label: "Background Workers", icon: Cpu, color: "text-emerald-500" },
] as const;

// --- FAQ Content ---
export const FAQ_CONTENT = [
    {
        title: "How do I ingest my own data?",
        description:
            "OpenTier includes a fully automated ingestion pipeline orchestrated by Redis Streams. Submit data sources (GitHub repos, docs URLs, or local files), and our decoupled background workers handle web scraping, cleaning, token chunking, and dual-indexing into PostgreSQL metadata and Qdrant hybrid vectors (dense + sparse BM25) with automatic retry and DLQ protection.",
        content: <IngestionVisual />,
    },
    {
        title: "Is my data private & self-hostable?",
        description:
            "Absolutely. OpenTier is designed for 'Local-First' deployment. You can run the entire production stack (Rust Gateway, Python Engine, Background Workers, PostgreSQL 18, Redis 8, and Qdrant) via a single Docker Compose file on your own VPC. Your documents and embeddings never leave your infrastructure.",
        content: <PrivacyVisual />,
    },
    {
        title: "Can I customize the AI logic?",
        description:
            "Yes. The intelligence layer is completely isolated in Python with multi-provider model routing. You can configure Google Gemini, OpenAI, or local Ollama models, tune RRF hybrid search parameters in Qdrant, or customize prompts without modifying the high-speed Rust gateway or touching auth contracts.",
        content: <LogicIsolationVisual />,
    },
    {
        title: "How do I integrate this into my app?",
        description:
            "OpenTier exposes standard REST & Server-Sent Events (SSE) endpoints alongside strongly-typed gRPC contracts. The Rust gateway handles connection pooling, JWT authentication, and token-bucket rate limits, giving you instant streaming and sub-millisecond retrieval.",
        content: <IntegrationVisual />,
    },
];

