"use client";

import { Spotlight } from "@/components/ui/spotlight-new";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import Beams from "@/components/ui/Beams";


import { useEffect, useState } from "react";

export const HeroBackground = () => {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };
        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-0">

            {isDark ? (
                <>
                    <Spotlight />
                    <Beams
                        rotation={30}
                    />
                </>
            ) : (
                <>
                    <Spotlight />
                    <BackgroundRippleEffect
                        rows={9}
                        cols={27}
                        cellSize={56}
                        
                    />
                </>
            )}
        </div>
    );
};
