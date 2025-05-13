import axios from 'axios';
import * as cheerio from 'cheerio';

export interface StockInfo {
  code: string;
  name: string;
  market: string;
}

export async function searchStock(keyword: string): Promise<StockInfo[]> {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://finance.naver.com/search/searchList.naver?query=${encodedKeyword}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const stocks: StockInfo[] = [];

    $('.tbl_search tbody tr').each((_, element) => {
      const $element = $(element);
      const name = $element.find('.tit').text().trim();
      const code = $element.find('.tit').attr('href')?.split('code=')[1]?.split('&')[0] || '';
      const market = $element.find('.market').text().trim();

      if (name && code) {
        stocks.push({
          name,
          code,
          market
        });
      }
    });

    return stocks;
  } catch (error) {
    console.error('종목 검색 중 오류 발생:', error);
    return [];
  }
} 