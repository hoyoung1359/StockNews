import { NextResponse } from 'next/server';
import { crawlNaverStockDiscussion } from '@/lib/stockDiscussionCrawler';

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

    const discussionItems = await crawlNaverStockDiscussion(stockCode, startPage, endPage);
    
    if (discussionItems.length === 0) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 수집된 게시글 내용 출력
    console.log('\n=== 수집된 게시글 목록 ===');
    discussionItems.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.title}`);
      console.log(`작성자: ${item.author}`);
      console.log(`날짜: ${item.date}`);
      console.log(`조회수: ${item.views}`);
      console.log(`좋아요: ${item.likes}`);
      console.log(`URL: ${item.url}`);
      console.log('내용:', item.content.substring(0, 200) + '...');
      console.log('----------------------------------------');
    });
    console.log(`\n총 ${discussionItems.length}개의 게시글 수집 완료 (${startPage}~${endPage}페이지)\n`);
    
    return NextResponse.json({ 
      discussionItems,
      stockInfo: {
        code: stockCode,
        name: '종목명', // TODO: 실제 종목명을 가져오는 로직 추가 필요
        market: 'KOSPI'
      }
    });
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    return NextResponse.json(
      { error: '게시글 크롤링 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 