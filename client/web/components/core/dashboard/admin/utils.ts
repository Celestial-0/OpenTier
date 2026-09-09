export const getStatusColor = (status: string) => {
    switch (status) {
        case "completed":
            return "bg-primary";
        case "processing":
            return "bg-amber-500";
        case "failed":
            return "bg-destructive";
        default:
            return "bg-muted-foreground";
    }
};
