import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-search.component.html',
  styleUrl: './user-search.component.scss',
})
export class UserSearchComponent {
  readonly searching = input<boolean>(false);
  readonly notFound = input<boolean>(false);

  readonly search = output<string>();
  readonly clear = output<void>();

  readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{14}$/)],
  });

  onSearch(): void {
    if (this.control.invalid) {
      this.control.markAsTouched();
      return;
    }
    this.search.emit(this.control.value);
  }

  onClear(): void {
    this.control.reset('');
    this.clear.emit();
  }
}
