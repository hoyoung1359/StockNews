'use client';

import { useState, useEffect, useRef } from 'react';
import { searchStocks, StockInfo } from '../app/utils/kisApi';
import { useDebounce } from '../hooks/useDebounce';

interface StockSearchProps {
  onSelect: (stock: StockInfo) => void;
}

export default function StockSearch({ onSelect }: StockSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<StockInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedKeyword = useDebounce(keyword, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      if (debouncedKeyword.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchStocks(debouncedKeyword);
        setResults(data);
      } catch (error) {
        console.error('주식 검색 중 오류 발생:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStocks();
  }, [debouncedKeyword]);

  const handleSelect = (stock: StockInfo) => {
    setKeyword(stock.prdt_name);
    setShowResults(false);
    onSelect(stock);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setShowResults(true);
          }}
          placeholder="종목명을 입력하세요"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((stock, index) => (
            <div
              key={`${stock.prdt_cd}-${index}`}
              onClick={() => handleSelect(stock)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div className="font-medium">{stock.prdt_name}</div>
              <div className="text-sm text-gray-600">
                {stock.scty_kind_name} | {stock.prdt_cd}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 