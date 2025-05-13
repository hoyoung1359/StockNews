import { NewsItem } from './newsCrawler';

export async function summarizeNews(
  newsItems: NewsItem[],
  stockName: string,
  customPrompt?: string
): Promise<string> {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newsItems,
        stockName,
        customPrompt
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '뉴스 요약 중 오류가 발생했습니다.');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('뉴스 요약 중 오류 발생:', error);
    throw error;
  }
} 