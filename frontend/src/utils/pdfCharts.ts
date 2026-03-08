/**
 * PDF Chart Drawing Utilities
 *
 * Reusable drawing functions for jsPDF that create charts, stat cards,
 * progress bars, and other visual elements in PDF reports.
 *
 * Each function accepts a jsPDF doc instance, draws at specified coordinates,
 * and returns the Y position after the drawn element for flow layout.
 */
import jsPDF from 'jspdf';

// ─── Types ───────────────────────────────────────────────────────────

export type RGB = [number, number, number];

export interface StatCardConfig {
  label: string;
  value: string | number;
  color: RGB;
}

export interface BarItem {
  label: string;
  value: number;
  color: RGB;
}

export interface DistributionSegment {
  label: string;
  value: number;
  color: RGB;
}

export interface ComparisonPair {
  label: string;
  value1: number;
  value2: number;
  color1: RGB;
  color2: RGB;
}

export type CheckPageBreakFn = (yPosition: number, needed?: number) => number;

// ─── Color Helper ────────────────────────────────────────────────────

/**
 * Lighten an RGB color by mixing with white.
 * factor 0 = original, factor 1 = white
 */
export function lightenColor(color: RGB, factor: number): RGB {
  return [
    Math.min(255, Math.round(color[0] + (255 - color[0]) * factor)),
    Math.min(255, Math.round(color[1] + (255 - color[1]) * factor)),
    Math.min(255, Math.round(color[2] + (255 - color[2]) * factor)),
  ];
}

/**
 * Darken an RGB color by mixing with black.
 * factor 0 = original, factor 1 = black
 */
export function darkenColor(color: RGB, factor: number): RGB {
  return [
    Math.max(0, Math.round(color[0] * (1 - factor))),
    Math.max(0, Math.round(color[1] * (1 - factor))),
    Math.max(0, Math.round(color[2] * (1 - factor))),
  ];
}

// ─── Reset Helper (internal) ─────────────────────────────────────────

function resetDocStyle(doc: jsPDF) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
}

// ─── 1. Section Header ──────────────────────────────────────────────

/**
 * Draws a colored band with white title text.
 * Returns Y position after header.
 */
export function drawSectionHeader(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  pageWidth: number,
  color: RGB,
  sectionNumber?: number,
): number {
  const headerHeight = 9;
  const usableWidth = pageWidth - 2 * x;

  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, usableWidth, headerHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);

  const label = sectionNumber != null ? `${sectionNumber}. ${title}` : title;
  doc.text(label, x + 5, y + 6.2);

  resetDocStyle(doc);
  return y + headerHeight + 4;
}

// ─── 2. Stat Cards ──────────────────────────────────────────────────

/**
 * Draws a row of colored KPI cards with large values and small labels.
 * Supports 1-4 cards per row. Returns Y position after cards.
 * Auto-sizes value font to fit card width. Uses dark text for readability.
 */
export function drawStatCards(
  doc: jsPDF,
  cards: StatCardConfig[],
  x: number,
  y: number,
  pageWidth: number,
  checkPageBreak?: CheckPageBreakFn,
): number {
  if (cards.length === 0) return y;

  const cardHeight = 22;
  const totalNeeded = cardHeight + 4;

  if (checkPageBreak) {
    y = checkPageBreak(y, totalNeeded);
  }

  const usableWidth = pageWidth - 2 * x;
  const gap = 4;
  const count = Math.min(cards.length, 4);
  const cardWidth = (usableWidth - gap * (count - 1)) / count;

  cards.slice(0, 4).forEach((card, i) => {
    const cx = x + i * (cardWidth + gap);
    const bg = lightenColor(card.color, 0.9);

    // Card background
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 2.5, 2.5, 'F');

    // Left accent stripe
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(cx, y, 3, cardHeight, 2.5, 2.5, 'F');
    // Cover right side of the accent's rounded corners
    doc.rect(cx + 1.5, y, 2, cardHeight, 'F');

    // Value (large bold) — auto-size to fit card
    const valueStr = String(card.value);
    const maxValueWidth = cardWidth - 8; // padding on both sides
    let valueFontSize = 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(valueFontSize);
    // Reduce font size until text fits or minimum reached
    while (doc.getTextWidth(valueStr) > maxValueWidth && valueFontSize > 8) {
      valueFontSize -= 1;
      doc.setFontSize(valueFontSize);
    }
    // Truncate with ellipsis if still too wide at minimum font
    let displayValue = valueStr;
    if (doc.getTextWidth(displayValue) > maxValueWidth) {
      while (doc.getTextWidth(displayValue + '…') > maxValueWidth && displayValue.length > 3) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += '…';
    }
    // Use dark text color for readability (darken the accent color)
    const darkValue = darkenColor(card.color, 0.3);
    doc.setTextColor(darkValue[0], darkValue[1], darkValue[2]);
    doc.text(displayValue, cx + cardWidth / 2, y + 10, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    // Truncate label if too long
    let labelText = card.label;
    const maxLabelWidth = cardWidth - 8;
    if (doc.getTextWidth(labelText) > maxLabelWidth) {
      while (doc.getTextWidth(labelText + '…') > maxLabelWidth && labelText.length > 3) {
        labelText = labelText.slice(0, -1);
      }
      labelText += '…';
    }
    doc.text(labelText, cx + cardWidth / 2, y + 16.5, { align: 'center' });
  });

  resetDocStyle(doc);
  return y + totalNeeded;
}

