import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

@Pipe({ name: 'veyroCurrency', standalone: true, pure: false })
export class VeyroCurrencyPipe implements PipeTransform {
  private currency = inject(CurrencyService);

  transform(value: number | null | undefined, showSign = false): string {
    return this.currency.format(value, { showSign });
  }
}
