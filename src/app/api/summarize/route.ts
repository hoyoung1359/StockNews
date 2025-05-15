/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { NewsItem } from '@/lib/newsCrawler';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_NEWS_COUNT = 10;

function calculateRelevanceScore(news: NewsItem): number {
  // ... existing code ...
}

function preprocessNewsContent(content: string): string {
  // ... existing code ...
}

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