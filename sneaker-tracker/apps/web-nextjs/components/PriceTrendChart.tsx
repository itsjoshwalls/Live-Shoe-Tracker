import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface PricePoint {
  date: string; // ISO date
  stockx?: number;
  goat?: number;
  flightclub?: number;
  stadiumgoods?: number;
}

interface Props {
  points: PricePoint[];
  title?: string;
}

const PriceTrendChart: React.FC<Props> = ({ points, title }) => {
  const labels = points.map(p => new Date(p.date).toLocaleDateString());
  const data = {
    labels,
    datasets: [
      {
        label: 'StockX',
        data: points.map(p => p.stockx ?? null),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52,211,153,0.3)',
        tension: 0.25
      },
      {
        label: 'GOAT',
        data: points.map(p => p.goat ?? null),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.3)',
        tension: 0.25
      },
      {
        label: 'Flight Club',
        data: points.map(p => p.flightclub ?? null),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.3)',
        tension: 0.25
      },
      {
        label: 'Stadium Goods',
        data: points.map(p => p.stadiumgoods ?? null),
        borderColor: '#f87171',
        backgroundColor: 'rgba(248,113,113,0.3)',
        tension: 0.25
      }
    ]
  };
  const options: any = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: !!title, text: title }
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { title: { display: true, text: 'USD' } },
      x: { title: { display: true, text: 'Date' } }
    }
  };
  return <Line data={data} options={options} />;
};

export default PriceTrendChart;