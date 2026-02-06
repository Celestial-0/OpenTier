export function FooterBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/5%),transparent)]" />
            <div className="absolute top-0 left-1/2 h-px w-1/3 -translate-x-1/2 bg-foreground/10 blur" />
        </div>
    );
}
