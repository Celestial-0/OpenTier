import { ARCHITECTURE_STEPS } from "../data";

export const ArchitectureExplanation = () => {
    return (
        <div className="grid md:grid-cols-3 gap-8 mb-20">
            {ARCHITECTURE_STEPS.map((step, index) => (
                <div key={index} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                {step.icon}
                            </div>
                            <h3 className="text-lg font-semibold">{step.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {step.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
