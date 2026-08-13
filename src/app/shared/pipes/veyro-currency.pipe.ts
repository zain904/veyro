import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'veyroCurrency', standalone: true })
export class VeyroCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, showSign = false): string {
    if (value == null) return 'Rs. 0';
    const formatted = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));

    const prefix = showSign ? (value >= 0 ? '+ ' : '- ') : (value < 0 ? '- ' : '');
    return `${prefix}Rs. ${formatted}`;
  }
}
