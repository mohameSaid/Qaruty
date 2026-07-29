import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { HasPermissionDirective } from './core/directives/has-permission.directive';
import { Permission } from './core/models/permission.model';
import { ChangePasswordDialogComponent } from './features/auth/components/change-password-dialog/change-password-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    HasPermissionDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly Permission = Permission;
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  openChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '420px' });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
