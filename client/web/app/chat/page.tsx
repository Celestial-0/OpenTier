import { AiChat } from "@/components/core/chat/chat";
import { TooltipProvider } from "@/components/ui/tooltip";
export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-center items-center">
        <TooltipProvider>
          <AiChat />
        </TooltipProvider>
      </div>
    </div>
  );
}