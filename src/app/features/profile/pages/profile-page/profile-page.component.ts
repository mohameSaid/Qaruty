import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, firstValueFrom, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ChangePasswordDialogComponent } from '../../../auth/components/change-password-dialog/change-password-dialog.component';
import {
  AvatarCropDialogComponent,
  AvatarCropDialogData,
  AvatarCropDialogResult,
} from '../../../../shared/components/avatar-crop-dialog/avatar-crop-dialog.component';
import { ResultShareCardComponent } from '../../../../shared/components/result-share-card/result-share-card.component';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar.component';
import { ShareCardService } from '../../../../shared/services/share-card.service';
import { SupabaseStorageService } from '../../../../shared/services/supabase-storage.service';
import { imageValidationErrorMessage, validateImageFile } from '../../../../shared/utils/image-validation.util';
import { mobileNumberValidator } from '../../../../shared/validators/national-id.validator';
import { minWordsValidator } from '../../../../shared/validators/shared-validators';
import { CompetitionHistoryItem } from '../../../users/models/competition.model';
import { City, Governorate, Village } from '../../../users/models/lookup.model';
import { CreateUserRequest, Gender, ParentDetail, ParentPayload, UserAddress, UserDetail } from '../../../users/models/user.model';
import { CompetitionService } from '../../../users/services/competition.service';
import { LookupService } from '../../../users/services/lookup.service';
import { UserService } from '../../../users/services/user.service';

