"use client";

import { FOOTER_TEXT } from "@/components/core/landing/data";
import { FooterBackground } from "@/components/core/landing/footer/background";
import { FooterContent } from "@/components/core/landing/footer/content";

/* --------------------------------- */
/* Footer                             */
/* --------------------------------- */

export function Footer() {
    return (
        <footer
            role="contentinfo"
            aria-labelledby="footer-heading"
            className="relative w-full  overflow-hidden py-10"
        >
            <h2 id="footer-heading" className="sr-only">
                {FOOTER_TEXT.heading}
            </h2>

            <FooterBackground />
            <FooterContent />
        </footer>
    );
}
