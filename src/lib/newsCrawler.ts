/* eslint-disable @typescript-eslint/no-unused-vars */
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface NewsItem {
  title: string;
  content: string;
  url: string;
  date: string;
  source: string;
  summary: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getNewsContent(page: Page, url: string): Promise<string> {
  try {
    await page.setExtraHTTPHeaders({
      'Referer': 'https://finance.naver.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    console.log('뉴스 본문 페이지 접속:', url);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const content = await page.evaluate(() => {
      // 다양한 선택자 시도
      const selectors = [
        '#newsEndContents',
        '.article_body',
        '.article_view',
        '#articleBodyContents',
        '.news_end',
        '.newsViewArea',
        '.article_body_contents',
        '#articleBody',
        '.article-body',
        '.news_body_area'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim() || '';
        }
      }
      
      // 선택자를 찾지 못한 경우 전체 본문 영역 찾기
      const article = document.querySelector('article') || 
                     document.querySelector('.article') ||
                     document.querySelector('.news') ||
                     document.querySelector('.content');
      
      if (article) {
        return article.textContent?.trim() || '';
      }
      
      return '내용을 가져올 수 없습니다.';
    });
    
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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 기본 HTTP 헤더 설정
  await page.setExtraHTTPHeaders({
    'Referer': 'https://finance.naver.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  const newsItems: NewsItem[] = [];

  try {
    // 먼저 메인 페이지 방문
    await page.goto(`https://finance.naver.com/item/main.naver?code=${stockCode}`, {
      waitUntil: 'networkidle0'
    });
    await delay(1000);

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const url = `https://finance.naver.com/item/news_news.naver?code=${stockCode}&page=${pageNum}`;
      console.log(`페이지 ${pageNum}/${endPage} 크롤링 시작:`, url);

      await page.goto(url, { waitUntil: 'networkidle0' });
      
      const pageNewsItems = await page.evaluate(() => {
        const items: NewsItem[] = [];
        const rows = document.querySelectorAll('table.type5 tr');
        
        rows.forEach(row => {
          if (row.querySelector('th')) return; // 헤더 행 건너뛰기
          
          const titleCell = row.querySelector('td.title');
          const link = titleCell?.querySelector('a');
          const dateCell = row.querySelector('td.date');
          const infoCell = row.querySelector('td.info');
          
          if (titleCell && link) {
            const title = link.textContent?.trim() || '';
            const href = link.getAttribute('href') || '';

            if (title && href) {
              items.push({
                title,
                content: '',
                url: href.startsWith('http') ? href : `https://finance.naver.com${href}`,
                date: dateCell?.textContent?.trim() || '',
                source: infoCell?.textContent?.trim() || '',
                summary: ''
              });
            }
          }
        });
        
        return items;
      });

      newsItems.push(...pageNewsItems);
      console.log(`페이지 ${pageNum}/${endPage}에서 ${pageNewsItems.length}개의 뉴스 항목 발견`);
      
      if (pageNum < endPage) {
        await delay(1000);
      }
    }

    // 뉴스 본문 수집
    console.log('뉴스 본문 수집 시작...');
    for (const item of newsItems) {
      try {
        const content = await getNewsContent(page, item.url);
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
  } finally {
    await browser.close();
  }
} 
