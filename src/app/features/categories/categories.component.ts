import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

import { MatIconModule } from '@angular/material/icon';

import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatSelectModule } from '@angular/material/select';

import { FormsModule } from '@angular/forms';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Subscription } from 'rxjs';

import { CategoryService } from '../../core/services/category.service';

import { DataRefreshService } from '../../core/services/data-refresh.service';

import { LanguageService } from '../../core/services/language.service';

import { Category } from '../../core/models/transaction.model';

import { MONTHS, monthLabel, yearOptions } from '../../core/utils/date.util';

import { VeyroCurrencyPipe } from '../../shared/pipes/veyro-currency.pipe';

import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';



type CategoryWithStats = Category & { spent: number; income: number };



@Component({

  selector: 'app-categories',

  standalone: true,

  imports: [

    MatCardModule, MatIconModule, MatButtonModule,

    MatFormFieldModule, MatSelectModule, FormsModule, VeyroCurrencyPipe,

    EmptyStateComponent, TranslatePipe,

  ],

  templateUrl: './categories.component.html',

  styleUrl: './categories.component.scss',

})

export class CategoriesComponent implements OnInit, OnDestroy {

  private refresh = inject(DataRefreshService);

  private lang = inject(LanguageService);

  private translate = inject(TranslateService);

  private langSub?: Subscription;



  loading = signal(true);

  categories = signal<CategoryWithStats[]>([]);

  filterType: 'all' | 'expense' | 'income' = 'all';

  filterMonth = new Date().getMonth() + 1;

  filterYear = new Date().getFullYear();



  months = MONTHS;

  years = yearOptions(5);



  constructor(private categoryService: CategoryService) {}



  ngOnInit(): void {

    this.load();

    this.refresh.refresh$.subscribe(() => this.load());

    this.langSub = this.translate.onLangChange.subscribe(() => this.load());

  }



  ngOnDestroy(): void {

    this.langSub?.unsubscribe();

  }



  get periodLabel(): string {

    return monthLabel(this.filterMonth, this.filterYear, this.lang.currentLang());

  }



  getMonthLabel(month: number): string {

    return monthLabel(month, this.filterYear, this.lang.currentLang());

  }



  get filteredCategories(): CategoryWithStats[] {

    if (this.filterType === 'all') return this.categories();

    return this.categories().filter(c => c.type === this.filterType);

  }



  get expenseTotal(): number {

    return this.categories().filter(c => c.type === 'expense').reduce((s, c) => s + c.spent, 0);

  }



  get incomeTotal(): number {

    return this.categories().filter(c => c.type === 'income').reduce((s, c) => s + c.income, 0);

  }



  get expenseCategoryCount(): number {

    return this.categories().filter(c => c.type === 'expense').length;

  }



  get incomeCategoryCount(): number {

    return this.categories().filter(c => c.type === 'income').length;

  }



  async load(): Promise<void> {

    this.loading.set(true);

    try {

      const data = await this.categoryService.getCategoriesWithStats(this.filterMonth, this.filterYear);

      this.categories.set(data);

    } catch (err) {

      console.error(err);

    } finally {

      this.loading.set(false);

    }

  }

}

