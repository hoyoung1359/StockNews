import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StockItem = {
  code: string;
  name: string;
  market: string;
};

function parseLine(line: string): StockItem | null {
  if (line.length < 70) return null;

  // 종목코드는 6자리로 고정되어 있음
  const code = line.slice(0, 6).trim();
  
  // 종목명은 ISIN 코드 이후부터 ST 이전까지
  const nameStart = line.indexOf('KR7') + 12; // ISIN 코드 이후
  const nameEnd = line.indexOf('ST', nameStart);
  const name = line.slice(nameStart, nameEnd).trim();

  // 유효성 검사
  if (!code || !name || !/^\d{6}$/.test(code)) return null;

  return {
    code,
    name,
    market: 'KOSPI',
  };
}

function deduplicateByCode(items: StockItem[]): StockItem[] {
  const map = new Map<string, StockItem>();
  for (const item of items) {
    map.set(item.code, item);
  }
  return Array.from(map.values());
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public/kospi_code.txt');
    const buffer = fs.readFileSync(filePath);
    const raw = iconv.decode(buffer, 'cp949');
    const lines = raw.split('\n');

    const parsedItems: StockItem[] = [];
    for (const line of lines) {
      const item = parseLine(line);
      if (item) parsedItems.push(item);
    }

    const items = deduplicateByCode(parsedItems);

    const { error } = await supabase.from('stock_master').upsert(items, {
      onConflict: 'code',
    });

    if (error) {
      console.error('Supabase 업로드 실패:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '✅ 종목명까지 포함하여 정상 등록됨', count: items.length });
  } catch (e: unknown) {
    console.error('서버 오류:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
