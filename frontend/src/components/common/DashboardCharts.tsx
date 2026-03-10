import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { DonutLarge as ChartIcon } from '@mui/icons-material';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface StatusDistributionProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

export const StatusDistributionChart: React.FC<StatusDistributionProps> = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => ({
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderColor: data.map((d) => alpha(d.color, 0.8)),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 11, family: theme.typography.fontFamily as string },
          color: theme.palette.text.secondary,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
      },
    },
  }), [theme]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) return null;

  return (
    <Fade in={true} timeout={800}>
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ChartIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}
            >
              {title}
            </Typography>
          </Stack>
          <Box sx={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={chartData} options={options} />
            {/* Center total */}
            <Box
              sx={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {total}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Total
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
};

interface WeeklyOverviewProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

export const WeeklyOverviewChart: React.FC<WeeklyOverviewProps> = ({ data, title }) => {
  const theme = useTheme();

  const chartData = useMemo(() => ({
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => alpha(d.color, 0.7)),
        borderColor: data.map((d) => d.color),
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { size: 10 },
          color: theme.palette.text.secondary,
        },
        grid: {
          color: alpha(theme.palette.divider, 0.5),
        },
      },
      x: {
        ticks: {
          font: { size: 10 },
          color: theme.palette.text.secondary,
        },
        grid: { display: false },
      },
    },
  }), [theme]);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <Fade in={true} timeout={1000}>
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <ChartIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}
            >
              {title}
            </Typography>
          </Stack>
          <Box sx={{ height: 180 }}>
            <Bar data={chartData} options={options} />
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
};
