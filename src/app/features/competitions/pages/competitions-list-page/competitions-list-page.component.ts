import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CompetitionsStore } from '../../store/competitions.store';
import { CompetitionCardListComponent } from '../../components/competition-card-list/competition-card-list.component';
import { Competition } from '../../models/competition.model';

@Component({
  selector: 'app-competitions-list-page',
  standalone: true,
  imports: [CompetitionCardListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competitions-list-page.component.html',
  styleUrl: './competitions-list-page.component.scss',
})
export class CompetitionsListPageComponent implements OnInit {
  readonly store = inject(CompetitionsStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.loadCompetitions();
  }

  onToggleStatus(competition: Competition): void {
    this.store.toggleStatus(competition);
  }

  onViewParticipants(competition: Competition): void {
    this.router.navigate(['/competitions', competition.id, 'participants']);
  }
}
