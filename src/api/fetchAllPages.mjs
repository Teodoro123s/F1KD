const PAGE_BATCH_SIZE = 4;
const MAX_PAGES = 10000;

export async function fetchAllPages(fetchPage, resultKey, options = {}) {
  const perPage = options.perPage === undefined ? 100 : options.perPage;
  const firstPage = await fetchPage({
    ...options,
    page: 1,
    perPage,
  });
  const totalPages = Number(firstPage.pagination?.totalPages);
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > MAX_PAGES) {
    throw new Error(`Unable to load all records: invalid ${resultKey} pagination metadata.`);
  }
  if (!Array.isArray(firstPage[resultKey])) {
    throw new Error(`Unable to load all records: ${resultKey} response is invalid.`);
  }
  if (totalPages === 0 && firstPage[resultKey].length) {
    throw new Error(`Unable to load all records: ${resultKey} pagination metadata is inconsistent.`);
  }

  const pages = [firstPage];
  for (let firstPageNumber = 2; firstPageNumber <= totalPages; firstPageNumber += PAGE_BATCH_SIZE) {
    const pageNumbers = Array.from(
      { length: Math.min(PAGE_BATCH_SIZE, totalPages - firstPageNumber + 1) },
      (_, index) => firstPageNumber + index,
    );
    pages.push(...await Promise.all(pageNumbers.map((page) => fetchPage({
      ...options,
      page,
      perPage,
    }))));
  }

  const response = {
    ...firstPage,
    [resultKey]: pages.flatMap((page) => {
      if (!Array.isArray(page[resultKey])) {
        throw new Error(`Unable to load all records: ${resultKey} page is invalid.`);
      }
      return page[resultKey];
    }),
  };
  delete response.pagination;
  return response;
}
