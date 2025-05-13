-- 기존 테이블과 관련된 모든 것을 삭제
drop table if exists public.stock_news_summaries cascade;

-- 종목별 뉴스 요약 테이블 생성
create table public.stock_news_summaries (
  id uuid default gen_random_uuid() primary key,
  stock_code text not null,
  stock_name text not null,
  summary_date date not null,
  summary_content text not null,
  news_count integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 복합 유니크 제약조건 추가 (같은 종목의 같은 날짜에 중복 저장 방지)
alter table public.stock_news_summaries
  add constraint stock_news_summaries_stock_code_date_key 
  unique (stock_code, summary_date);

-- 인덱스 생성
create index idx_stock_news_summaries_stock_code 
  on public.stock_news_summaries(stock_code);
create index idx_stock_news_summaries_summary_date 
  on public.stock_news_summaries(summary_date);

-- RLS(Row Level Security) 정책 설정
alter table public.stock_news_summaries enable row level security;

-- 모든 작업에 대한 정책 추가 (개발 환경용)
create policy "Enable all operations for all users" on public.stock_news_summaries
  for all using (true) with check (true);

  -- 종목 마스터 테이블 삭제 (필요 시)
drop table if exists public.stock_master cascade;

-- 종목 검색용 마스터 테이블 생성
create table public.stock_master (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,            -- 종목코드
  name text not null,                   -- 종목명
  market text,                          -- 시장 구분 (KOSPI, KOSDAQ 등)
  sector text,                          -- 업종 (선택사항)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 인덱스: 종목명 검색 최적화
create index idx_stock_master_name on public.stock_master(name);

-- RLS 설정 (모든 사용자 허용, 개발 환경용)
alter table public.stock_master enable row level security;

create policy "Enable all operations for all users" on public.stock_master
  for all using (true) with check (true);
