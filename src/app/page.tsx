'use client';

import { useState } from 'react';
import { NewsItem } from '@/lib/newsCrawler';
import { StockInfo } from '@/lib/stockSearch';
import { saveNewsSummary, getNewsSummariesByDateRange } from '@/lib/newsSummaryManager';
import { StockNewsSummary } from '@/lib/supabase';

type SearchResult = {
  code: string;
  name: string;
  market: string;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [saveDate, setSaveDate] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [savedSummaries, setSavedSummaries] = useState<StockNewsSummary[]>([]);
  const [viewMode, setViewMode] = useState<'analyze' | 'view'>('analyze');
  const [stockCode, setStockCode] = useState<string>('');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCode.trim()) {
      setError('종목코드를 입력해주세요.');
      return;
    }
    if (startPage > endPage) {
      setError('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    setSummary('');
    setSaveStatus('');

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCode: stockCode.trim(),
          startPage,
          endPage
        }),
      });

      if (!response.ok) {
        throw new Error('뉴스를 찾을 수 없습니다.');
      }

      const data = await response.json();
      setNewsItems(data.newsItems);
      setStockInfo(data.stockInfo);

      // 뉴스 요약 요청
      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsItems: data.newsItems,
          stockName: data.stockInfo.name
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error('뉴스 요약 중 오류가 발생했습니다.');
      }

      const summaryData = await summaryResponse.json();
      setSummary(summaryData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveDate) {
      setSaveStatus('날짜를 입력해주세요.');
      return;
    }

    if (!stockInfo || !summary) {
      setSaveStatus('저장할 뉴스 요약이 없습니다.');
      return;
    }

    try {
      setSaveStatus('저장 중...');
      await saveNewsSummary(
        stockInfo.code,
        stockInfo.name,
        newsItems,
        saveDate
      );
      setSaveStatus('저장 완료!');
      // 저장 후 저장된 요약 목록 새로고침
      loadSavedSummaries();
    } catch (err) {
      setSaveStatus('저장 중 오류가 발생했습니다.');
      console.error('저장 중 오류:', err);
    }
  };

  const loadSavedSummaries = async () => {
    if (!stockInfo) return;

    try {
      const today = new Date();
      const startDate = new Date();
      startDate.setMonth(today.getMonth() - 1); // 최근 1개월 데이터 조회

      const summaries = await getNewsSummariesByDateRange(
        stockInfo.code,
        startDate.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      setSavedSummaries(summaries);
    } catch (err) {
      console.error('저장된 요약 조회 중 오류:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search-stock?query=${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) throw new Error('검색 중 오류가 발생했습니다.');
      
      const data = await response.json();
      setSearchResults(data.stocks);
    } catch (err) {
      console.error('종목 검색 중 오류:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">삼성전자 뉴스 분석기</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('analyze')}
              className={`px-4 py-2 rounded ${
                viewMode === 'analyze'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              뉴스 분석
            </button>
            <button
              onClick={() => {
                setViewMode('view');
                loadSavedSummaries();
              }}
              className={`px-4 py-2 rounded ${
                viewMode === 'view'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              저장된 요약
            </button>
          </div>
        </div>

        {viewMode === 'analyze' ? (
          <>
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="종목코드를 입력하세요 (예: 005930)"
                    className="border p-2 rounded flex-1"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="startPage" className="whitespace-nowrap">시작 페이지:</label>
                    <input
                      id="startPage"
                      type="number"
                      min="1"
                      value={startPage}
                      onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                      className="border p-2 rounded w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="endPage" className="whitespace-nowrap">종료 페이지:</label>
                    <input
                      id="endPage"
                      type="number"
                      min="1"
                      value={endPage}
                      onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                      className="border p-2 rounded w-20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {loading ? '분석 중...' : '뉴스 분석하기'}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="text-red-500 mb-4">
                {error}
              </div>
            )}

            {stockInfo && (
              <div className="mb-6 p-4 bg-gray-100 rounded">
                <h2 className="text-xl font-semibold mb-2">종목 정보</h2>
                <p>종목명: {stockInfo.name}</p>
                <p>종목코드: {stockInfo.code}</p>
                <p>시장: {stockInfo.market}</p>
              </div>
            )}

            {summary && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">뉴스 요약</h2>
                <div className="whitespace-pre-wrap bg-white p-4 rounded shadow">
                  {summary}
                </div>
                
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="date"
                    value={saveDate}
                    onChange={(e) => setSaveDate(e.target.value)}
                    className="border p-2 rounded"
                  />
                  <button
                    onClick={handleSave}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    요약 저장하기
                  </button>
                  {saveStatus && (
                    <span className={saveStatus.includes('완료') ? 'text-green-500' : 'text-red-500'}>
                      {saveStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">저장된 요약 목록</h2>
            {savedSummaries.length === 0 ? (
              <p className="text-gray-500">저장된 요약이 없습니다.</p>
            ) : (
              savedSummaries.map((summary) => (
                <div key={summary.id} className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">
                      {new Date(summary.summary_date).toLocaleDateString()} ({summary.news_count}개 뉴스)
                    </h3>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-700">
                    {summary.summary_content}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 종목 검색 섹션 */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">종목 검색</h2>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="종목코드 또는 종목명을 입력하세요"
                className="border p-2 rounded flex-1"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isSearching ? '검색 중...' : '검색'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="bg-white rounded shadow">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목코드</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시장</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((stock) => (
                    <tr key={stock.code} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.market}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
