import Link from "next/link";
import { cn } from "@/lib/utils";

export function HomeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      ← 홈
    </Link>
  );
}
