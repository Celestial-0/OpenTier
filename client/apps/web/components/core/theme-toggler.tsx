"use client";

import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

export const ThemeTogglerButton = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center space-x-3">
      <Sun className="size-4" />
      <Switch
        checked={theme === 'dark'}
        onCheckedChange={(value) => setTheme(value ? 'dark' : 'light')}
        aria-label="Toggle theme"
      />
      <Moon className="size-4" />
    </div>
  );
}