import { NextRequest, NextResponse } from 'next/server';
import { getDailyStockChart, getMinuteStockChart } from '@/lib/kisApi';

/**
 * 주식 차트 데이터를 조회하는 API 엔드포인트
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get('code');
    const chartType = searchParams.get('type') || 'daily'; // daily 또는 minute
    
    if (!stockCode) {
      return NextResponse.json({ error: '종목코드가 필요합니다.' }, { status: 400 });
    }

    let chartData;
    
    if (chartType === 'daily') {
      // 기본값으로 최근 3개월 데이터 조회
      const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
        .replace(/-/g, '');
      
      chartData = await getDailyStockChart(stockCode, startDate, endDate);
    } else if (chartType === 'minute') {
      const timeFrame = searchParams.get('timeFrame') || '30'; // 기본 30분봉
      const count = searchParams.get('count') || '100'; // 기본 100개 데이터
      
      chartData = await getMinuteStockChart(stockCode, timeFrame, count);
    } else {
      return NextResponse.json({ error: '지원하지 않는 차트 타입입니다.' }, { status: 400 });
    }

    // 차트 데이터 가공 (필요시 조정)
    return NextResponse.json({ 
      success: true,
      chartData: chartData
    });
    
  } catch (error) {
    console.error('차트 데이터 조회 에러:', error);
    return NextResponse.json(
      { error: '차트 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 