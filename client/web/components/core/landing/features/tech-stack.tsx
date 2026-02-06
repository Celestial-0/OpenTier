"use client";

import { InfiniteSlider } from "@/components/ui/infinite-slider";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { TECH_DEFINITIONS } from "../data";

export const FeatureTechStack = () => {
    // Convert dictionary to array and duplicate for seamless infinite scroll
    const techItems = Object.values(TECH_DEFINITIONS);
    const sliderItems = [...techItems, ...techItems];

    return (
        <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold mb-8">Powered By Modern Technologies</h3>
            <div className="mask-[linear-gradient(to_right,transparent,black,transparent)] overflow-hidden py-4">
                <InfiniteSlider gap={60} speed={100} speedOnHover={25}>
                    {sliderItems.map((item, index) => (
                        <Tooltip key={`${item.title}-${index}`}>
                            <TooltipTrigger>
                                <div className="cursor-pointer transition-transform duration-300 hover:scale-110 flex items-center justify-center">
                                    {item.icon}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <p className="text-xs opacity-80 mt-1">
                                    {item.description}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </InfiniteSlider>
            </div>
        </div>
    );
};
