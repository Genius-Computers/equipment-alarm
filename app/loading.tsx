'use client'
import Header from "@/components/Header"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-10 w-full" />

            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-[180px]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="rounded-lg border p-0">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div>
                        <Skeleton className="h-3 w-28 mb-2" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-44" />
                        <Skeleton className="h-8 w-28" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


