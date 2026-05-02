import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="ml-auto h-9 w-24" />
        </div>
        <Skeleton className="h-[560px] w-full" />
      </div>
    </div>
  );
}
