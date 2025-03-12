"use client";

import { useState } from 'react';

interface DataTableProps {
  data: any[];
  fileName: string;
}

export default function DataTable({ data, fileName }: DataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <div className="p-6 text-center text-gray-500 italic">
          No data to display
        </div>
      </div>
    );
  }

  // Get headers from the first row
  const headers = Object.keys(data[0]);

  // Calculate pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, data.length);
  const currentPageData = data.slice(startIndex, endIndex);

  // Handle page change
  const handlePreviousPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="overflow-hidden border border-gray-200 rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPageData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((header, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {header === 'imageThumb' && row[header] ? (
                      <div className="flex items-center">
                        <img 
                          src={row[header]} 
                          alt={row['imageAlt'] || 'Product image'} 
                          className="h-10 w-10 object-cover rounded-md"
                          title={row['imageCredit'] || ''}
                        />
                        <span className="ml-2 text-xs text-gray-400 truncate max-w-xs">
                          {row['imageCredit'] ? `Credit: ${row['imageCredit'].split(' (')[0]}` : ''}
                        </span>
                      </div>
                    ) : header === 'imageUrl' || header === 'imageAlt' || header === 'imageCredit' ? (
                      <span className="text-gray-400 italic text-xs truncate max-w-xs">
                        {row[header] ? (header === 'imageUrl' ? 'Image URL available' : row[header]) : 'No image data'}
                      </span>
                    ) : (
                      row[header] || (
                        <span className="text-red-500 italic">Missing</span>
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={handlePreviousPage}
            disabled={page === 0}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages - 1}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{data.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={handlePreviousPage}
                disabled={page === 0}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