/** Read-only "my profile" view for the signed-in user, reusing `UserService.getUserByNationalId`. */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
    ResultShareCardComponent,
    UserAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  readonly Gender = Gender;

  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly shareCardService = inject(ShareCardService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);
  private readonly supabaseStorage = inject(SupabaseStorageService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly lookupService = inject(LookupService);
  private readonly fb = inject(FormBuilder);

  readonly user = signal<UserDetail | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly competitionHistory = signal<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = signal(false);
  readonly historyColumns = ['name', 'level', 'partsCount', 'grade', 'status', 'actions'];

  /**
   * Row currently feeding the off-screen `ResultShareCardComponent` for capture — set only while a
   * share is in flight. The card itself stays permanently mounted in the template (see
   * `share-capture-host`) so this `viewChild` never races the card's own creation — it used to be
   * behind an `@if`, which meant `shareCard()` could still be `undefined` by the time `shareResult()`
   * read it right after setting this signal, since the child hadn't been created by CD yet.
   */
  readonly shareRow = signal<CompetitionHistoryItem | null>(null);
  readonly sharingRowId = signal<number | null>(null);
  private readonly shareCard = viewChild(ResultShareCardComponent);

  readonly shareCompetitionName = computed(() => {
    const row = this.shareRow();
    return row ? `${row.competition.name.arabic} — ${row.level.name.arabic}` : '';
  });
  readonly shareEvaluation = computed(() => this.shareRow()?.grade?.name.arabic ?? '');

  /**
   * Local `URL.createObjectURL` of the compressed, cropped photo blob — chosen once via the avatar
   * camera button, reused for every share and for the header avatar preview. Deliberately NOT the
   * remote Supabase URL: `ResultShareCardComponent` avoids cross-origin images so its `html2canvas`
   * capture stays reliable (see that component's doc comment), and the blob is already in memory
   * here anyway, so there's no reason to round-trip through the network for same-session rendering.
   */
  readonly photoBlobUrl = signal<string | null>(null);
  /** Remote Supabase Storage URL of the uploaded photo, once persistence support exists server-side. */
  readonly profileImageUrl = signal<string | null>(null);
  readonly uploadingPhoto = signal(false);
  /** Guards the async `loadExistingProfilePhoto` continuation from writing/leaking a blob URL after the component is gone. */
  private destroyed = false;

  /**
   * Self-service "edit my profile" mode. National ID (and the birth date/gender it encodes, per
   * the same convention as the admin `UserFormComponent`) is deliberately never part of this form —
   * it's rendered as plain read-only text in the template and always resubmitted unchanged in
   * `saveProfile()`, so a normal user has no way to change it from this page.
   */
  readonly editing = signal(false);
  readonly savingProfile = signal(false);

  readonly governorates = signal<Governorate[]>([]);
  readonly cities = signal<City[]>([]);
  readonly villages = signal<Village[]>([]);
  readonly loadingLookups = signal(false);

  readonly editForm = this.fb.nonNullable.group({
    arabicName: ['', [Validators.required, minWordsValidator(3)]],
    englishName: [''],
    governorate: this.fb.control<number | null>(null, Validators.required),
    city: this.fb.control<number | null>(null, Validators.required),
    village: this.fb.control<number | null>(null),
    addressDetails: [''],
    email: ['', [Validators.email]],
    mobileNumber: ['', [Validators.required, mobileNumberValidator()]],
    otherMobileNumber: ['', mobileNumberValidator()],
  });

  constructor() {
    this.wireCascadingDropdowns();
  }

  /** Governorate -> City -> Village, mirroring `UserFormComponent`'s cascading dropdown logic. */
  private wireCascadingDropdowns(): void {
    this.editForm.controls.governorate.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(),
        switchMap((governorateId) => {
          this.cities.set([]);
          this.villages.set([]);
          this.editForm.controls.city.reset(null, { emitEvent: false });
          this.editForm.controls.village.reset(null, { emitEvent: false });

          if (governorateId === null) {
            return of(null);
          }
          return this.lookupService.getCities(governorateId).pipe(catchError(() => of(null)));
        })
      )
      .subscribe((page) => {
        if (page) {
          this.cities.set(page.data ?? []);
        }
      });

    this.editForm.controls.city.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(),
        switchMap((cityId) => {
          this.villages.set([]);
          this.editForm.controls.village.reset(null, { emitEvent: false });

          if (cityId === null) {
            return of(null);
          }
          return this.lookupService.getVillages(cityId).pipe(catchError(() => of(null)));
        })
      )
      .subscribe((page) => {
        if (page) {
          this.villages.set(page.data ?? []);
        }
      });
  }

  private loadDependentLookupsFor(governorateId: number, cityId: number): void {
    this.lookupService
      .getCities(governorateId)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => page && this.cities.set(page.data ?? []));

    this.lookupService
      .getVillages(cityId)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => page && this.villages.set(page.data ?? []));
  }

  startEdit(): void {
    const u = this.user();
    if (!u) {
      return;
    }

    this.editForm.reset();
    this.editForm.patchValue({
      arabicName: u.name.arabic,
      englishName: u.name.english,
      governorate: u.address.governorate.id,
      city: u.address.city.id,
      village: u.address.village?.id ?? null,
      addressDetails: u.address.details,
      email: u.contact.email,
      mobileNumber: u.contact.mobileNumber,
      otherMobileNumber: u.contact.otherMobileNumber,
    });

    if (this.governorates().length === 0) {
      this.loadingLookups.set(true);
      this.lookupService
        .getGovernorates()
        .pipe(
          catchError(() => of({ data: [] as Governorate[], totalRecords: 0 })),
          finalize(() => this.loadingLookups.set(false))
        )
        .subscribe((page) => this.governorates.set(page.data ?? []));
    }
    // Populate the saved city/village directly rather than waiting on the cascading valueChanges
    // pipeline above, which resets both to null whenever the governorate control changes.
    this.loadDependentLookupsFor(u.address.governorate.id, u.address.city.id);

    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveProfile(): void {
    const u = this.user();
    if (!u) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    const address: UserAddress = {
      governorate: raw.governorate!,
      city: raw.city!,
      village: raw.village!,
      details: raw.addressDetails,
    };
    const payload: CreateUserRequest = {
      // National ID, birth date, and gender are read-only here (birth date/gender are derived from
      // the National ID) — always resubmitted unchanged so a normal user can never alter them.
      nationalId: Number(u.nationalId),
      name: { arabic: raw.arabicName, english: raw.englishName },
      address,
      contact: {
        email: raw.email,
        mobileNumber: raw.mobileNumber,
        otherMobileNumber: raw.otherMobileNumber,
      },
      birthDate: u.birthDate,
      gender: u.gender.id as Gender,
      studyYearId: u.study?.studyYear?.id ?? null,
      father: this.parentToPayload(u.father, Gender.Male, address),
      mother: this.parentToPayload(u.mother, Gender.Female, address),
    };

    this.savingProfile.set(true);
    this.userService
      .updateUser(u.id, payload)
      .pipe(
        catchError(() => {
          this.snackbar.error('تعذر تحديث بياناتك، حاول مرة أخرى.');
          return of(null);
        }),
        finalize(() => this.savingProfile.set(false))
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }
        this.user.set(updated);
        this.editing.set(false);
        this.snackbar.success('تم تحديث بياناتك بنجاح.');
      });
  }

  /** Keeps an existing father/mother record intact in the update payload — reusing the user's own
   *  address (parents don't have a separate one here) and the fixed gender for that role, same as
   *  `UserFormComponent.buildParentPayload`. */
  private parentToPayload(parent: ParentDetail | null | undefined, gender: Gender, address: UserAddress): ParentPayload | null {
    if (!parent) {
      return null;
    }
    return {
      id: parent.id,
      nationalId: parent.nationalId,
      name: parent.name,
      contact: parent.contact,
      birthDate: parent.birthDate,
      address,
      gender,
      father: null,
      mother: null,
    };
  }

  ngOnInit(): void {
    const nationalId = this.auth.nationalId();
    if (nationalId == null) {
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.userService
      .getUserByNationalId(String(nationalId), 'NATIONAL_ID')
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((user) => {
        this.user.set(user);
        if (user) {
          this.loadCompetitionHistory(user.id);
          this.loadExistingProfilePhoto(user.id);
        }
      });
  }

  /**
   * Restores a previously-uploaded photo on page load/reload — without this, `photoBlobUrl` (an
   * in-memory `blob:` URL) is empty on every fresh page load even though the photo is durably
   * stored in Supabase, so both the avatar preview and `shareResult()`'s "add a photo first" gate
   * would incorrectly look like no photo was ever chosen.
   */
  private async loadExistingProfilePhoto(userId: number): Promise<void> {
    try {
      const existing = await this.supabaseStorage.fetchExistingProfileImage(userId);
      if (!existing || this.destroyed) {
        return;
      }

      const previousBlobUrl = this.photoBlobUrl();
      this.photoBlobUrl.set(URL.createObjectURL(existing.blob));
      if (previousBlobUrl) {
        URL.revokeObjectURL(previousBlobUrl);
      }
      this.profileImageUrl.set(existing.url);
    } catch (err) {
      console.error('loadExistingProfilePhoto failed', err);
    }
  }

  private loadCompetitionHistory(userId: number): void {
    this.loadingHistory.set(true);
    this.competitionService
      .getStudentHistory(userId, { pageNo: 0, size: 10, sortColumn: 'id', sortDirection: 'DESC' })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingHistory.set(false))
      )
      .subscribe((page) => this.competitionHistory.set(page?.data ?? []));
  }

  onChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '420px' });
  }

  async shareResult(row: CompetitionHistoryItem, target: 'whatsapp' | 'facebook'): Promise<void> {
    const user = this.user();
    if (!user || !user.nationalId || this.sharingRowId() != null) {
      return;
    }

    // Most students don't notice the small camera button on their avatar on their own — require
    // a photo before sharing rather than silently exporting the generic placeholder icon.
    if (!this.photoBlobUrl()) {
      this.snackbar.error('يجب إضافة صورتك الشخصية أولاً عبر زر الكاميرا بجانب صورتك بالأعلى.');
      return;
    }

    this.sharingRowId.set(row.id);
    try {
      const resultUrl = `${window.location.origin}/users/${user.nationalId}/result/${row.id}`;
      this.shareRow.set(row);
      // The card stays permanently mounted (see `share-capture-host`) so this signal write just
      // updates its inputs — wait a couple of frames for that DOM update (and the participant photo
      // `<img>` decode, if one was chosen) to actually paint before capturing it.
      await this.waitForNextPaint();

      const el = this.shareCard()?.captureRoot().nativeElement;
      if (!el) {
        throw new Error('تعذر تجهيز بطاقة النتيجة.');
      }
      // The card element is reused across shares, so the service's per-element cache must be
      // dropped each time or a later share would silently reuse an earlier row's rendered PNG.
      this.shareCardService.invalidate(el);

      const options = {
        fileName: `نتيجتي-${row.competition.name.arabic}.png`,
        shareTitle: `نتيجتي في ${row.competition.name.arabic}`,
        shareText: `حصلت على تقدير ${row.grade?.name?.arabic ?? '—'} في ${row.competition.name.arabic} عبر قريتي: ${resultUrl}`,
        pageUrl: resultUrl,
      };
      if (target === 'whatsapp') {
        await this.shareCardService.shareToWhatsApp(el, options);
        this.snackbar.info('تم تنزيل صورة النتيجة، يمكنك إرفاقها يدويًا في المحادثة بجانب الرابط الذي تم فتحه.');
      } else {
        const method = await this.shareCardService.shareToFacebook(el, options);
        if (method === 'download') {
          this.snackbar.info('تم تنزيل صورة النتيجة، يمكنك إرفاقها يدويًا في المحادثة بجانب الرابط الذي تم فتحه.');
        }
      }
    } catch (err) {
      console.error('shareResult failed', err);
      this.snackbar.error('تعذرت مشاركة النتيجة، حاول مرة أخرى.');
    } finally {
      this.sharingRowId.set(null);
      this.shareRow.set(null);
    }
  }

  /** Validates -> opens the crop dialog -> processes -> uploads the chosen file as the profile photo. */
  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    const validation = await validateImageFile(file);
    if (!validation.ok) {
      this.snackbar.error(imageValidationErrorMessage(validation.error));
      return;
    }

    const isSmallViewport = this.breakpointObserver.isMatched('(max-width: 599px)');
    const dialogRef = this.dialog.open<AvatarCropDialogComponent, AvatarCropDialogData, AvatarCropDialogResult | undefined>(
      AvatarCropDialogComponent,
      isSmallViewport
        ? { data: { file }, width: '100vw', height: '100dvh', maxWidth: '100vw', panelClass: 'avatar-crop-dialog--fullscreen' }
        : { data: { file }, width: '480px', maxWidth: '95vw' }
    );
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      return;
    }

    const previousBlobUrl = this.photoBlobUrl();
    this.photoBlobUrl.set(URL.createObjectURL(result.blob));
    if (previousBlobUrl) {
      URL.revokeObjectURL(previousBlobUrl);
    }

    const userId = this.user()?.id;
    if (userId == null) {
      return;
    }

    this.uploadingPhoto.set(true);
    try {
      const url = await this.supabaseStorage.uploadProfileImage(userId, result.blob, result.mimeType);
      this.profileImageUrl.set(url);
      this.snackbar.success('تم تحديث صورتك الشخصية.');
      // TODO(backend): persist `url` against the user record once a confirmed field/endpoint exists.
    } catch (err) {
      console.error('onPhotoSelected upload failed', err);
      this.snackbar.error('تعذر رفع الصورة، حاول مرة أخرى.');
    } finally {
      this.uploadingPhoto.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    const blobUrl = this.photoBlobUrl();
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
}
