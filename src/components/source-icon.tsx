import { GraduationCap, Calendar } from "lucide-react";
import type { TaskSource } from "@/types/task";
import { cn } from "@/lib/utils";

interface SourceIconProps {
  source: TaskSource;
  className?: string;
}

export function SourceIcon({ source, className }: SourceIconProps) {
  const Icon = source === "gclassroom" ? GraduationCap : Calendar;
  return (
    <Icon
      className={cn("size-3.5 text-muted-foreground shrink-0", className)}
    />
  );
}
