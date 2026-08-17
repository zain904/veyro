import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  viewChild,
  effect,
  inject,
} from '@angular/core';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { ThemeService } from '../../../core/services/theme.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    @if (loading) {
      <div class="chart-skeleton" [style.min-height.px]="minHeight"></div>
    } @else if (empty) {
      <app-empty-state
        [card]="false"
        [inline]="true"
        [compact]="true"
        [icon]="emptyIcon"
        [title]="emptyTitle"
        [message]="emptyMessage"
        [actionLabel]="actionLabel"
        [actionIcon]="actionIcon"
        [actionRoute]="actionRoute"
        (actionClick)="actionClick.emit()" />
    } @else {
      <div #chartContainer class="chart-container" [style.min-height.px]="minHeight"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .chart-container {
      width: 100%;
    }

    .chart-skeleton {
      width: 100%;
      border-radius: var(--radius-md);
      background: linear-gradient(90deg, var(--hover-color) 25%, var(--border-color) 50%, var(--hover-color) 75%);
      background-size: 200% 100%;
      animation: veyro-shimmer 1.4s infinite;
    }

    @keyframes veyro-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class ChartComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() options!: ApexOptions;
  @Input() empty = false;
  @Input() loading = false;
  @Input() emptyTitle = 'No data yet';
  @Input() emptyMessage = 'Start adding transactions to see insights here.';
  @Input() emptyIcon = 'bar_chart';
  @Input() actionLabel = 'Add Transaction';
  @Input() actionIcon = 'add';
  @Input() actionRoute = '/transactions';
  @Input() minHeight = 220;
  @Output() actionClick = new EventEmitter<void>();

  chartContainer = viewChild<ElementRef>('chartContainer');
  private chart: ApexCharts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeService = inject(ThemeService);
  private viewReady = false;

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.viewReady && this.chart && this.options && !this.empty && !this.loading) {
        this.renderChart(true);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.setupResizeObserver();
    if (this.options && !this.empty && !this.loading) {
      this.renderChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['options'] || changes['empty'] || changes['loading']) && this.viewReady) {
      if (this.empty || this.loading) {
        this.destroyChart();
      } else if (this.options) {
        setTimeout(() => this.renderChart(), 0);
      }
    }
  }

  private setupResizeObserver(): void {
    const container = this.chartContainer()?.nativeElement;
    if (!container || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        window.dispatchEvent(new Event('resize'));
      }
    });
    this.resizeObserver.observe(container);
  }

  private renderChart(recreate = false): void {
    const container = this.chartContainer()?.nativeElement;
    if (!container || this.empty || this.loading) return;

    const options: ApexOptions = {
      ...this.options,
      chart: {
        ...this.options.chart,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
    };

    if (this.chart && !recreate) {
      this.chart.updateOptions(options, true, true);
      return;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.chart = new ApexCharts(container, options);
    this.chart.render();
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.destroyChart();
  }
}
