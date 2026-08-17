import { Injectable, inject } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { ThemeService } from './theme.service';
import { CurrencyService } from './currency.service';

export interface CategoryChartItem {
  name: string;
  amount: number;
  color: string;
}

export interface TrendChartItem {
  month: string;
  income: number;
  expenses: number;
}

export interface DailySpendingItem {
  day: string;
  amount: number;
}

interface ChartPalette {
  text: string;
  textMuted: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  surface: string;
}

@Injectable({ providedIn: 'root' })
export class ChartBuilderService {
  private readonly incomeColor = '#22c55e';
  private readonly expenseColor = '#ef4444';
  private readonly savingsColor = '#3b82f6';
  private readonly netColor = '#14b8a6';
  private currencyService = inject(CurrencyService);

  constructor(private themeService: ThemeService) {}

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }

  formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return `${value}`;
  }

  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  }

  chartHeight(defaultDesktop = 320, defaultMobile = 260): number {
    return this.isMobile() ? defaultMobile : defaultDesktop;
  }

  private palette(): ChartPalette {
    const isDark = this.themeService.theme() === 'dark';
    return {
      text: isDark ? '#f1f5f9' : '#0f172a',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      grid: isDark ? '#334155' : '#e2e8f0',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f1f5f9' : '#0f172a',
      surface: isDark ? '#1e293b' : '#ffffff',
    };
  }

  private baseChart(type: ApexOptions['chart'] extends infer C ? C extends { type?: infer T } ? T : string : string, height?: number): ApexOptions['chart'] {
    return {
      type,
      height: height ?? this.chartHeight(),
      fontFamily: 'Inter, inherit',
      background: 'transparent',
      toolbar: { show: false, autoSelected: 'pan' },
      animations: { enabled: true, easing: 'easeinout', speed: 700 },
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
      zoom: { enabled: false },
    } as ApexOptions['chart'];
  }

  private tooltipOptions(): ApexOptions['tooltip'] {
    const p = this.palette();
    return {
      theme: this.themeService.theme(),
      style: { fontSize: '12px', fontFamily: 'Inter, inherit' },
      x: { show: true },
      y: { formatter: (val) => this.formatCurrency(val) },
      marker: { show: true },
      fillSeriesColor: false,
      custom: undefined,
    };
  }

  private axisLabels(): ApexOptions['xaxis'] {
    const p = this.palette();
    return {
      labels: {
        style: { colors: p.textMuted, fontSize: '11px', fontFamily: 'Inter, inherit' },
        trim: true,
        rotate: this.isMobile() ? -45 : 0,
        rotateAlways: this.isMobile(),
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
  }

  private yAxisLabels(): ApexOptions['yaxis'] {
    const p = this.palette();
    return {
      labels: {
        style: { colors: p.textMuted, fontSize: '11px', fontFamily: 'Inter, inherit' },
        formatter: (val) => this.formatCompact(val),
      },
    };
  }

  private gridOptions(): ApexOptions['grid'] {
    const p = this.palette();
    return {
      borderColor: p.grid,
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
    };
  }

  private legendOptions(): ApexOptions['legend'] {
    const p = this.palette();
    return {
      fontSize: '12px',
      fontFamily: 'Inter, inherit',
      labels: { colors: p.textMuted },
      markers: { size: 6, strokeWidth: 0, offsetX: -4 },
      itemMargin: { horizontal: 10, vertical: 4 },
    };
  }

  expenseDonutChart(categories: CategoryChartItem[]): ApexOptions | null {
    if (categories.length === 0) return null;

    const p = this.palette();
    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    const mobile = this.isMobile();

    return {
      chart: this.baseChart('donut', this.chartHeight(300, 280)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: categories.map(c => c.amount),
      labels: categories.map(c => c.name),
      colors: categories.map(c => c.color),
      legend: {
        ...this.legendOptions(),
        position: mobile ? 'bottom' : 'right',
        formatter: (name, opts) => {
          const val = (opts?.w?.globals?.series?.[opts?.seriesIndex ?? 0] ?? 0) as number;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return mobile
            ? `${name} · ${pct}%`
            : `${name} — ${pct}% (${this.formatCompact(val)})`;
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: mobile ? '72%' : '68%',
            labels: {
              show: true,
              name: { show: true, color: p.textMuted, fontSize: '13px' },
              value: {
                show: true,
                color: p.text,
                fontSize: mobile ? '16px' : '20px',
                fontWeight: 700,
                formatter: (val) => this.formatCompact(Number(val)),
              },
              total: {
                show: true,
                label: 'Total Expenses',
                color: p.textMuted,
                fontSize: '12px',
                formatter: () => this.formatCompact(total),
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      stroke: { width: 3, colors: [p.surface] },
      tooltip: {
        ...this.tooltipOptions(),
        y: {
          formatter: (val, opts) => {
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return `${this.formatCurrency(val)} (${pct}%)`;
          },
        },
      },
      noData: { text: 'No expenses this month', style: { color: p.textMuted } },
    };
  }

  cashFlowBarChart(income: number, expenses: number): ApexOptions | null {
    if (income === 0 && expenses === 0) return null;

    const p = this.palette();
    const mobile = this.isMobile();

    return {
      chart: this.baseChart('bar', this.chartHeight(260, 220)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [{ name: 'Amount', data: [income, expenses] }],
      colors: [this.incomeColor, this.expenseColor],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: mobile ? '45%' : '38%',
          distributed: true,
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => this.formatCompact(Number(val)),
        offsetY: -18,
        style: { fontSize: '11px', colors: [p.text], fontWeight: 600 },
      },
      xaxis: {
        ...this.axisLabels(),
        categories: ['Income', 'Expenses'],
      },
      yaxis: this.yAxisLabels(),
      grid: { ...this.gridOptions(), padding: { top: 20 } },
      legend: { show: false },
      tooltip: this.tooltipOptions(),
    };
  }

  dailySpendingChart(days: DailySpendingItem[]): ApexOptions | null {
    if (days.every(d => d.amount === 0)) return null;

    const p = this.palette();

    return {
      chart: this.baseChart('area', this.chartHeight(260, 220)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [{ name: 'Daily spending', data: days.map(d => d.amount) }],
      colors: [this.expenseColor],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.9,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: this.isMobile() ? 0 : 4,
        strokeWidth: 2,
        hover: { size: 6 },
      },
      xaxis: {
        ...this.axisLabels(),
        categories: days.map(d => d.day),
        tickAmount: this.isMobile() ? 6 : 10,
      },
      yaxis: this.yAxisLabels(),
      grid: this.gridOptions(),
      legend: { show: false },
      tooltip: this.tooltipOptions(),
    };
  }

  trendAreaChart(trend: TrendChartItem[]): ApexOptions | null {
    if (!trend.length || trend.every(t => t.income === 0 && t.expenses === 0)) return null;

    const p = this.palette();
    const netSeries = trend.map(t => t.income - t.expenses);

    return {
      chart: this.baseChart('area', this.chartHeight(340, 280)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [
        { name: 'Income', data: trend.map(t => t.income) },
        { name: 'Expenses', data: trend.map(t => t.expenses) },
        { name: 'Net savings', data: netSeries },
      ],
      colors: [this.incomeColor, this.expenseColor, this.netColor],
      stroke: { curve: 'smooth', width: [2.5, 2.5, 2], dashArray: [0, 0, 6] },
      fill: {
        type: ['gradient', 'gradient', 'solid'],
        gradient: {
          shadeIntensity: 0.8,
          opacityFrom: 0.35,
          opacityTo: 0.02,
          stops: [0, 90, 100],
        },
        opacity: [0.85, 0.85, 0],
      },
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        ...this.axisLabels(),
        categories: trend.map(t => t.month),
      },
      yaxis: this.yAxisLabels(),
      grid: this.gridOptions(),
      legend: {
        ...this.legendOptions(),
        position: this.isMobile() ? 'bottom' : 'top',
        horizontalAlign: this.isMobile() ? 'center' : 'right',
      },
      tooltip: this.tooltipOptions(),
    };
  }

  categoryBarChart(categories: CategoryChartItem[], horizontal = false): ApexOptions | null {
    if (categories.length === 0) return null;

    const p = this.palette();
    const useHorizontal = horizontal || this.isMobile();

    return {
      chart: this.baseChart('bar', this.chartHeight(useHorizontal ? 340 : 300, 300)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [{ name: 'Spending', data: categories.map(c => c.amount) }],
      colors: categories.map(c => c.color),
      plotOptions: {
        bar: {
          horizontal: useHorizontal,
          borderRadius: 6,
          distributed: true,
          barHeight: useHorizontal ? '70%' : undefined,
          columnWidth: useHorizontal ? undefined : '55%',
        },
      },
      dataLabels: {
        enabled: !this.isMobile(),
        formatter: (val) => this.formatCompact(Number(val)),
        style: { fontSize: '10px', colors: ['#fff'] },
      },
      xaxis: useHorizontal
        ? {
            categories: categories.map(c => c.name),
            labels: { style: { colors: p.textMuted, fontSize: '11px' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
          }
        : { ...this.axisLabels(), categories: categories.map(c => c.name) },
      yaxis: useHorizontal
        ? {
            labels: {
              style: { colors: p.textMuted, fontSize: '11px' },
              formatter: (val) => this.formatCompact(val),
            },
          }
        : this.yAxisLabels(),
      grid: this.gridOptions(),
      legend: { show: false },
      tooltip: this.tooltipOptions(),
    };
  }

  savingsGaugeChart(rate: number): ApexOptions {
    const p = this.palette();
    const clamped = Math.max(0, Math.min(rate, 100));
    const color = rate >= 20 ? this.incomeColor : rate >= 0 ? '#f59e0b' : this.expenseColor;

    return {
      chart: this.baseChart('radialBar', this.chartHeight(280, 240)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [clamped],
      colors: [color],
      plotOptions: {
        radialBar: {
          startAngle: -130,
          endAngle: 130,
          hollow: { size: '62%', background: 'transparent' },
          track: { background: p.grid, strokeWidth: '100%', margin: 8 },
          dataLabels: {
            name: {
              show: true,
              offsetY: 24,
              color: p.textMuted,
              fontSize: '13px',
              fontWeight: 500,
            },
            value: {
              show: true,
              fontSize: this.isMobile() ? '28px' : '34px',
              fontWeight: 700,
              color: p.text,
              offsetY: -8,
              formatter: (val) => `${Math.round(Number(val))}%`,
            },
          },
        },
      },
      labels: ['Savings rate'],
      stroke: { lineCap: 'round' },
      tooltip: { enabled: false },
    };
  }

  incomeExpenseCompareChart(income: number, expenses: number): ApexOptions | null {
    return this.cashFlowBarChart(income, expenses);
  }

  incomeExpenseGroupedBarChart(trend: TrendChartItem[]): ApexOptions | null {
    if (!trend.length || trend.every(t => t.income === 0 && t.expenses === 0)) return null;

    const mobile = this.isMobile();

    return {
      chart: this.baseChart('bar', this.chartHeight(320, 260)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [
        { name: 'Income', data: trend.map(t => t.income) },
        { name: 'Expenses', data: trend.map(t => t.expenses) },
      ],
      colors: [this.incomeColor, this.expenseColor],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: mobile ? '70%' : '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        ...this.axisLabels(),
        categories: trend.map(t => t.month),
      },
      yaxis: this.yAxisLabels(),
      grid: this.gridOptions(),
      legend: {
        ...this.legendOptions(),
        position: 'top',
        horizontalAlign: mobile ? 'center' : 'right',
      },
      tooltip: this.tooltipOptions(),
    };
  }

  cashFlowNetChart(trend: TrendChartItem[]): ApexOptions | null {
    if (!trend.length || trend.every(t => t.income === 0 && t.expenses === 0)) return null;

    const net = trend.map(t => t.income - t.expenses);
    const p = this.palette();

    return {
      chart: this.baseChart('area', this.chartHeight(280, 220)),
      theme: { mode: this.themeService.theme() === 'dark' ? 'dark' : 'light' },
      series: [{ name: 'Net cash flow', data: net }],
      colors: [this.incomeColor],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.8,
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: this.isMobile() ? 0 : 4,
        colors: [this.incomeColor],
        strokeWidth: 2,
        hover: { size: 6 },
      },
      xaxis: {
        ...this.axisLabels(),
        categories: trend.map(t => t.month),
      },
      yaxis: this.yAxisLabels(),
      grid: this.gridOptions(),
      legend: { show: false },
      tooltip: {
        ...this.tooltipOptions(),
        y: {
          formatter: (val) => {
            const prefix = val >= 0 ? '+' : '-';
            return `${prefix}${this.formatCurrency(val)}`;
          },
        },
      },
      annotations: {
        yaxis: [{
          y: 0,
          borderColor: p.grid,
          strokeDashArray: 4,
        }],
      },
    };
  }
}
