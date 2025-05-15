'use client';

import { useState } from 'react';
import { NewsItem } from '@/lib/newsCrawler';
import { DiscussionItem } from '@/lib/stockDiscussionCrawler';
import { StockInfo } from '@/lib/stockSearch';
import { saveNewsSummary, getNewsSummariesByDateRange } from '@/lib/newsSummaryManager';
import { StockNewsSummary } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type SearchResult = {
  code: string;
  name: string;
  market: string;
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'analyze' | 'saved'>('analyze');
  const [analysisType, setAnalysisType] = useState<'news' | 'discussion'>('news');
  const [stockCode, setStockCode] = useState('');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [summary, setSummary] = useState('');
  const [saveDate, setSaveDate] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [savedSummaries, setSavedSummaries] = useState<StockNewsSummary[]>([]);
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
      if (analysisType === 'news') {
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
      } else {
        const response = await fetch('/api/crawl-discussions', {
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
          throw new Error('게시글을 찾을 수 없습니다.');
        }

        const data = await response.json();
        setStockInfo(data.stockInfo);

        // 게시글 요약 요청
        const summaryResponse = await fetch('/api/summarize-discussions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            discussionItems: data.discussionItems,
            stockName: data.stockInfo.name
          }),
        });

        if (!summaryResponse.ok) {
          throw new Error('게시글 요약 중 오류가 발생했습니다.');
        }

        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
      }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">StockNews에 오신 것을 환영합니다</h1>
          <p className="mb-6 text-gray-600">서비스를 이용하시려면 로그인이 필요합니다.</p>
          <a
            href="/auth"
            className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium w-full md:w-auto"
          >
            로그인하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* 헤더 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">주식 뉴스 분석기</h1>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {user.email}님 환영합니다
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  로그아웃
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('analyze')}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 text-sm md:text-base ${
                    viewMode === 'analyze'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  분석하기
                </button>
                <button
                  onClick={() => setViewMode('saved')}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 text-sm md:text-base ${
                    viewMode === 'saved'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  저장된 요약
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'analyze' ? (
          <div className="space-y-4 md:space-y-6">
            {/* 검색 폼 */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={stockCode}
                      onChange={(e) => setStockCode(e.target.value)}
                      placeholder="종목코드를 입력하세요 (예: 005930)"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row flex-wrap gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <label htmlFor="analysisType" className="text-sm font-medium text-gray-700 whitespace-nowrap">분석 유형:</label>
                      <select
                        id="analysisType"
                        value={analysisType}
                        onChange={(e) => setAnalysisType(e.target.value as 'news' | 'discussion')}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="news">뉴스 분석</option>
                        <option value="discussion">종목토론방 분석</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="startPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">시작 페이지:</label>
                      <input
                        id="startPage"
                        type="number"
                        min="1"
                        value={startPage}
                        onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="endPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">종료 페이지:</label>
                      <input
                        id="endPage"
                        type="number"
                        min="1"
                        value={endPage}
                        onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          분석 중...
                        </span>
                      ) : (
                        '분석하기'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {stockInfo && (
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">종목 정보</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">종목명</p>
                    <p className="font-medium">{stockInfo.name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">종목코드</p>
                    <p className="font-medium">{stockInfo.code}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">시장</p>
                    <p className="font-medium">{stockInfo.market}</p>
                  </div>
                </div>
              </div>
            )}

            {summary && (
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {analysisType === 'news' ? '뉴스 요약' : '종목토론방 요약'}
                </h2>
                <div className="prose max-w-none bg-gray-50 p-4 md:p-6 rounded-lg">
                  {summary}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <input
                    type="date"
                    value={saveDate}
                    onChange={(e) => setSaveDate(e.target.value)}
                    className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
                  >
                    요약 저장하기
                  </button>
                  {saveStatus && (
                    <span className={`text-sm ${saveStatus.includes('완료') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">저장된 요약 목록</h2>
            {savedSummaries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">저장된 요약이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {savedSummaries.map((summary) => (
                  <div key={summary.id} className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800">
                        {new Date(summary.summary_date).toLocaleDateString()} ({summary.news_count}개 뉴스)
                      </h3>
                    </div>
                    <div className="prose max-w-none text-gray-700">
                      {summary.summary_content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 종목 검색 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-4 md:p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">종목 검색</h2>
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="종목코드 또는 종목명을 입력하세요"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    검색 중...
                  </span>
                ) : (
                  '검색'
                )}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목코드</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목명</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시장</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((stock) => (
                      <tr key={stock.code} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.code}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.name}</td>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.market}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
