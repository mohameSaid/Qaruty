import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { catchError, finalize, of, tap } from 'rxjs';

import { ParticipantService } from '../../services/participant.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { CompetitionRegistrationFormComponent } from '../../../users/components/competition-registration-form/competition-registration-form.component';
import { UpdateCompetitionRequest } from '../../../users/models/competition.model';

export interface ParticipantEditDialogData {
  userId: number;
  editRequest: UpdateCompetitionRequest;
}

/** Hosts the shared registration form in a large modal, so editing a participant doesn't get lost at the bottom of a long table. */
@Component({
  selector: 'app-participant-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, CompetitionRegistrationFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>تعديل التسجيل</h2>
    <mat-dialog-content>
      <app-competition-registration-form
        [userId]="data.userId"
        [registering]="saving()"
        [editRequest]="data.editRequest"
        [showAddButton]="false"
        (edit)="onSubmit($event)"
        (formCancelled)="dialogRef.close(false)"
      />
    </mat-dialog-content>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-dialog-content {
      min-width: min(640px, 90vw);
    }
  `,
})
export class ParticipantEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ParticipantEditDialogComponent>);
  readonly data: ParticipantEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly participantService = inject(ParticipantService);
  private readonly snackbar = inject(SnackbarService);

  readonly saving = signal(false);

  onSubmit(payload: UpdateCompetitionRequest): void {
    this.saving.set(true);
    this.participantService
      .updateParticipant(payload.id, payload)
      .pipe(
        tap(() => {
          this.snackbar.success('تم تعديل التسجيل بنجاح.');
          this.dialogRef.close(true);
        }),
        catchError(() => of(null)),
        finalize(() => this.saving.set(false))
      )
      .subscribe();
  }
}
