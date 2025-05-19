import { NextResponse } from 'next/server';
import { DiscussionItem } from '@/lib/stockDiscussionCrawler';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 최대 처리할 게시글 개수
const MAX_DISCUSSION_COUNT = 10;

// 게시글 관련성 점수 계산 함수
function calculateRelevanceScore(item: DiscussionItem, stockName: string): number {
  const title = item.title.toLowerCase();
  const content = item.content.toLowerCase();
  const stockNameLower = stockName.toLowerCase();
  
  let score = 0;
  
  // 제목에 종목명이 포함된 경우
  if (title.includes(stockNameLower)) {
    score += 3;
  }
  
  // 본문에 종목명이 포함된 경우
  const stockNameCount = (content.match(new RegExp(stockNameLower, 'g')) || []).length;
  score += Math.min(stockNameCount, 5); // 최대 5점
  
  // 조회수와 좋아요 수 반영
  score += Math.min(item.views / 100, 5); // 조회수당 0.01점, 최대 5점
  score += Math.min(item.likes, 5); // 좋아요당 1점, 최대 5점
  
  return score;
}

// 게시글 본문 전처리 함수
// function preprocessDiscussionContent(content: string): string {
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
    const { discussionItems, stockName, customPrompt } = await request.json();

    if (!Array.isArray(discussionItems) || discussionItems.length === 0) {
      return NextResponse.json(
        { message: '게시글 항목이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!stockName || typeof stockName !== 'string') {
      return NextResponse.json(
        { message: '종목명이 필요합니다.' },
        { status: 400 }
      );
    }

    // 게시글 관련성 점수 계산 및 정렬
    const scoredItems = discussionItems.map(item => ({
      ...item,
      relevanceScore: calculateRelevanceScore(item, stockName)
    }));

    scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 상위 N개 게시글만 선택
    const topItems = scoredItems.slice(0, MAX_DISCUSSION_COUNT);

    const prompt = customPrompt || `
다음은 ${stockName}에 대한 최근 종목토론방 게시글들입니다. 이 게시글들을 종합적으로 분석하여 다음 형식으로 요약해주세요:

1. 투자자 심리 분석
- 전체적인 투자자들의 심리 상태
- 주요 관심사와 우려사항

2. 핵심 논의 사항
- 가장 많이 논의되는 주제
- 긍정적/부정적 의견 분석

3. 투자 시사점
- 단기적 관점
- 중장기적 관점
- 주의해야 할 리스크 요인

각 섹션은 명확하게 구분되어야 하며, 마크다운 문법이나 특수 기호를 사용하지 말고 일반 텍스트로 작성해주세요.
각 항목은 들여쓰기와 줄바꿈을 사용하여 가독성을 높여주세요.

게시글 목록:
${topItems.map((item: DiscussionItem) => `- ${item.title} (조회수: ${item.views}, 좋아요: ${item.likes})`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: '당신은 주식 시장 전문가입니다. 주어진 종목토론방 게시글들을 종합적으로 분석하고 투자자에게 도움이 되는 인사이트를 제공해주세요.'
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
    console.error('게시글 요약 중 오류 발생:', error);
    return NextResponse.json(
      { message: '게시글 요약 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 