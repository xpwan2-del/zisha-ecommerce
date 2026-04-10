"use client";

import { useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const [inputPage, setInputPage] = useState('');

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setInputPage('');
    }
  };

  // 计算显示的页码范围，最多显示5个
  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // 总页数小于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 总页数大于5，显示当前页附近的页码
      let startPage = currentPage - 2;
      let endPage = currentPage + 2;

      // 调整起始和结束页码，确保在有效范围内
      if (startPage < 1) {
        startPage = 1;
        endPage = maxVisiblePages;
      }
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = totalPages - maxVisiblePages + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-md border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-[#831843] hover:bg-[#FDF2F8] transition-colors'}`}
        >
          上一页
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => handlePageClick(page)}
            className={`px-4 py-2 rounded-md ${currentPage === page ? 'bg-[#CA8A04] text-white' : 'bg-white text-[#831843] hover:bg-[#FDF2F8] transition-colors'}`}
          >
            {page}
          </button>
        ))}

        {/* Next button */}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-md border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-[#831843] hover:bg-[#FDF2F8] transition-colors'}`}
        >
          下一页
        </button>

        {/* Page input */}
        <form onSubmit={handleInputSubmit} className="flex items-center space-x-2">
          <span className="text-sm text-[#831843]">跳转到：</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={handleInputChange}
            className="w-16 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#CA8A04]"
            placeholder={`1-${totalPages}`}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#CA8A04] text-white rounded-md hover:bg-[#B47C03] transition-colors"
          >
            跳转
          </button>
        </form>
      </div>
    </div>
  );
}
