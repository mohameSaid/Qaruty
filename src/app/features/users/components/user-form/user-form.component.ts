import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatNativeDateModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { distinctUntilChanged, switchMap, of, catchError } from "rxjs";

import { LookupService } from "../../services/lookup.service";
import { City, Governorate, Village } from "../../models/lookup.model";
import {
  CreateUserRequest,
  Gender,
  ParentDetail,
  ParentPayload,
  UserAddress,
  UserDetail,
} from "../../models/user.model";
import {
  nationalIdValidator,
  mobileNumberValidator,
} from "../../../../shared/validators/national-id.validator";
import {
  extractBirthDateFromNationalId,
  extractGenderFromNationalId,
} from "../../../../shared/utils/national-id.util";
import { minWordsValidator } from "../../../../shared/validators/shared-validators";

/** Fallback address applied to new (create-mode) records. */
const DEFAULT_ADDRESS = { governorate: 10, city: 1, village: 1, details: "" };

@Component({
  selector: "app-user-form",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./user-form.component.html",
  styleUrl: "./user-form.component.scss",
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(LookupService);

  /** When set, the form is in Edit Mode; otherwise Create Mode. */
  readonly editingUser = input<UserDetail | null>(null);
  readonly saving = input<boolean>(false);

  readonly create = output<CreateUserRequest>();
  readonly update = output<{ id: number; payload: CreateUserRequest }>();
  readonly cancelEdit = output<void>();

  readonly isEditMode = computed(() => this.editingUser() !== null);

  readonly genders = [
    { value: Gender.Male, label: "ذكر" },
    { value: Gender.Female, label: "أنثى" },
  ];

  readonly governorates = signal<Governorate[]>([]);
  readonly cities = signal<City[]>([]);
  readonly villages = signal<Village[]>([]);
  readonly loadingLookups = signal(false);

  readonly form = this.fb.nonNullable.group({
    nationalId: ["", [Validators.required, nationalIdValidator()]],
    arabicName: ["", [Validators.required, minWordsValidator(3)]],
    englishName: [""],
    birthDate: this.fb.control<Date | null>(null, Validators.required),
    gender: this.fb.control<Gender | null>(null, Validators.required),
    governorate: this.fb.control<number | null>(
      DEFAULT_ADDRESS.governorate,
      Validators.required,
    ),
    city: this.fb.control<number | null>(
      DEFAULT_ADDRESS.city,
      Validators.required,
    ),
    village: this.fb.control<number | null>(
      DEFAULT_ADDRESS.village,
      Validators.required,
    ),
    addressDetails: [DEFAULT_ADDRESS.details],
    mobileNumber: ["", [Validators.required, mobileNumberValidator()]],
    otherMobileNumber: ["", mobileNumberValidator()],
    email: ["", [Validators.email]],
    father: this.fb.nonNullable.group({
      id: this.fb.control<number | null>(null),
      nationalId: ["", nationalIdValidator()],
      arabicName: [""],
      englishName: [""],
      mobileNumber: ["", mobileNumberValidator()],
      email: ["", Validators.email],
    }),
    mother: this.fb.nonNullable.group({
      id: this.fb.control<number | null>(null),
      nationalId: ["", nationalIdValidator()],
      arabicName: [""],
      englishName: [""],
      mobileNumber: ["", mobileNumberValidator()],
      email: ["", Validators.email],
    }),
  });

  /** Derived, display-only — the parent sections have no editable birth date field. */
  readonly fatherBirthDate = signal<Date | null>(null);
  readonly motherBirthDate = signal<Date | null>(null);

  constructor() {
    this.loadGovernorates();
    this.loadDependentLookupsFor(
      DEFAULT_ADDRESS.governorate,
      DEFAULT_ADDRESS.city,
    );
    this.wireCascadingDropdowns();
    this.wireBirthDateAutofill();
    this.wireGenderAutofill();
    this.wireParentBirthDateAutofill();

    // Populate the form whenever the parent hands us a user to edit (or clears it).
    effect(() => {
      const user = this.editingUser();
      if (user) {
        this.populateForm(user);
      } else {
        this.resetForm();
      }
    });
  }

  private loadGovernorates(): void {
    this.loadingLookups.set(true);
    this.lookupService
      .getGovernorates()
      .pipe(
        catchError(() => of({ data: [] as Governorate[], totalRecords: 0 })),
      )
      .subscribe((page) => {
        this.governorates.set(page.data ?? []);
        this.loadingLookups.set(false);
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

  private wireCascadingDropdowns(): void {
    // Governorate -> City
    this.form.controls.governorate.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(),
        switchMap((governorateId) => {
          this.cities.set([]);
          this.villages.set([]);
          this.form.controls.city.reset(null, { emitEvent: false });
          this.form.controls.village.reset(null, { emitEvent: false });

          if (governorateId === null) {
            this.form.controls.city.disable({ emitEvent: false });
            this.form.controls.village.disable({ emitEvent: false });
            return of(null);
          }

          this.form.controls.city.enable({ emitEvent: false });
          this.form.controls.village.disable({ emitEvent: false });
          return this.lookupService
            .getCities(governorateId)
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((page) => {
        if (page) {
          this.cities.set(page.data ?? []);
        }
      });

    // City -> Village
    this.form.controls.city.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(),
        switchMap((cityId) => {
          this.villages.set([]);
          this.form.controls.village.reset(null, { emitEvent: false });

          if (cityId === null) {
            this.form.controls.village.disable({ emitEvent: false });
            return of(null);
          }

          this.form.controls.village.enable({ emitEvent: false });
          return this.lookupService
            .getVillages(cityId)
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((page) => {
        if (page) {
          this.villages.set(page.data ?? []);
        }
      });
  }

  /** Egyptian National IDs encode the birth date in their first 7 digits — derive it as the user types. */
  private wireBirthDateAutofill(): void {
    this.form.controls.nationalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const birthDate = extractBirthDateFromNationalId(value);
        if (birthDate) {
          this.form.controls.birthDate.setValue(birthDate, {
            emitEvent: false,
          });
        }
      });
  }

  private wireGenderAutofill(): void {
    this.form.controls.nationalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const gender = extractGenderFromNationalId(value);
        if (gender) {
          this.form.controls.gender.setValue(gender, { emitEvent: false });
        }
      });
  }

  private wireParentBirthDateAutofill(): void {
    this.form.controls.father.controls.nationalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.fatherBirthDate.set(extractBirthDateFromNationalId(value));
      });

    this.form.controls.mother.controls.nationalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.motherBirthDate.set(extractBirthDateFromNationalId(value));
      });
  }

  private populateForm(user: UserDetail): void {
    this.form.controls.city.enable({ emitEvent: false });
    this.form.controls.village.enable({ emitEvent: false });

    this.form.patchValue({
      nationalId: String(user.nationalId),
      arabicName: user.name.arabic,
      englishName: user.name.english,
      birthDate: user.birthDate ? new Date(user.birthDate) : null,
      gender: user.gender.id as Gender,
      governorate: user.address.governorate.id,
      city: user.address.city.id,
      village: user.address.village.id,
      addressDetails: user.address.details,
      email: user.contact.email,
      mobileNumber: user.contact.mobileNumber,
      otherMobileNumber: user.contact.otherMobileNumber,
      father: this.parentToFormValue(user.father),
      mother: this.parentToFormValue(user.mother),
    });

    // National ID should not change once a record exists.
    if (user.nationalId)
      this.form.controls.nationalId.disable({ emitEvent: false });

    // Load dependent lookups directly so the saved city/village show up
    // without waiting on the cascading valueChanges pipeline.
    this.loadDependentLookupsFor(
      user.address.governorate.id,
      user.address.city.id,
    );
  }

  private resetForm(): void {
    this.form.reset();
    this.form.controls.nationalId.enable({ emitEvent: false });
    this.form.controls.city.enable({ emitEvent: false });
    this.form.controls.village.enable({ emitEvent: false });

    this.form.patchValue({
      governorate: DEFAULT_ADDRESS.governorate,
      city: DEFAULT_ADDRESS.city,
      village: DEFAULT_ADDRESS.village,
      addressDetails: DEFAULT_ADDRESS.details,
    });

    this.loadDependentLookupsFor(
      DEFAULT_ADDRESS.governorate,
      DEFAULT_ADDRESS.city,
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const address = {
      governorate: raw.governorate!,
      city: raw.city!,
      village: raw.village!,
      details: raw.addressDetails,
    };
    const payload: CreateUserRequest = {
      nationalId: Number(raw.nationalId),
      name: { arabic: raw.arabicName, english: raw.englishName },
      address,
      contact: {
        email: raw.email,
        mobileNumber: raw.mobileNumber,
        otherMobileNumber: raw.otherMobileNumber,
      },
      birthDate: this.toIsoDate(raw.birthDate!),
      gender: raw.gender!,
      father: this.buildParentPayload(
        raw.father,
        Gender.Male,
        address,
        raw.mobileNumber,
      ),
      mother: this.buildParentPayload(
        raw.mother,
        Gender.Female,
        address,
        raw.mobileNumber,
      ),
    };

    const editing = this.editingUser();
    if (editing) {
      this.update.emit({ id: editing.id, payload });
    } else {
      this.create.emit(payload);
    }
  }

  onCancelEdit(): void {
    this.cancelEdit.emit();
  }

  /** A parent section is only sent when the user actually entered something into it — both stay optional. */
  private buildParentPayload(
    raw: {
      id: number | null;
      nationalId: string;
      arabicName: string;
      englishName: string;
      mobileNumber: string;
      email: string;
    },
    gender: Gender,
    userAddress: UserAddress,
    userMobileNumber: string,
  ): ParentPayload | null {
    const hasContent = [
      raw.nationalId,
      raw.arabicName,
      raw.englishName,
      raw.mobileNumber,
      raw.email,
    ].some((value) => value.trim() !== "");
    if (!hasContent) {
      return null;
    }

    const birthDate = extractBirthDateFromNationalId(raw.nationalId);
    return {
      id: raw.id ? Number(raw.id) : null,
      nationalId: raw.nationalId ? Number(raw.nationalId) : null,
      name: { arabic: raw.arabicName, english: raw.englishName },
      contact: {
        email: raw.email,
        mobileNumber: raw.mobileNumber || userMobileNumber,
        otherMobileNumber: "",
      },
      birthDate: birthDate ? this.toIsoDate(birthDate) : null,
      address: userAddress,
      gender,
      father: null,
      mother: null,
    };
  }

  parentBirthDateLabel(date: Date | null): string {
    return date ? this.toIsoDate(date) : "";
  }

  private parentToFormValue(parent: ParentDetail | null | undefined) {
    return {
      id: parent?.id ?? null,
      nationalId: parent?.nationalId ? String(parent.nationalId) : "",
      arabicName: parent?.name?.arabic ?? "",
      englishName: parent?.name?.english ?? "",
      mobileNumber: parent?.contact?.mobileNumber ?? "",
      email: parent?.contact?.email ?? "",
    };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
