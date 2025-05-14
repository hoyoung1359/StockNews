import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('stock_master')
      .select('code, name, market')
      .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ stocks: data });
  } catch (error) {
    console.error('종목 검색 중 오류:', error);
    return NextResponse.json({ error: '종목 검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 