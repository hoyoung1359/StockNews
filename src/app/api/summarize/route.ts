import { NextResponse } from 'next/server';
import { NewsItem } from '@/lib/newsCrawler';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 최대 처리할 뉴스 개수
//const MAX_NEWS_COUNT = 10;

// 뉴스 관련성 점수 계산 함수
// function calculateRelevanceScore(item: NewsItem, stockName: string): number {
//   const title = item.title.toLowerCase();
//   const content = item.content.toLowerCase();
//   const stockNameLower = stockName.toLowerCase();
  
//   let score = 0;
  
//   // 제목에 종목명이 포함된 경우
//   if (title.includes(stockNameLower)) {
//     score += 3;
//   }
  
//   // 본문에 종목명이 포함된 경우
//   const stockNameCount = (content.match(new RegExp(stockNameLower, 'g')) || []).length;
//   score += Math.min(stockNameCount, 5); // 최대 5점
  
//   // 주요 키워드 확인
//   const keywords = [
//     '실적', '매출', '영업이익', '주가', '투자', '사업', '전략',
//     '성장', '개발', '출시', '계약', '인수', '합병', 'M&A',
//     '배당', '주주', '이사회', 'CEO', 'CFO', '임원'
//   ];
  
//   keywords.forEach(keyword => {
//     if (content.includes(keyword)) {
//       score += 0.5;
//     }
//   });
  
//   return score;
// }

// 뉴스 본문 전처리 함수
// function preprocessNewsContent(content: string): string {
//   // 불필요한 공백 제거
//   let processed = content.replace(/\s+/g, ' ').trim();
  
//   // 중복된 문장 제거
//   const sentences = processed.split(/[.!?]+/).filter(Boolean);
//   const uniqueSentences = Array.from(new Set(sentences));
//   processed = uniqueSentences.join('. ') + '.';
  
//   return processed;
// }

export async function POST(request: Request) {
  try {
    const { newsItems, stockName, customPrompt } = await request.json();

    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      return NextResponse.json(
        { message: '뉴스 항목이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!stockName || typeof stockName !== 'string') {
      return NextResponse.json(
        { message: '종목명이 필요합니다.' },
        { status: 400 }
      );
    }

    const prompt = customPrompt || `
다음은 ${stockName}에 대한 최근 뉴스들입니다. 이 뉴스들을 종합적으로 분석하여 다음 형식으로 요약해주세요:

1. 시장 동향
- 전체적인 시장 상황과 주요 이슈
- ${stockName}의 시장 내 위치와 영향력

2. 핵심 뉴스 분석
- 가장 중요한 뉴스와 그 의미
- 전체적인 맥락에서의 해석

3. 투자 시사점
- 단기적 관점
- 중장기적 관점
- 주의해야 할 리스크 요인

각 섹션은 명확하게 구분되어야 하며, 마크다운 문법이나 특수 기호를 사용하지 말고 일반 텍스트로 작성해주세요.
각 항목은 들여쓰기와 줄바꿈을 사용하여 가독성을 높여주세요.

뉴스 목록:
${newsItems.map((item: NewsItem) => `- ${item.title}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: '당신은 주식 시장 전문가입니다. 주어진 뉴스를 종합적으로 분석하고 투자자에게 도움이 되는 인사이트를 제공해주세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return NextResponse.json({
      summary: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('뉴스 요약 중 오류 발생:', error);
    return NextResponse.json(
      { message: '뉴스 요약 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 