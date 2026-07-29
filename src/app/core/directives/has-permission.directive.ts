import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Permission } from '../models/permission.model';

/**
 * Structural directive that shows its host element only when the logged-in
 * user holds at least one of the given permissions (from the login response).
 *
 * Usage: `<button *appHasPermission="Permission.UserCreate">...</button>`
 *        `<button *appHasPermission="[Permission.UserUpdate, Permission.UserDeactivate]">...</button>`
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly appHasPermission = input.required<Permission | Permission[]>();

  private created = false;

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const permissions = Array.isArray(required) ? required : [required];
      const allowed = permissions.some((permission) => this.auth.hasPermission(permission));

      if (allowed && !this.created) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.created = true;
      } else if (!allowed && this.created) {
        this.viewContainer.clear();
        this.created = false;
      }
    });
  }
}
