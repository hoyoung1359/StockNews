import axios from 'axios';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';

export interface NewsItem {
  title: string;
  content: string;
  url: string;
  date: string;
  source: string;
  summary: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getNewsContent(url: string): Promise<string> {
  try {
    // URL에서 article_id와 office_id 추출
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const articleId = urlParams.get('article_id');
    const officeId = urlParams.get('office_id');

    if (!articleId || !officeId) {
      throw new Error('Invalid news URL');
    }

    // 실제 뉴스 본문 URL 구성
    const newsUrl = `https://n.news.naver.com/article/${officeId}/${articleId}`;
    
    const response = await axios.get(newsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // 네이버 뉴스 본문 선택자
    const content = $('#newsct_article, #articeBody, #articleBodyContents, #article-view-content-div').text().trim();
    
    if (!content) {
      // 대체 선택자 시도
      const alternativeContent = $('.article_body, .article_view, .news_end, .newsViewArea').text().trim();
      return alternativeContent || '내용을 가져올 수 없습니다.';
    }
    
    return content;
  } catch (error) {
    console.error('뉴스 본문 크롤링 실패:', error);
    return '내용을 가져올 수 없습니다.';
  }
}

export async function crawlNaverFinanceNews(
  stockCode: string,
  startPage: number,
  endPage: number
): Promise<NewsItem[]> {
  const newsItems: NewsItem[] = [];
  const headers = {
    'Referer': 'https://finance.naver.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  try {
    // 먼저 메인 페이지 방문
    await axios.get(`https://finance.naver.com/item/main.naver?code=${stockCode}`, { 
      headers,
      responseType: 'arraybuffer'
    });
    await delay(1000);

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const url = `https://finance.naver.com/item/news_news.naver?code=${stockCode}&page=${pageNum}`;
      console.log(`페이지 ${pageNum}/${endPage} 크롤링 시작:`, url);

      const response = await axios.get(url, { 
        headers,
        responseType: 'arraybuffer'
      });
      
      // EUC-KR 디코딩
      const html = iconv.decode(response.data, 'EUC-KR');
      const $ = cheerio.load(html);
      
      const rows = $('table.type5 tr');
      
      rows.each((_, row) => {
        if ($(row).find('th').length) return; // 헤더 행 건너뛰기
        
        const titleCell = $(row).find('td.title');
        const link = titleCell.find('a');
        const dateCell = $(row).find('td.date');
        const infoCell = $(row).find('td.info');
        
        if (titleCell.length && link.length) {
          const title = link.text().trim();
          const href = link.attr('href') || '';

          if (title && href) {
            newsItems.push({
              title,
              content: '',
              url: href.startsWith('http') ? href : `https://finance.naver.com${href}`,
              date: dateCell.text().trim(),
              source: infoCell.text().trim(),
              summary: ''
            });
          }
        }
      });

      console.log(`페이지 ${pageNum}/${endPage}에서 ${newsItems.length}개의 뉴스 항목 발견`);
      
      if (pageNum < endPage) {
        await delay(1000);
      }
    }

    // 뉴스 본문 수집
    console.log('뉴스 본문 수집 시작...');
    for (const item of newsItems) {
      try {
        const content = await getNewsContent(item.url);
        item.content = content;
      } catch (error) {
        console.error(`본문 수집 실패: ${item.title}`, error);
      }
      await delay(500);
    }

    console.log(`총 ${newsItems.length}개의 뉴스 항목 수집 완료 (${endPage - startPage + 1}페이지)`);
    return newsItems;
  } catch (error) {
    console.error('뉴스 크롤링 중 오류 발생:', error);
    return [];
  }
} 
