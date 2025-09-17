"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from "./ui/pagination";

interface EquipmentPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const EquipmentPagination = ({ page, pageSize, total, onPrev, onNext }: EquipmentPaginationProps) => {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onPrev();
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }).map((_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPrev();
                }}
                isActive={index + 1 === page}
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNext();
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      {/* <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{`${start}-${end} / ${total}`}</div>
      <div className="flex items-center gap-2">
        <button
          className="text-sm underline disabled:text-muted-foreground"
          onClick={onPrev}
          disabled={page <= 1}
        >
          Prev
        </button>
        <button
          className="text-sm underline disabled:text-muted-foreground"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div> */}
    </>
  );
};

export default EquipmentPagination;
