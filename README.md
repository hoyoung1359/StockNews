# StockNews

주식 뉴스 분석 및 시각화 플랫폼

## 프로젝트 소개

StockNews는 주식 관련 뉴스를 수집하고 분석하여 투자자들에게 유용한 인사이트를 제공하는 웹 애플리케이션입니다. 한국투자증권 API를 활용하여 실시간 주식 데이터를 제공하며, 뉴스 데이터를 분석하여 시장 동향을 파악할 수 있습니다.

## 주요 기능

- 실시간 주식 시세 조회
- 주식 관련 뉴스 수집 및 분석
- 뉴스 감성 분석을 통한 시장 동향 파악
- 사용자 맞춤형 주식 포트폴리오 관리
- 실시간 알림 서비스

## 기술 스택

### 프론트엔드
- Next.js 15.3.2
- React 19
- TypeScript
- TailwindCSS
- HeadlessUI
- HeroIcons

### 백엔드
- Next.js API Routes
- Supabase (데이터베이스)
- Vercel (배포)

### 주요 라이브러리
- axios: HTTP 클라이언트
- cheerio: 웹 스크래핑
- puppeteer: 브라우저 자동화
- openai: AI 기반 분석
- supabase-js: 데이터베이스 클라이언트

## 시작하기

1. 저장소 클론
```bash
git clone [repository-url]
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일을 생성하고 필요한 환경 변수를 설정합니다.

4. 개발 서버 실행
```bash
npm run dev
```

## 배포

이 프로젝트는 Vercel을 통해 배포됩니다. main 브랜치에 푸시하면 자동으로 배포가 진행됩니다.

## 라이선스

MIT License