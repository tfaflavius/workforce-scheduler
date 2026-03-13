import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Grow,
  alpha,
  useTheme,
} from '@mui/material';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  delay?: number;
  urgent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = React.memo(({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  onClick,
  delay = 0,
  urgent,
}) => {
  const theme = useTheme();

  return (
    <Grow in={true} timeout={500 + delay}>
      <Card
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          ...(urgent
            ? { border: `2px solid ${color}` }
            : { borderLeft: `4px solid ${color}` }
          ),
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          '&:hover': onClick
            ? {
                transform: 'translateY(-4px)',
                boxShadow:
                  theme.palette.mode === 'light'
                    ? `0 8px 24px ${alpha(color, 0.2)}, 0 0 0 1px ${alpha(color, 0.1)}`
                    : `0 8px 24px ${alpha(color, 0.35)}, 0 0 0 1px ${alpha(color, 0.2)}`,
              }
            : {},
          '&:active': onClick
            ? {
                transform: 'scale(0.98)',
              }
            : {},
          '&::before': urgent
            ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: color,
              }
            : {},
        }}
        onClick={onClick}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: alpha(color, 0.04),
          }}
        />
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, position: 'relative' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={{ xs: 1, sm: 1.5, md: 2 }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' },
                  letterSpacing: '0.5px',
                  lineHeight: 1.3,
                  display: 'block',
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  color,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  my: 0.5,
                  fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2.5rem' },
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.875rem' },
                    mt: 0.5,
                    lineHeight: 1.3,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: { xs: 1, sm: 1.5, md: 2 },
                borderRadius: '50%',
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 14px ${alpha(color, 0.25)}`,
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );
});

export default StatCard;