// ─── 3. Horizontal Bar Chart ────────────────────────────────────────

/**
 * Draws horizontal bars with labels on the left and values on the right.
 * Bar widths are proportional to the maximum value.
 */
export function drawHorizontalBarChart(
  doc: jsPDF,
  items: BarItem[],
  x: number,
  y: number,
  width: number,
  options?: {
    barHeight?: number;
    gap?: number;
    showValues?: boolean;
    maxLabelWidth?: number;
    title?: string;
  },
  checkPageBreak?: CheckPageBreakFn,
): number {
  const barHeight = options?.barHeight ?? 7;
  const gap = options?.gap ?? 2.5;
  const showValues = options?.showValues ?? true;
  const maxLabelWidth = options?.maxLabelWidth ?? 45;
  const title = options?.title;

  const totalHeight = (barHeight + gap) * items.length + (title ? 10 : 0) + 4;
  if (checkPageBreak) {
    y = checkPageBreak(y, totalHeight);
  }

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(title, x, y + 4);
    y += 8;
  }

  const maxValue = Math.max(...items.map(i => i.value), 1);
  const barAreaX = x + maxLabelWidth + 3;
  const barAreaWidth = width - maxLabelWidth - 3 - (showValues ? 20 : 0);

  items.forEach((item, i) => {
    const barY = y + i * (barHeight + gap);
    const barWidth = Math.max(1, (item.value / maxValue) * barAreaWidth);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    let label = item.label;
    if (doc.getTextWidth(label) > maxLabelWidth) {
      while (doc.getTextWidth(label + '…') > maxLabelWidth && label.length > 3) {
        label = label.slice(0, -1);
      }
      label += '…';
    }
    doc.text(label, x, barY + barHeight - 1.5);

    // Bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(barAreaX, barY, barWidth, barHeight, 1.5, 1.5, 'F');

    // Value text
    if (showValues) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(String(item.value), barAreaX + barWidth + 2, barY + barHeight - 1.5);
    }
  });

  resetDocStyle(doc);
  return y + items.length * (barHeight + gap) + 4;
}

// ─── 4. Vertical Bar Chart ──────────────────────────────────────────

/**
 * Draws vertical columns from a baseline with labels below.
 */
export function drawVerticalBarChart(
  doc: jsPDF,
  items: BarItem[],
  x: number,
  y: number,
  width: number,
  height: number = 45,
  options?: {
    showValues?: boolean;
    title?: string;
  },
  checkPageBreak?: CheckPageBreakFn,
): number {
  const showValues = options?.showValues ?? true;
  const title = options?.title;
  const labelHeight = 12;
  const totalHeight = height + labelHeight + (title ? 10 : 0) + 6;

  if (checkPageBreak) {
    y = checkPageBreak(y, totalHeight);
  }

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(title, x, y + 4);
    y += 8;
  }

  const maxValue = Math.max(...items.map(i => i.value), 1);
  const colGap = 3;
  const colWidth = Math.min(18, (width - colGap * (items.length - 1)) / items.length);
  const chartLeft = x + (width - (colWidth * items.length + colGap * (items.length - 1))) / 2;
  const baseline = y + height;

  // Draw baseline
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(x, baseline, x + width, baseline);

  items.forEach((item, i) => {
    const colX = chartLeft + i * (colWidth + colGap);
    const colHeight = Math.max(1, (item.value / maxValue) * (height - 8));

    // Column
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(colX, baseline - colHeight, colWidth, colHeight, 1, 1, 'F');

    // Value above column
    if (showValues) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(String(item.value), colX + colWidth / 2, baseline - colHeight - 2, { align: 'center' });
    }

    // Label below
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    let label = item.label;
    if (doc.getTextWidth(label) > colWidth + 2) {
      while (doc.getTextWidth(label + '…') > colWidth + 2 && label.length > 3) {
        label = label.slice(0, -1);
      }
      label += '…';
    }
    doc.text(label, colX + colWidth / 2, baseline + 5, { align: 'center' });
  });

  resetDocStyle(doc);
  return baseline + labelHeight + 4;
}

