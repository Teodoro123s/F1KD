import PaginationControl from '../../components/ui/Pagination';

export default function Pagination({
  currentPage,
  pageCount,
  onPageChange,
  perPage,
  onPerPageChange,
  rangeStart,
  rangeEnd,
  totalItems,
}) {
  return (
    <PaginationControl
      currentPage={currentPage}
      pageCount={pageCount}
      onPageChange={onPageChange}
      perPage={perPage}
      onPerPageChange={onPerPageChange}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      totalItems={totalItems}
    />
  );
}
