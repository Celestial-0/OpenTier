import { ARCHITECTURE_STEPS } from "../data";

export const ArchitectureExplanation = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {ARCHITECTURE_STEPS.map((step, index) => (
                <div key={index} className="relative group h-full">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative h-full p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm flex flex-col justify-between transition-all duration-200 hover:border-primary/40">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
                                    {step.icon}
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-foreground">{step.title}</h3>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

