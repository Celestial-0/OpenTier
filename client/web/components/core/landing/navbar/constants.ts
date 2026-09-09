import {
    BookOpen,
    Database,
} from "lucide-react";
import { FileTextIcon, ShieldCheckIcon } from "@/components/core/common/icons/animated";

// Knowledge Base items - URLs will be managed by store/context

export const knowledgeBaseItems = [
    {
        title: "Resource Management",
        description: "Add and manage your knowledge base resources",
        icon: Database,
    },
    {
        title: "Documentation",
        description: "API guides and integration references",
        icon: BookOpen,
    },
    {
        title: "API Reference",
        description: "Complete REST API documentation",
        icon: FileTextIcon,
    },
    {
        title: "System Health",
        description: "Monitor API and intelligence service status",
        icon: ShieldCheckIcon,
    },
];
