import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Permission } from '../../models/permission.model';
import { ChangePasswordDialogComponent } from '../../../features/auth/components/change-password-dialog/change-password-dialog.component';

/**
 * Authenticated app chrome (toolbar + nav rail). Only ever instantiated by the
 * router for the guarded parent route in app.routes.ts, so it — and its own
 * <router-outlet> — mount/unmount in lockstep with actual navigation instead
 * of a signal toggling the outlet's DOM location independently of the route.
 */
@Component({
  selector: 'app-shell',
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
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly Permission = Permission;
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 720;

  /** Open by default on desktop (a static rail); closed by default on mobile (an overlay drawer). */
  readonly sidebarOpen = signal(!this.isMobileViewport);

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 720) {
      this.sidebarOpen.set(false);
    }
  }

  openChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '420px' });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
