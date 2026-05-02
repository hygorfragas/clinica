import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function PacienteDetalheLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-6 ring-1 ring-line">
        <Skeleton className="h-5 w-1/4" />
        <SkeletonText className="mt-4" lines={5} />
      </div>
    </div>
  );
}
