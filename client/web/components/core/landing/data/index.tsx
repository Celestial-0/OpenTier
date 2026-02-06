import {
    SiRust,
    SiPython,
    SiPostgresql,
    SiNextdotjs,
} from "react-icons/si";
import { GrpcLogo, TokioLogo, SqlAlchemyLogo } from "@/components/core/common/logos";
import { Database, FileSearch, Gauge, Layers, MessageSquare, Shield, Server as ServerIcon, GitBranch as GitBranchIcon } from "lucide-react";
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
        description: "Powers the intelligence layer with RAG, embeddings, and ML inference",
        icon: <SiPython className="w-8 h-8" />
    },
    postgres: {
        title: "PostgreSQL & pgvector",
        description: "Robust relational database with pgvector for efficient vector similarity search",
        icon: <SiPostgresql className="w-8 h-8" />
    },
    grpc: {
        title: "gRPC",
        description: "High-performance RPC framework for service communication",
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
        description: "Lightning-fast API gateway built with Rust for maximum performance, security, and reliability.",
        icon: <SiRust className="w-7 h-7" />,
    },
    {
        title: "Intelligent RAG System",
        description: "Advanced retrieval-augmented generation with pgvector for semantic search and context-aware responses.",
        icon: <SiPython className="w-7 h-7" />,
    },
    {
        title: "Real-Time Streaming",
        description: "Server-sent events and gRPC streaming for instant, responsive chat experiences.",
        icon: <MessageSquare className="w-7 h-7" />,
    },
    {
        title: "Enterprise Security",
        description: "OAuth 2.0, session management, rate limiting, and role-based access control built-in.",
        icon: <Shield className="w-7 h-7" />,
    },
    {
        title: "Layered Architecture",
        description: "Clean separation between control (Rust) and cognition (Python) for predictable scaling.",
        icon: <Layers className="w-7 h-7" />,
    },
    {
        title: "Vector Database",
        description: "PostgreSQL with pgvector extension for efficient embedding storage and similarity search.",
        icon: <Database className="w-7 h-7" />,
    },
    {
        title: "Smart Ingestion",
        description: "Automated data pipelines for cleaning, normalizing, and embedding your knowledge base.",
        icon: <FileSearch className="w-7 h-7" />,
    },
    {
        title: "Production Ready",
        description: "Built-in observability, metrics, tracing, and backpressure handling for reliable operations.",
        icon: <Gauge className="w-7 h-7" />,
    },
];


// --- Architecture Steps ---
export const ARCHITECTURE_STEPS = [
    {
        title: "Control Layer",
        description: "Rust handles authentication, rate limiting, streaming, and all public-facing APIs with blazing-fast performance and memory safety.",
        icon: <ServerIcon className="w-5 h-5 text-primary" />
    },
    {
        title: "gRPC Bridge",
        description: "Strongly-typed contracts ensure clean separation and enable independent evolution of both layers without breaking changes.",
        icon: <GitBranchIcon className="w-5 h-5 text-primary" />
    },
    {
        title: "Cognition Layer",
        description: "Python powers all intelligence: RAG, embeddings, chat orchestration, and ML inference, isolated from public traffic.",
        icon: <Layers className="w-5 h-5 text-primary" /> // Using Layers as generic brain/logic icon wasn't imported
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
    portfolioUrl: "https://yashkumarsingh.tech",
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

    { name: "Blog", href: "#blog" },
    { name: "About", href: "#about" },

    { name: "Terms", href: "#terms" },
    { name: "Privacy", href: "#privacy" },

    { name: "Roadmap", href: "#roadmap" },
    { name: "Contact", href: "#contact" },

    { name: "Features", href: "#features" },
    { name: "Documentation", href: "#docs" }

] as const;

export const SOCIAL_LINKS = [
    { label: "Portfolio", href: "https://yashkumarsingh.tech", icon: IdCardIcon, hover: "hover:text-[#FF5555]" },
    { label: "GitHub", href: "https://github.com", icon: GithubIcon, hover: "hover:text-[#2ea44f]" },
    { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon, hover: "hover:text-[#0A66C2]" },
    { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon, hover: "hover:text-[#E4405F]" },
    { label: "Twitter", href: "https://twitter.com", icon: TwitterIcon, hover: "hover:text-[#1DA1F2]" },
] as const;

export const SYSTEM_STATUS = [
    { label: "Rust API Layer", icon: SiRust, color: "text-orange-500" },
    { label: "Python Intelligence", icon: SiPython, color: "text-blue-500" },
] as const;

// --- FAQ Content ---
export const FAQ_CONTENT = [
    {
        title: "How do I ingest my own data?",
        description:
            "OpenTier includes a fully automated ingestion pipeline. Simply point it to your data sources (GitHub repositories, Documentation URLs, or local files), and our scrapers handle the cleaning, chunking (512 tokens), and embedding generation automatically using Python. It's built to withstand rate limits and network flakiness.",
        content: <IngestionVisual />,
    },
    {
        title: "Is my data private & self-hostable?",
        description:
            "Absolutely. OpenTier is designed for 'Local-First' deployment. You can run the entire stack (Rust Gateway, Python Engine, Postgres) via Docker Compose on your own infrastructure. Your data never leaves your VPC. We also enforce strict Role-Based Access Control (RBAC) at the gateway level.",
        content: <PrivacyVisual />,
    },
    {
        title: "Can I customize the AI logic?",
        description:
            "Yes. The intelligence layer is completely isolated in Python. You can modify the RAG pipeline, swap embedding models, or change the LLM prompts in `server/intelligence` without touching the Rust gateway or worrying about breaking authentication/rate-limiting contracts. It's designed for independent evolution.",
        content: <LogicIsolationVisual />,
    },
    {
        title: "How do I integrate this into my app?",
        description:
            "OpenTier exposes a strongly-typed gRPC API and standard REST endpoints. You can generate clients for any language (Go, Node, Java, etc.) using our Protobuf definitions. The Rust gateway handles all the complexity of streaming, auth, and backpressure, giving you a simplified consumption experience.",
        content: <IntegrationVisual />,
    },
];
