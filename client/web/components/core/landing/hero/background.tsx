import { GradientBars } from "@/components/ui/gradient-bars";
import { Spotlight } from "@/components/ui/spotlight-new";
import { LightLines } from "@/components/ui/light-lines";

export const HeroBackground = () => {
    return (
        <div className="absolute inset-0 z-0">
            <GradientBars
                color="var(--primary)"
            />
            {/* <LightLines
                gradientFrom="var(--primary)"
                gradientTo="var(--secondary)"
            /> */}
            <Spotlight />
        </div>
    );
};