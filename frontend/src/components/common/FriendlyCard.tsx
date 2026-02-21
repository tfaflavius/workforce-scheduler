import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Box,
  Typography,
  alpha,
  useTheme,
  Grow,
  Skeleton,
  keyframes,
} from '@mui/material';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient';

export interface FriendlyCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerColor?: string;
  variant?: CardVariant;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  delay?: number;
  highlighted?: boolean;
  highlightColor?: string;
  badge?: React.ReactNode;
  noPadding?: boolean;
}

export const FriendlyCard: React.FC<FriendlyCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  headerColor,
  variant = 'default',
  actions,
  headerActions,
  onClick,
  loading = false,
  delay = 0,
  highlighted = false,
  highlightColor,
  badge,
  noPadding = false,
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          boxShadow: theme.palette.mode === 'light'
            ? '0 8px 32px rgba(0,0,0,0.12)'
            : '0 8px 32px rgba(0,0,0,0.4)',
          border: 'none',
        };
      case 'outlined':
        return {
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        };
      case 'gradient':
        return {
          background: theme.palette.mode === 'light'
            ? `linear-gradient(135deg, ${alpha(headerColor || theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 100%)`
            : `linear-gradient(135deg, ${alpha(headerColor || theme.palette.primary.main, 0.1)} 0%, ${theme.palette.background.paper} 100%)`,
          border: 'none',
        };
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {title && (
          <CardHeader
            avatar={<Skeleton variant="circular" width={40} height={40} />}
            title={<Skeleton variant="text" width="60%" />}
            subheader={<Skeleton variant="text" width="40%" />}
          />
        )}
        <CardContent>
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
          <Skeleton variant="text" sx={{ mt: 2 }} />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Grow in timeout={400 + delay}>
      <Card
        onClick={onClick}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...getVariantStyles(),
          ...(highlighted && {
            borderLeft: `4px solid ${highlightColor || theme.palette.primary.main}`,
          }),
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: theme.palette.mode === 'light'
              ? `0 12px 40px ${alpha(headerColor || theme.palette.primary.main, 0.2)}`
              : `0 12px 40px rgba(0,0,0,0.5)`,
          } : {},
          '&:active': onClick ? {
            transform: 'scale(0.98)',
          } : {},
        }}
      >
        {/* Badge */}
        {badge && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
            }}
          >
            {badge}
          </Box>
        )}

        {/* Header with gradient option */}
        {(title || icon) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 2.5,
              ...(headerColor && {
                background: `linear-gradient(135deg, ${headerColor} 0%, ${alpha(headerColor, 0.8)} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.1)}, transparent)`,
                  backgroundSize: '200% 100%',
                  animation: `${shimmer} 3s ease-in-out infinite`,
                },
              }),
            }}
          >
            {icon && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: headerColor ? alpha('#fff', 0.2) : alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: headerColor ? 'inherit' : theme.palette.primary.main,
                  animation: `${float} 3s ease-in-out infinite`,
                  '& > svg': {
                    fontSize: { xs: 20, sm: 24 },
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.15rem' },
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    opacity: headerColor ? 0.9 : 0.7,
                    mt: 0.25,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            {headerActions}
          </Box>
        )}

        {/* Content */}
        <CardContent
          sx={{
            p: noPadding ? 0 : { xs: 2, sm: 3 },
            '&:last-child': {
              pb: noPadding ? 0 : { xs: 2, sm: 3 },
            },
          }}
        >
          {children}
        </CardContent>

        {/* Actions */}
        {actions && (
          <CardActions
            sx={{
              px: 3,
              py: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: alpha(theme.palette.background.default, 0.5),
              gap: 1,
            }}
          >
            {actions}
          </CardActions>
        )}
      </Card>
    </Grow>
  );
};

export default FriendlyCard;
