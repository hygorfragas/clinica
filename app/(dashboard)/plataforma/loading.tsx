import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function PlataformaLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
