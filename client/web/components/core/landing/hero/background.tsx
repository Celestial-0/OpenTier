import { GradientBars } from "@/components/ui/gradient-bars";
import { Spotlight } from "@/components/ui/spotlight-new";

export const HeroBackground = () => {
    return (
        <div className="absolute inset-0 z-0">
            <GradientBars
                color="var(--primary)"
            />
            <Spotlight />
        </div>
    );
};