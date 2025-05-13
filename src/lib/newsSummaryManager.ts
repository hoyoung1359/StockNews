import { supabase, StockNewsSummary } from './supabase';
import { NewsItem } from './newsCrawler';
import { summarizeNews } from './newsSummarizer';

export async function saveNewsSummary(
  stockCode: string,
  stockName: string,
  newsItems: NewsItem[],
  date: string
): Promise<StockNewsSummary> {
  try {
    // 1. 해당 날짜의 기존 요약이 있는지 확인
    const { data: existingSummary, error: fetchError } = await supabase
      .from('stock_news_summaries')
      .select('*')
      .eq('stock_code', stockCode)
      .eq('summary_date', date)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let summaryContent: string;
    let newsCount: number;

    if (existingSummary) {
      // 2. 기존 요약이 있다면, 새로운 뉴스와 기존 요약을 합쳐서 다시 요약
      const combinedPrompt = `
기존 요약:
${existingSummary.summary_content}

새로운 뉴스:
${newsItems.map(item => `- ${item.title}`).join('\n')}

위의 기존 요약과 새로운 뉴스를 종합적으로 분석하여 하나의 요약으로 만들어주세요.
`;

      summaryContent = await summarizeNews(newsItems, stockName, combinedPrompt);
      newsCount = existingSummary.news_count + newsItems.length;

      // 3. 기존 요약 업데이트
      const { data: updatedSummary, error: updateError } = await supabase
        .from('stock_news_summaries')
        .update({
          summary_content: summaryContent,
          news_count: newsCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSummary.id)
        .select()
        .single();

      if (updateError) {
        console.error('업데이트 오류:', updateError);
        throw new Error('요약 업데이트 중 오류가 발생했습니다.');
      }

      if (!updatedSummary) {
        throw new Error('업데이트된 요약을 찾을 수 없습니다.');
      }

      return updatedSummary;
    } else {
      // 4. 기존 요약이 없다면, 새로운 요약 생성
      summaryContent = await summarizeNews(newsItems, stockName);
      newsCount = newsItems.length;

      const { data: newSummary, error: insertError } = await supabase
        .from('stock_news_summaries')
        .insert({
          stock_code: stockCode,
          stock_name: stockName,
          summary_date: date,
          summary_content: summaryContent,
          news_count: newsCount
        })
        .select()
        .single();

      if (insertError) {
        console.error('삽입 오류:', insertError);
        throw new Error('새로운 요약 저장 중 오류가 발생했습니다.');
      }

      if (!newSummary) {
        throw new Error('저장된 요약을 찾을 수 없습니다.');
      }

      return newSummary;
    }
  } catch (error) {
    console.error('뉴스 요약 저장 중 오류 발생:', error);
    throw error;
  }
}

export async function getNewsSummary(
  stockCode: string,
  date: string
): Promise<StockNewsSummary | null> {
  try {
    const { data, error } = await supabase
      .from('stock_news_summaries')
      .select('*')
      .eq('stock_code', stockCode)
      .eq('summary_date', date)
      .maybeSingle();

    if (error) {
      console.error('조회 오류:', error);
      throw new Error('요약 조회 중 오류가 발생했습니다.');
    }

    return data;
  } catch (error) {
    console.error('뉴스 요약 조회 중 오류 발생:', error);
    throw error;
  }
}

export async function getNewsSummariesByDateRange(
  stockCode: string,
  startDate: string,
  endDate: string
): Promise<StockNewsSummary[]> {
  try {
    const { data, error } = await supabase
      .from('stock_news_summaries')
      .select('*')
      .eq('stock_code', stockCode)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: false });

    if (error) {
      console.error('조회 오류:', error);
      throw new Error('요약 조회 중 오류가 발생했습니다.');
    }

    return data || [];
  } catch (error) {
    console.error('뉴스 요약 조회 중 오류 발생:', error);
    throw error;
  }
} 