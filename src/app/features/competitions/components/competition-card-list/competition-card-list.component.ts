import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { Competition } from "../../models/competition.model";
import { DatePipe } from "@angular/common";
import { HasPermissionDirective } from "../../../../core/directives/has-permission.directive";
import { Permission } from "../../../../core/models/permission.model";

@Component({
  selector: "app-competition-card-list",
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe,
    HasPermissionDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./competition-card-list.component.html",
  styleUrl: "./competition-card-list.component.scss",
})
export class CompetitionCardListComponent {
  readonly Permission = Permission;
  readonly competitions = input.required<Competition[]>();
  readonly loading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);
  /** Id of the competition currently being activated/deactivated, if any — only that card's button spins. */
  readonly togglingId = input<number | null>(null);

  readonly toggleStatus = output<Competition>();
  readonly viewParticipants = output<Competition>();

  /** Placeholder cards rendered while the initial page of competitions is loading. */
  readonly skeletonIndices = [0, 1, 2];

  onToggleStatus(competition: Competition): void {
    this.toggleStatus.emit(competition);
  }

  onViewParticipants(competition: Competition): void {
    this.viewParticipants.emit(competition);
  }
}
