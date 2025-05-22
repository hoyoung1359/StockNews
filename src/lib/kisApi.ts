import axios from 'axios';

// 토큰 캐싱을 위한 변수들
let accessToken: string | null = null;
let tokenExpireTime: number | null = null;

/**
 * 한국투자증권 API 접근 토큰을 가져옵니다.
 * 토큰을 캐싱하여 불필요한 API 호출을 방지합니다.
 */
export async function getKisAccessToken(): Promise<string> {
  // 토큰이 유효한 경우 캐싱된 토큰 반환
  if (accessToken && tokenExpireTime && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  try {
    const appKey = process.env.NEXT_PUBLIC_KIS_APP_KEY;
    const appSecret = process.env.NEXT_PUBLIC_KIS_APP_SECRET;

    const response = await axios.post(
      'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
      {
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }
    );

    const newToken = response.data.access_token;
    accessToken = newToken;
    // 토큰 만료 시간 설정 (만료 시간 1분 전으로 설정)
    tokenExpireTime = Date.now() + (response.data.expires_in * 1000) - 60000;
    
    return newToken;
  } catch (error) {
    console.error('KIS 접근 토큰 발급 에러:', error);
    throw new Error('한국투자증권 API 접근 토큰을 발급받는데 실패했습니다.');
  }
}

/**
 * 주식 일별 시세 조회
 * @param stockCode 종목코드
 * @param startDate 시작일자 (YYYYMMDD)
 * @param endDate 종료일자 (YYYYMMDD)
 */
export async function getDailyStockChart(
  stockCode: string, 
  startDate: string, 
  endDate: string
) {
  try {
    const token = await getKisAccessToken();
    const appKey = process.env.NEXT_PUBLIC_KIS_APP_KEY;
    
    const response = await axios.get(
      `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-price`,
      {
        params: {
          FID_COND_MRKT_DIV_CODE: 'J', // 시장구분코드 (J: 주식)
          FID_INPUT_ISCD: stockCode, // 종목코드
          FID_PERIOD_DIV_CODE: 'D', // 기간구분코드 (D: 일)
          FID_ORG_ADJ_PRC: '1', // 수정주가 반영여부 (1: 수정주가 반영)
          ST_DT: startDate, // 조회 시작일자
          END_DT: endDate, // 조회 종료일자
        },
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: process.env.NEXT_PUBLIC_KIS_APP_SECRET,
          tr_id: 'FHKST01010400', // 거래ID (일별주가)
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('주식 차트 데이터 조회 에러:', error);
    throw new Error('주식 차트 데이터를 가져오는데 실패했습니다.');
  }
}

/**
 * 주식 분봉 시세 조회
 * @param stockCode 종목코드
 * @param timeFrame 분봉 단위 (1, 3, 5, 10, 15, 30, 60)
 * @param count 요청 개수 (최대 100)
 */
export async function getMinuteStockChart(
  stockCode: string,
  timeFrame: string = '30',
  count: string = '100'
) {
  try {
    const token = await getKisAccessToken();
    const appKey = process.env.NEXT_PUBLIC_KIS_APP_KEY;
    
    const response = await axios.get(
      `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice`,
      {
        params: {
          FID_ETC_CLS_CODE: timeFrame, // 분봉 단위
          FID_COND_MRKT_DIV_CODE: 'J', // 시장구분코드
          FID_INPUT_ISCD: stockCode, // 종목코드
          FID_PW_DATA_INCU_YN: 'N', // 조회 데이터 포함 여부
          FID_INPUT_DATE_1: '', // 조회일자
          FID_INPUT_HOUR_1: '', // 조회시간
          FID_REQ_CNT: count, // 요청건수
        },
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: process.env.NEXT_PUBLIC_KIS_APP_SECRET,
          tr_id: 'FHKST03010200', // 거래ID (분봉)
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('주식 분봉 차트 데이터 조회 에러:', error);
    throw new Error('주식 분봉 차트 데이터를 가져오는데 실패했습니다.');
  }
} 