import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { Permission } from './core/models/permission.model';

export const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password-page/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
  },
  {
    path: 'competitions',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        canActivate: [permissionGuard(Permission.CompetitionsRead)],
        loadComponent: () =>
          import('./features/competitions/pages/competitions-list-page/competitions-list-page.component').then(
            (m) => m.CompetitionsListPageComponent
          ),
      },
      {
        path: ':id/participants',
        canActivate: [permissionGuard(Permission.ParticipantsRead)],
        loadComponent: () =>
          import(
            './features/competitions/pages/competition-participants-page/competition-participants-page.component'
          ).then((m) => m.CompetitionParticipantsPageComponent),
      },
    ],
  },
  {
    path: 'users',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        canActivate: [permissionGuard(Permission.UsersRead)],
        loadComponent: () =>
          import('./features/users/pages/users-list-page/users-list-page.component').then(
            (m) => m.UsersListPageComponent
          ),
      },
      {
        path: 'new',
        canActivate: [permissionGuard(Permission.UserCreate)],
        loadComponent: () =>
          import('./features/users/pages/user-form-page/user-form-page.component').then(
            (m) => m.UserFormPageComponent
          ),
      },
      {
        path: ':nationalId/details',
        canActivate: [permissionGuard(Permission.UserDetailsRead)],
        loadComponent: () =>
          import('./features/users/pages/user-detail-page/user-detail-page.component').then(
            (m) => m.UserDetailPageComponent
          ),
      },
      {
        path: ':nationalId/evaluate/:competitionUserId',
        canActivate: [permissionGuard(Permission.ParticipantUpdate)],
        loadComponent: () =>
          import('./features/users/pages/evaluation-page/evaluation-page.component').then(
            (m) => m.EvaluationPageComponent
          ),
      },
      {
        path: ':nationalId/edit',
        canActivate: [permissionGuard(Permission.UserUpdate)],
        loadComponent: () =>
          import('./features/users/pages/user-form-page/user-form-page.component').then(
            (m) => m.UserFormPageComponent
          ),
      },
    ],
  },
  {
    path: 'system-management',
    canActivate: [authGuard],
    children: [
      {
        path: 'requests',
        canActivate: [permissionGuard(Permission.UserCreate)],
        loadComponent: () =>
          import('./features/system-management/pages/requests-list-page/requests-list-page.component').then(
            (m) => m.RequestsListPageComponent
          ),
      },
      {
        path: 'requests/:id/similarities',
        canActivate: [permissionGuard(Permission.UserCreate)],
        loadComponent: () =>
          import(
            './features/system-management/pages/registration-similarity-request-detail-page/registration-similarity-request-detail-page.component'
          ).then((m) => m.RegistrationSimilarityRequestDetailPageComponent),
      },
      {
        path: 'requests/:id/reset-password',
        canActivate: [permissionGuard(Permission.UserCreate)],
        loadComponent: () =>
          import(
            './features/system-management/pages/reset-password-request-detail-page/reset-password-request-detail-page.component'
          ).then((m) => m.ResetPasswordRequestDetailPageComponent),
      },
      {
        path: 'lookups',
        canActivate: [permissionGuard(Permission.systemCodesRead)],
        loadComponent: () =>
          import(
            './features/system-management/pages/lookup-management-page/lookup-management-page.component'
          ).then((m) => m.LookupManagementPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