// ─── 5. Progress Bar ────────────────────────────────────────────────

/**
 * Draws a percentage progress bar with label and values.
 */
export function drawProgressBar(
  doc: jsPDF,
  label: string,
  current: number,
  total: number,
  x: number,
  y: number,
  width: number,
  fillColor: RGB,
  options?: {
    height?: number;
    showPercentage?: boolean;
    showValues?: boolean;
    bgColor?: RGB;
  },
  checkPageBreak?: CheckPageBreakFn,
): number {
  const barHeight = options?.height ?? 8;
  const showPercentage = options?.showPercentage ?? true;
  const showValues = options?.showValues ?? true;
  const bgColor: RGB = options?.bgColor ?? [230, 230, 230];
  const totalNeeded = barHeight + 14;

  if (checkPageBreak) {
    y = checkPageBreak(y, totalNeeded);
  }

  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const fillWidth = (percentage / 100) * width;

  // Label above
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(label, x, y + 4);

  if (showValues) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const valText = `${typeof current === 'number' ? current.toLocaleString('ro-RO') : current} / ${typeof total === 'number' ? total.toLocaleString('ro-RO') : total}`;
    doc.text(valText, x + width, y + 4, { align: 'right' });
  }

  const barY = y + 7;

  // Background bar
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.roundedRect(x, barY, width, barHeight, 2, 2, 'F');

  // Fill bar
  if (fillWidth > 0) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    if (fillWidth < width - 1) {
      // Partial fill - only round left corners
      doc.roundedRect(x, barY, fillWidth, barHeight, 2, 2, 'F');
    } else {
      doc.roundedRect(x, barY, width, barHeight, 2, 2, 'F');
    }
  }

  // Percentage text on bar
  if (showPercentage) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const pctText = `${percentage.toFixed(1)}%`;
    if (fillWidth > 22) {
      doc.setTextColor(255, 255, 255);
      doc.text(pctText, x + fillWidth / 2, barY + barHeight - 2, { align: 'center' });
    } else {
      doc.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.text(pctText, x + fillWidth + 3, barY + barHeight - 2);
    }
  }

  resetDocStyle(doc);
  return barY + barHeight + 4;
}

// ─── 6. Status Distribution Bar ─────────────────────────────────────

/**
 * Draws a stacked horizontal bar showing proportional segments with legend.
 */
export function drawStatusDistributionBar(
  doc: jsPDF,
  segments: DistributionSegment[],
  x: number,
  y: number,
  width: number,
  options?: {
    height?: number;
    title?: string;
    showLegend?: boolean;
    showCounts?: boolean;
  },
  checkPageBreak?: CheckPageBreakFn,
): number {
  const barHeight = options?.height ?? 9;
  const title = options?.title;
  const showLegend = options?.showLegend ?? true;
  const showCounts = options?.showCounts ?? true;
  const totalNeeded = barHeight + (title ? 10 : 0) + (showLegend ? 14 : 0) + 6;

  if (checkPageBreak) {
    y = checkPageBreak(y, totalNeeded);
  }

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(title, x, y + 4);
    y += 8;
  }

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    resetDocStyle(doc);
    return y + 4;
  }

  // Draw stacked segments
  let segX = x;
  segments.forEach((seg, i) => {
    const segWidth = (seg.value / total) * width;
    if (segWidth > 0) {
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      if (i === 0 && segments.length === 1) {
        doc.roundedRect(segX, y, segWidth, barHeight, 2, 2, 'F');
      } else if (i === 0) {
        // First segment: round left corners only
        doc.roundedRect(segX, y, segWidth + 2, barHeight, 2, 2, 'F');
        doc.rect(segX + segWidth - 1, y, 3, barHeight, 'F');
      } else if (i === segments.length - 1) {
        // Last segment: round right corners only
        doc.roundedRect(segX - 2, y, segWidth + 2, barHeight, 2, 2, 'F');
        doc.rect(segX - 2, y, 3, barHeight, 'F');
      } else {
        doc.rect(segX, y, segWidth, barHeight, 'F');
      }

      // Count text on segment (if wide enough)
      if (segWidth > 15 && showCounts) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(String(seg.value), segX + segWidth / 2, y + barHeight - 2.2, { align: 'center' });
      }

      segX += segWidth;
    }
  });

  let legendY = y + barHeight + 4;

  // Legend row
  if (showLegend) {
    let legendX = x;
    doc.setFontSize(8);
    segments.forEach((seg) => {
      // Color box
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.rect(legendX, legendY, 3.5, 3.5, 'F');

      // Label + count
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const legendLabel = showCounts ? `${seg.label}: ${seg.value}` : seg.label;
      doc.text(legendLabel, legendX + 5, legendY + 3);
      legendX += doc.getTextWidth(legendLabel) + 10;
    });
    legendY += 8;
  }

  resetDocStyle(doc);
  return legendY + 2;
}

