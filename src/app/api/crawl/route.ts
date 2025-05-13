import { NextResponse } from 'next/server';
import { crawlNaverFinanceNews } from '@/lib/newsCrawler';

export async function POST(request: Request) {
  try {
    const { stockCode, startPage, endPage } = await request.json();
    
    if (!stockCode) {
      return NextResponse.json(
        { error: '종목코드가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!startPage || !endPage || startPage > endPage) {
      return NextResponse.json(
        { error: '유효하지 않은 페이지 범위입니다.' },
        { status: 400 }
      );
    }

    const newsItems = await crawlNaverFinanceNews(stockCode, startPage, endPage);
    
    if (newsItems.length === 0) {
      return NextResponse.json(
        { error: '뉴스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 수집된 뉴스 내용 출력
    console.log('\n=== 수집된 뉴스 목록 ===');
    newsItems.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.title}`);
      console.log(`날짜: ${item.date}`);
      console.log(`출처: ${item.source}`);
      console.log(`URL: ${item.url}`);
      console.log('내용:', item.content.substring(0, 200) + '...');
      console.log('----------------------------------------');
    });
    console.log(`\n총 ${newsItems.length}개의 뉴스 수집 완료 (${startPage}~${endPage}페이지)\n`);
    
    return NextResponse.json({ 
      newsItems,
      stockInfo: {
        code: stockCode,
        name: '종목명', // TODO: 실제 종목명을 가져오는 로직 추가 필요
        market: 'KOSPI'
      }
    });
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    return NextResponse.json(
      { error: '뉴스 크롤링 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 