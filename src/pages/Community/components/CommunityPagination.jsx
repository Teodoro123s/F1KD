import Pagination from '../../../components/ui/Pagination';

export default function CommunityPagination({
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
    <Pagination
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
