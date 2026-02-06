import {
    BookOpen,
    Database,
} from "lucide-react";
import { FileTextIcon, ShieldCheckIcon } from "@/components/core/common/icons/animated";

// Mock user data - will be managed by auth store/context
export const mockUser = {
    name: "Yash",
    email: "yash@opentier.dev",
    avatar: "https://api.dicebear.com/9.x/lorelei/svg?seed=Yash",
    role: "Admin",
    isLoggedIn: false, // Toggle this to show/hide user menu
};

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
