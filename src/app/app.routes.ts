import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/users/pages/users-list-page/users-list-page.component').then(
            (m) => m.UsersListPageComponent
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/users/pages/user-form-page/user-form-page.component').then(
            (m) => m.UserFormPageComponent
          ),
      },
      {
        path: ':nationalId/details',
        loadComponent: () =>
          import('./features/users/pages/user-detail-page/user-detail-page.component').then(
            (m) => m.UserDetailPageComponent
          ),
      },
      {
        path: ':nationalId/evaluate/:competitionUserId',
        loadComponent: () =>
          import('./features/users/pages/evaluation-page/evaluation-page.component').then(
            (m) => m.EvaluationPageComponent
          ),
      },
      {
        path: ':nationalId/edit',
        loadComponent: () =>
          import('./features/users/pages/user-form-page/user-form-page.component').then(
            (m) => m.UserFormPageComponent
          ),
      },
    ],
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  { path: '**', redirectTo: 'users' },
];
