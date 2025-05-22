'use client';

import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface StockChartProps {
  stockCode: string;
  stockName: string;
}

interface ChartDataPoint {
  stck_bsop_date: string; // 주식 영업 일자
  stck_clpr: string;      // 종가
  stck_oprc: string;      // 시가
  stck_hgpr: string;      // 고가
  stck_lwpr: string;      // 저가
  acml_vol: string;       // 거래량
}

const StockChart: React.FC<StockChartProps> = ({ stockCode, stockName }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'daily' | 'minute'>('daily');

  useEffect(() => {
    const fetchChartData = async () => {
      if (!stockCode) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stock-chart?code=${stockCode}&type=${chartType}`);
        
        if (!response.ok) {
          throw new Error('차트 데이터를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        
        if (data.success && data.chartData) {
          processChartData(data.chartData);
        } else {
          setError('차트 데이터가 없습니다.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '차트 데이터를 가져오는데 실패했습니다.');
        console.error('차트 데이터 조회 에러:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [stockCode, chartType]);

  const processChartData = (rawData: any) => {
    if (!rawData.output || !Array.isArray(rawData.output)) {
      setError('유효한 차트 데이터가 없습니다.');
      return;
    }

    const chartItems = rawData.output;
    
    // 날짜 오름차순 정렬
    chartItems.sort((a: ChartDataPoint, b: ChartDataPoint) => {
      return a.stck_bsop_date.localeCompare(b.stck_bsop_date);
    });

    const labels = chartItems.map((item: ChartDataPoint) => {
      // YYYYMMDD 형식을 YYYY-MM-DD로 변환
      const date = item.stck_bsop_date;
      return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    });

    const prices = chartItems.map((item: ChartDataPoint) => parseInt(item.stck_clpr));
    const volumes = chartItems.map((item: ChartDataPoint) => parseInt(item.acml_vol));

    const formattedData = {
      labels,
      datasets: [
        {
          label: '종가',
          data: prices,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y',
        },
        {
          label: '거래량',
          data: volumes,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
          type: 'bar',
        },
      ],
    };

    setChartData(formattedData);
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${stockName}(${stockCode}) ${chartType === 'daily' ? '일봉' : '분봉'} 차트`,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '가격 (원)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '거래량',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {stockName} ({stockCode}) 차트
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('daily')}
            className={`px-3 py-1 rounded-lg text-sm ${
              chartType === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            일봉
          </button>
          <button
            onClick={() => setChartType('minute')}
            className={`px-3 py-1 rounded-lg text-sm ${
              chartType === 'minute'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            분봉
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && !error && chartData && (
        <div className="h-80">
          <Line options={chartOptions} data={chartData} />
        </div>
      )}

      {!loading && !error && !chartData && (
        <div className="text-center py-12 text-gray-500">
          차트 데이터를 불러오는 중입니다...
        </div>
      )}
    </div>
  );
};

export default StockChart; 