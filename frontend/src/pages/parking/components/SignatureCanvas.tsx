import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, useTheme } from '@mui/material';

interface SignatureCanvasProps {
  width?: number;
  height?: number;
}

export interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ width = 400, height = 150 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const theme = useTheme();
    const [canvasSize, setCanvasSize] = useState({ w: width, h: height });

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas) return '';
        return canvas.toDataURL('image/png');
      },
      isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true;
        const ctx = canvas.getContext('2d');
        if (!ctx) return true;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Check if all pixels are white
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (imageData.data[i] !== 255 || imageData.data[i + 1] !== 255 || imageData.data[i + 2] !== 255) {
            return false;
          }
        }
        return true;
      },
    }));

    // Responsive: observe container width and adjust canvas size
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateSize = () => {
        const containerWidth = container.clientWidth;
        // Use container width but cap at provided width prop
        const effectiveWidth = Math.min(containerWidth, width);
        // Maintain aspect ratio from original width/height
        const effectiveHeight = Math.round((effectiveWidth / width) * height);
        setCanvasSize({ w: effectiveWidth, h: effectiveHeight });
      };

      // Initial measurement
      updateSize();

      const observer = new ResizeObserver(updateSize);
      observer.observe(container);
      return () => observer.disconnect();
    }, [width, height]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas internal resolution to match display size (1:1 pixel mapping)
      canvas.width = canvasSize.w;
      canvas.height = canvasSize.h;

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set drawing style
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, [canvasSize]);

    const getPosition = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      isDrawing.current = true;
      const pos = getPosition(e.nativeEvent);
      lastPos.current = pos;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pos = getPosition(e.nativeEvent);

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastPos.current = pos;
    };

    const stopDrawing = () => {
      isDrawing.current = false;
    };

    return (
      <Box
        ref={containerRef}
        sx={{
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          width: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: canvasSize.h,
            cursor: 'crosshair',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Box>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
