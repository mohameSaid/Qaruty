import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";

import {
  CompetitionHistoryItem,
  RegisterCompetitionRequest,
  UpdateCompetitionRequest,
} from "../../models/competition.model";
import { ConfirmDialogComponent } from "../../../../shared/components/confirm-dialog/confirm-dialog.component";
import { HasPermissionDirective } from "../../../../core/directives/has-permission.directive";
import { Permission } from "../../../../core/models/permission.model";
import { CompetitionRegistrationFormComponent } from "../competition-registration-form/competition-registration-form.component";

@Component({
  selector: "app-competition-registration",
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    HasPermissionDirective,
    CompetitionRegistrationFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./competition-registration.component.html",
  styleUrl: "./competition-registration.component.scss",
})
export class CompetitionRegistrationComponent {
  readonly Permission = Permission;

  private readonly dialog = inject(MatDialog);

  readonly userId = input.required<number>();
  readonly history = input<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = input<boolean>(false);
  readonly registering = input<boolean>(false);
  readonly resetTrigger = input<number>(0);
  /** The person's own study year (from `UserDetail.study.studyYear`) — prefills the field below but stays editable. */
  readonly defaultStudyYearId = input<number | null>(null);

  readonly register = output<RegisterCompetitionRequest>();
  readonly edit = output<UpdateCompetitionRequest>();
  readonly evaluate = output<CompetitionHistoryItem>();
  readonly deactivate = output<CompetitionHistoryItem>();
  readonly activate = output<CompetitionHistoryItem>();
  readonly delete = output<CompetitionHistoryItem>();

  readonly historyColumns = [
    "name",
    "level",
    "partsCount",
    "score",
    "status",
    "actions",
  ];

  /** Set from a history row's "edit" action; forwarded to the shared form component. */
  readonly editRequest = signal<UpdateCompetitionRequest | null>(null);

  /** Opens the form pre-filled with a history row's data; submit() then emits `edit` instead of `register`. */
  onEditItem(item: CompetitionHistoryItem): void {
    const exceptionIdList = item.exceptions?.map((e) => e.id) ?? [];
    this.editRequest.set({
      id: item.id,
      competitionId: item.competition.id,
      userId: this.userId(),
      levelId: item.level.id,
      partsCount: item.partsCount,
      studyYearId: item.studyClass?.year?.id ?? null,
      instructorId: item.instructor?.id ?? null,
      placeId: item.place?.id ?? null,
      exceptionIdList: exceptionIdList,
      notes: null,
    });
  }

  onEvaluate(item: CompetitionHistoryItem): void {
    this.evaluate.emit(item);
  }

  onDeactivate(item: CompetitionHistoryItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "إلغاء تفعيل التسجيل",
        message: `هل أنت متأكد من إلغاء تفعيل التسجيل في "${item.competition.name.arabic}"؟`,
        confirmLabel: "إلغاء التفعيل",
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deactivate.emit(item);
      }
    });
  }

  onActivate(item: CompetitionHistoryItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "تفعيل التسجيل",
        message: `هل أنت متأكد من إعادة تفعيل التسجيل في "${item.competition.name.arabic}"؟`,
        confirmLabel: "تفعيل",
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.activate.emit(item);
      }
    });
  }

  onDelete(item: CompetitionHistoryItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "حذف التسجيل",
        message: `هل أنت متأكد من حذف التسجيل في "${item.competition.name.arabic}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete.emit(item);
      }
    });
  }
}