// ─── 7. Comparison Bars ─────────────────────────────────────────────

/**
 * Draws paired comparison bars (e.g., income vs expenses).
 */
export function drawComparisonBars(
  doc: jsPDF,
  pairs: ComparisonPair[],
  legend: [string, string],
  x: number,
  y: number,
  width: number,
  options?: {
    barHeight?: number;
    gap?: number;
    title?: string;
  },
  checkPageBreak?: CheckPageBreakFn,
): number {
  const barHeight = options?.barHeight ?? 5;
  const gap = options?.gap ?? 6;
  const title = options?.title;
  const pairHeight = barHeight * 2 + 1;
  const totalHeight = (pairHeight + gap) * pairs.length + (title ? 10 : 0) + 14;

  if (checkPageBreak) {
    y = checkPageBreak(y, totalHeight);
  }

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(title, x, y + 4);
    y += 8;
  }

  // Legend
  const firstColor = pairs[0]?.color1 ?? [76, 175, 80] as RGB;
  const secondColor = pairs[0]?.color2 ?? [244, 67, 54] as RGB;
  doc.setFillColor(firstColor[0], firstColor[1], firstColor[2]);
  doc.rect(x, y, 3.5, 3.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(legend[0], x + 5, y + 3);
  const leg1Width = doc.getTextWidth(legend[0]) + 10;
  doc.setFillColor(secondColor[0], secondColor[1], secondColor[2]);
  doc.rect(x + leg1Width, y, 3.5, 3.5, 'F');
  doc.text(legend[1], x + leg1Width + 5, y + 3);
  y += 8;

  const labelWidth = 40;
  const barAreaX = x + labelWidth + 3;
  const barAreaWidth = width - labelWidth - 3 - 25;
  const maxValue = Math.max(...pairs.flatMap(p => [p.value1, p.value2]), 1);

  pairs.forEach((pair, i) => {
    const pairY = y + i * (pairHeight + gap);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    let label = pair.label;
    if (doc.getTextWidth(label) > labelWidth) {
      while (doc.getTextWidth(label + '…') > labelWidth && label.length > 3) {
        label = label.slice(0, -1);
      }
      label += '…';
    }
    doc.text(label, x, pairY + barHeight);

    // Bar 1
    const bar1Width = Math.max(1, (pair.value1 / maxValue) * barAreaWidth);
    doc.setFillColor(pair.color1[0], pair.color1[1], pair.color1[2]);
    doc.roundedRect(barAreaX, pairY, bar1Width, barHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(pair.color1[0], pair.color1[1], pair.color1[2]);
    doc.text(pair.value1.toLocaleString('ro-RO'), barAreaX + bar1Width + 2, pairY + barHeight - 1);

    // Bar 2
    const bar2Width = Math.max(1, (pair.value2 / maxValue) * barAreaWidth);
    doc.setFillColor(pair.color2[0], pair.color2[1], pair.color2[2]);
    doc.roundedRect(barAreaX, pairY + barHeight + 1, bar2Width, barHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(pair.color2[0], pair.color2[1], pair.color2[2]);
    doc.text(pair.value2.toLocaleString('ro-RO'), barAreaX + bar2Width + 2, pairY + pairHeight - 1);
  });

  resetDocStyle(doc);
  return y + pairs.length * (pairHeight + gap) + 4;
}

// ─── 8. Colored Divider ─────────────────────────────────────────────

/**
 * Draws a thin colored separator line.
 */
export function drawColoredDivider(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  color: RGB = [200, 200, 200],
  thickness: number = 0.4,
): number {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(thickness);
  doc.line(x, y, x + width, y);
  resetDocStyle(doc);
  return y + 3;
}
