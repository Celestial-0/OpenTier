/* --------------------------------- */
/* Social Button                      */
/* --------------------------------- */

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type SocialButtonProps = {
    icon: any;
    href: string;
    label: string;
    hover?: string;
};

export const SocialButton = ({ icon: Icon, href, label, hover }: SocialButtonProps) => {
    return (
        <Link
            href={href}
            aria-label={label}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "w-9 h-9 rounded-full hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary/40",
                hover
            )}
        >
            <Icon className="w-4 h-4" aria-hidden />
        </Link>
    );
}