import axios from 'axios';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';

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

async function getDiscussionContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.naver.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      responseType: 'arraybuffer'
    });
    
    const html = iconv.decode(response.data, 'EUC-KR');
    const $ = cheerio.load(html);
    const content = $('#body, .view_content, .post_content, .post-view').text().trim();
    
    return content || '내용을 가져올 수 없습니다.';
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
  const discussionItems: DiscussionItem[] = [];
  const headers = {
    'Referer': 'https://finance.naver.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  try {
    // 먼저 종목 메인 페이지 방문
    const mainUrl = `https://finance.naver.com/item/main.naver?code=${stockCode}`;
    console.log('종목 메인 페이지 접속:', mainUrl);
    await axios.get(mainUrl, { 
      headers,
      responseType: 'arraybuffer'
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const url = `https://finance.naver.com/item/board.naver?code=${stockCode}&page=${pageNum}`;
      console.log(`페이지 ${pageNum}/${endPage} 크롤링 시작:`, url);

      const response = await axios.get(url, { 
        headers,
        responseType: 'arraybuffer'
      });
      
      const html = iconv.decode(response.data, 'EUC-KR');
      const $ = cheerio.load(html);
      
      const rows = $('table.type2 tr');
      console.log('발견된 행 개수:', rows.length);
      
      rows.each((index, row) => {
        if ($(row).find('th').length || $(row).find('td[colspan]').length) {
          console.log(`헤더/빈 행 ${index} 건너뛰기`);
          return;
        }
        
        console.log(`행 ${index} 처리 시작`);
        
        const titleCell = $(row).find('td.title');
        const link = titleCell.find('a');
        const dateCell = $(row).find('td:first-child');
        const authorCell = $(row).find('td.p11');
        const viewsCell = $(row).find('td:nth-child(4)');
        const likesCell = $(row).find('td:nth-child(5)');
        
        console.log(`행 ${index} 데이터:`, {
          title: titleCell.text(),
          date: dateCell.text(),
          author: authorCell.text(),
          views: viewsCell.text(),
          likes: likesCell.text()
        });
        
        if (titleCell.length && link.length) {
          const title = link.text().trim();
          const href = link.attr('href') || '';

          if (title && href) {
            discussionItems.push({
              title,
              content: '',
              url: href.startsWith('http') ? href : `https://finance.naver.com${href}`,
              date: dateCell.text().trim(),
              author: authorCell.text().trim(),
              views: parseInt(viewsCell.text().trim() || '0'),
              likes: parseInt(likesCell.text().trim() || '0'),
              summary: ''
            });
          }
        }
      });

      console.log(`페이지 ${pageNum}/${endPage}에서 ${discussionItems.length}개의 게시글 발견`);
      
      if (pageNum < endPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 게시글 본문 수집
    console.log('게시글 본문 수집 시작...');
    for (const item of discussionItems) {
      try {
        const content = await getDiscussionContent(item.url);
        item.content = content;
      } catch (error) {
        console.error(`본문 수집 실패: ${item.title}`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`총 ${discussionItems.length}개의 게시글 수집 완료 (${endPage - startPage + 1}페이지)`);
    return discussionItems;
  } catch (error) {
    console.error('게시글 크롤링 중 오류 발생:', error);
    return [];
  }
} 