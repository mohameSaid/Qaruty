import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ParticipantIdentityService } from '../../services/participant-identity.service';

export interface JoinDialogData {
  khatmahTitle: string;
}

@Component({
  selector: 'app-join-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>الانضمام إلى «{{ data.khatmahTitle }}»</h2>
    <mat-dialog-content>
      <p>أدخل اسمك للمشاركة في هذه الختمة، لا حاجة لتسجيل الدخول.</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>اسمك</mat-label>
        <input matInput [formControl]="nameControl" maxlength="60" (keydown.enter)="submit()" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">إلغاء</button>
      <button mat-flat-button color="primary" [disabled]="nameControl.invalid" (click)="submit()">متابعة</button>
    </mat-dialog-actions>
  `,
})
export class JoinDialogComponent {
  readonly dialogRef = inject(MatDialogRef<JoinDialogComponent, string>);
  readonly data: JoinDialogData = inject(MAT_DIALOG_DATA);
  private readonly identity = inject(ParticipantIdentityService);

  readonly nameControl = new FormControl(this.identity.getLastDisplayName() ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(60)],
  });

  submit(): void {
    if (this.nameControl.invalid) {
      return;
    }
    const name = this.nameControl.value.trim();
    this.identity.setLastDisplayName(name);
    this.dialogRef.close(name);
  }
}
