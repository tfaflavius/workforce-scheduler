import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  BarChart as BarIcon,
  ShowChart as LineIcon,
  PieChart as PieIcon,
  DonutLarge as DoughnutIcon,
  RadioButtonUnchecked as PolarIcon,
  Radar as RadarIcon,
} from '@mui/icons-material';
import { Bar, Line, Pie, Doughnut, PolarArea, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'polar' | 'radar';

export interface ChartCardSeries {
  label: string;
  data: number[];
  /** Optional custom color for the series. */
  color?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Labels for the X axis / segment names */
  labels: string[];
  /** Series — for single-series charts (pie/polar/etc), only the first series is used */
  series: ChartCardSeries[];
  /** Default chart type */
  defaultType?: ChartType;
  /** Allowed types — defaults to all */
  allowedTypes?: ChartType[];
  /** Optional fixed height */
  height?: number | string;
}

const TYPE_META: Record<ChartType, { label: string; icon: React.ReactNode }> = {
  bar: { label: 'Coloane', icon: <BarIcon sx={{ fontSize: 18 }} /> },
  line: { label: 'Linie', icon: <LineIcon sx={{ fontSize: 18 }} /> },
  pie: { label: 'Cerc', icon: <PieIcon sx={{ fontSize: 18 }} /> },
  doughnut: { label: 'Sfera', icon: <DoughnutIcon sx={{ fontSize: 18 }} /> },
  polar: { label: 'Polar', icon: <PolarIcon sx={{ fontSize: 18 }} /> },
  radar: { label: 'Radar', icon: <RadarIcon sx={{ fontSize: 18 }} /> },
};

const DEFAULT_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#a855f7', // violet
  '#22c55e', // green-500
];

/**
 * Reusable chart card with a type-switcher toolbar in the header.
 * Supports Bar, Line, Pie, Doughnut, PolarArea, Radar — using Chart.js types
 * already shipped with the app (chart.js + react-chartjs-2).
 */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon,
  labels,
  series,
  defaultType = 'bar',
  allowedTypes = ['bar', 'line', 'pie', 'doughnut', 'polar', 'radar'],
  height = 320,
}) => {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>(defaultType);

  // Build datasets in a way that works for both Cartesian (bar/line) and
  // Radial (pie/doughnut/polar/radar) chart types.
  const data = useMemo(() => {
    const isRadial = chartType === 'pie' || chartType === 'doughnut' || chartType === 'polar';
    const isRadar = chartType === 'radar';

    if (isRadial) {
      // Single-series radial chart — use first series, color each segment differently
      const first = series[0];
      if (!first) return { labels, datasets: [] };
      const backgroundColors = labels.map((_, i) =>
        alpha(DEFAULT_PALETTE[i % DEFAULT_PALETTE.length], chartType === 'polar' ? 0.7 : 0.85),
      );
      return {
        labels,
        datasets: [
          {
            label: first.label,
            data: first.data,
            backgroundColor: backgroundColors,
            borderColor: theme.palette.background.paper,
            borderWidth: 2,
          },
        ],
      };
    }

    if (isRadar) {
      return {
        labels,
        datasets: series.map((s, i) => {
          const c = s.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
          return {
            label: s.label,
            data: s.data,
            backgroundColor: alpha(c, 0.2),
            borderColor: c,
            borderWidth: 2,
            pointBackgroundColor: c,
            pointRadius: 3,
          };
        }),
      };
    }

    // Bar / Line
    return {
      labels,
      datasets: series.map((s, i) => {
        const c = s.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
        if (chartType === 'line') {
          return {
            label: s.label,
            data: s.data,
            borderColor: c,
            backgroundColor: alpha(c, 0.15),
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: c,
          };
        }
        // bar
        return {
          label: s.label,
          data: s.data,
          backgroundColor: alpha(c, 0.78),
          borderColor: c,
          borderWidth: 1,
          borderRadius: 8,
          // Cylinder-ish look via rounded corners + thinner bars
          maxBarThickness: 36,
        };
      }),
    };
  }, [chartType, labels, series, theme.palette.background.paper]);

  const baseOptions = useMemo(() => {
    const isRadial = chartType === 'pie' || chartType === 'doughnut' || chartType === 'polar';
    const isRadar = chartType === 'radar';

    const common: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
        },
        tooltip: {
          padding: 8,
          titleFont: { size: 12 },
          bodyFont: { size: 11 },
        },
      },
    };

    if (isRadial) return common;

    if (isRadar) {
      common.scales = {
        r: {
          beginAtZero: true,
          ticks: { display: false },
          pointLabels: { font: { size: 10 } },
        },
      };
      return common;
    }

    common.scales = {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
    };
    common.interaction = { mode: 'index' as const, intersect: false };
    return common;
  }, [chartType]);

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return <Line data={data as any} options={baseOptions} />;
      case 'pie':
        return <Pie data={data as any} options={baseOptions} />;
      case 'doughnut':
        return <Doughnut data={data as any} options={baseOptions} />;
      case 'polar':
        return <PolarArea data={data as any} options={baseOptions} />;
      case 'radar':
        return <Radar data={data as any} options={baseOptions} />;
      case 'bar':
      default:
        return <Bar data={data as any} options={baseOptions} />;
    }
  };

  // Hide types that don't make sense for the data (pie/polar with multi-series
  // would just show the first series, which we already handle, but radar
  // genuinely needs more than 2 labels to look reasonable)
  const visibleTypes = allowedTypes.filter((t) => {
    if (t === 'radar' && labels.length < 3) return false;
    return true;
  });

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            {icon}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, lineHeight: 1.2 }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>

          <ToggleButtonGroup
            size="small"
            value={chartType}
            exclusive
            onChange={(_, v) => v && setChartType(v as ChartType)}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                px: 1,
                py: 0.5,
                textTransform: 'none',
                fontSize: '0.7rem',
                lineHeight: 1.2,
              },
            }}
          >
            {visibleTypes.map((t) => (
              <ToggleButton key={t} value={t} aria-label={TYPE_META[t].label}>
                <Tooltip title={TYPE_META[t].label} arrow>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {TYPE_META[t].icon}
                  </Stack>
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ position: 'relative', height }}>{renderChart()}</Box>
      </CardContent>
    </Card>
  );
};

export default React.memo(ChartCard);
