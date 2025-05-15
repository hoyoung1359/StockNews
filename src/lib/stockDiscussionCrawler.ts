import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface DiscussionItem {
  title: string;
  content: string;
  url: string;
  date: string;
  author: string;
  views: number;
  likes: number;
  summary: string;
}

async function getDiscussionContent(page: Page, url: string): Promise<string> {
  try {
    await page.setExtraHTTPHeaders({
      'Referer': 'https://finance.naver.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    console.log('게시글 페이지 접속:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    const content = await page.evaluate(() => {
      const contentElement = document.querySelector('#body') || 
                           document.querySelector('.view_content') ||
                           document.querySelector('.post_content') ||
                           document.querySelector('.post-view');
      return contentElement?.textContent?.trim() || '';
    });
    
    return content;
  } catch (error) {
    console.error('게시글 본문 크롤링 실패:', error);
    return '내용을 가져올 수 없습니다.';
  }
}

export async function crawlNaverStockDiscussion(
  stockCode: string,
  startPage: number,
  endPage: number
): Promise<DiscussionItem[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 타임아웃 설정
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  
  await page.setExtraHTTPHeaders({
    'Referer': 'https://finance.naver.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  const discussionItems: DiscussionItem[] = [];

  try {
    // 먼저 종목 메인 페이지 방문
    const mainUrl = `https://finance.naver.com/item/main.naver?code=${stockCode}`;
    console.log('종목 메인 페이지 접속:', mainUrl);
    await page.goto(mainUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      // 종목토론방 URL 수정
      const url = `https://finance.naver.com/item/board.naver?code=${stockCode}&page=${pageNum}`;
      console.log(`페이지 ${pageNum}/${endPage} 크롤링 시작:`, url);

      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      // 페이지 HTML 구조 디버깅
      const pageContent = await page.content();
      console.log('페이지 HTML 구조:', pageContent.substring(0, 500) + '...');
      
      const pageDiscussionItems = await page.evaluate(() => {
        const items: DiscussionItem[] = [];
        
        // 게시글 목록 선택자 수정
        const rows = document.querySelectorAll('table.type2 tr');
        console.log('발견된 행 개수:', rows.length);
        
        rows.forEach((row, index) => {
          // 헤더 행과 빈 행 건너뛰기
          if (row.querySelector('th') || row.querySelector('td[colspan]')) {
            console.log(`헤더/빈 행 ${index} 건너뛰기`);
            return;
          }
          
          console.log(`행 ${index} 처리 시작`);
          
          // 게시글 정보 선택자 수정
          const titleCell = row.querySelector('td.title');
          const link = titleCell?.querySelector('a');
          const dateCell = row.querySelector('td:first-child');
          const authorCell = row.querySelector('td.p11');
          const viewsCell = row.querySelector('td:nth-child(4)');
          const likesCell = row.querySelector('td:nth-child(5)');
          
          console.log(`행 ${index} 데이터:`, {
            title: titleCell?.textContent,
            date: dateCell?.textContent,
            author: authorCell?.textContent,
            views: viewsCell?.textContent,
            likes: likesCell?.textContent
          });
          
          if (titleCell && link) {
            const title = link.textContent?.trim() || '';
            const href = link.getAttribute('href') || '';

            if (title && href) {
              items.push({
                title,
                content: '',
                url: href.startsWith('http') ? href : `https://finance.naver.com${href}`,
                date: dateCell?.textContent?.trim() || '',
                author: authorCell?.textContent?.trim() || '',
                views: parseInt(viewsCell?.textContent?.trim() || '0'),
                likes: parseInt(likesCell?.textContent?.trim() || '0'),
                summary: ''
              });
            }
          }
        });
        
        return items;
      });

      discussionItems.push(...pageDiscussionItems);
      console.log(`페이지 ${pageNum}/${endPage}에서 ${pageDiscussionItems.length}개의 게시글 발견`);
      
      if (pageNum < endPage) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 게시글 본문 수집
    console.log('게시글 본문 수집 시작...');
    for (const item of discussionItems) {
      try {
        const content = await getDiscussionContent(page, item.url);
        item.content = content;
      } catch (error) {
        console.error(`본문 수집 실패: ${item.title}`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`총 ${discussionItems.length}개의 게시글 수집 완료 (${endPage - startPage + 1}페이지)`);
    return discussionItems;
  } catch (error) {
    console.error('게시글 크롤링 중 오류 발생:', error);
    return [];
  } finally {
    await browser.close();
  }
} 