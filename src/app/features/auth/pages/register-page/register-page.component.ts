import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { catchError, of } from "rxjs";

import { RegisterService } from "../../services/register.service";
import {
  RegisterRequest,
  RegisterResponseCode,
} from "../../models/register.model";
import { Gender } from "../../../users/models/user.model";
import { LookupService } from "../../../users/services/lookup.service";
import { City, Governorate, Village } from "../../../users/models/lookup.model";
import {
  nationalIdValidator,
  mobileNumberValidator,
} from "../../../../shared/validators/national-id.validator";
import {
  minWordsValidator,
  passwordMatchValidator,
} from "../../../../shared/validators/shared-validators";
import {
  extractBirthDateFromNationalId,
  extractGenderFromNationalId,
} from "../../../../shared/utils/national-id.util";

type SubmitOutcome =
  | "idle"
  | "duplicateNationalId"
  | "pendingApproval"
  | "success";

/** Most registrants live here, so this is preselected and sent silently unless the user opts to pick their own address. */
const DEFAULT_ADDRESS = { governorate: 10, city: 1, village: 1, details: "" };

@Component({
  selector: "app-register-page",
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./register-page.component.html",
  styleUrl: "./register-page.component.scss",
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly registerService = inject(RegisterService);
  private readonly lookupService = inject(LookupService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly outcome = signal<SubmitOutcome>("idle");
  readonly resultMessage = signal("");

  readonly governorates = signal<Governorate[]>([]);
  readonly cities = signal<City[]>([]);
  readonly villages = signal<Village[]>([]);

  readonly derivedBirthDate = signal<Date | null>(null);
  readonly derivedGender = signal<Gender | null>(null);

  /** Most registrants share `DEFAULT_ADDRESS`, so the address pickers stay hidden unless the user opts out. */
  readonly useDefaultAddress = signal(true);

  readonly form = this.fb.nonNullable.group({
    nationalId: ["", [Validators.required, nationalIdValidator()]],
    arabicName: ["", [Validators.required, minWordsValidator(3)]],
    governorate: this.fb.control<number | null>(null),
    city: this.fb.control<number | null>(null),
    village: this.fb.control<number | null>(null),
    email: ["", [Validators.email]],
    mobileNumber: ["", [Validators.required, mobileNumberValidator()]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: [
      "",
      [Validators.required, passwordMatchValidator("password")],
    ],
  });

  constructor() {
    this.loadGovernorates();
    this.wireCascadingDropdowns();
    this.wireNationalIdAutofill();
  }

  private loadGovernorates(): void {
    this.lookupService
      .getGovernorates()
      .pipe(
        catchError(() => of({ data: [] as Governorate[], totalRecords: 0 })),
      )
      .subscribe((page) => this.governorates.set(page.data ?? []));
  }

  private wireCascadingDropdowns(): void {
    this.form.controls.governorate.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((governorateId) => {
        this.cities.set([]);
        this.villages.set([]);
        this.form.controls.city.reset(null, { emitEvent: false });
        this.form.controls.village.reset(null, { emitEvent: false });

        if (governorateId === null) {
          return;
        }

        this.lookupService
          .getCities(governorateId)
          .pipe(catchError(() => of(null)))
          .subscribe((page) => page && this.cities.set(page.data ?? []));
      });

    this.form.controls.city.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((cityId) => {
        this.villages.set([]);
        this.form.controls.village.reset(null, { emitEvent: false });

        if (cityId === null) {
          return;
        }

        this.lookupService
          .getVillages(cityId)
          .pipe(catchError(() => of(null)))
          .subscribe((page) => page && this.villages.set(page.data ?? []));
      });
  }

  onToggleDefaultAddress(useDefault: boolean): void {
    this.useDefaultAddress.set(useDefault);

    const { governorate, city, village } = this.form.controls;
    if (useDefault) {
      governorate.reset(null);
      city.reset(null);
      village.reset(null);
      governorate.clearValidators();
      city.clearValidators();
      village.clearValidators();
    } else {
      governorate.setValidators(Validators.required);
      city.setValidators(Validators.required);
      village.setValidators(Validators.required);
    }
    governorate.updateValueAndValidity();
    city.updateValueAndValidity();
    village.updateValueAndValidity();
  }

  private wireNationalIdAutofill(): void {
    this.form.controls.nationalId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.derivedBirthDate.set(extractBirthDateFromNationalId(value));
        this.derivedGender.set(extractGenderFromNationalId(value));
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const birthDate = this.derivedBirthDate();
    const gender = this.derivedGender();
    if (!birthDate || !gender) {
      this.form.controls.nationalId.markAsTouched();
      return;
    }

    this.outcome.set("idle");
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const payload: RegisterRequest = {
      nationalId: Number(raw.nationalId),
      name: { arabic: raw.arabicName, english: "" },
      address: this.useDefaultAddress()
        ? DEFAULT_ADDRESS
        : {
            governorate: raw.governorate!,
            city: raw.city!,
            village: raw.village!,
            details: ``,
          },
      contact: {
        email: raw.email,
        mobileNumber: raw.mobileNumber,
        otherMobileNumber: "",
      },
      birthDate: this.toIsoDate(birthDate),
      gender,
      password: raw.password,
    };

    this.registerService.register(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);

        if (res.code === RegisterResponseCode.RegistrationRequestCreated) {
          this.resultMessage.set(res.message?.arabic ?? "");
          this.outcome.set("pendingApproval");
          return;
        }

        this.resultMessage.set(res.message?.arabic ?? "تم إنشاء الحساب بنجاح.");
        this.outcome.set("success");
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);

        const body = error.error;
        if (body?.code === RegisterResponseCode.NationalIdAlreadyRegistered) {
          this.resultMessage.set(
            body.message?.arabic ?? "الرقم القومي مسجل بالفعل.",
          );
          this.outcome.set("duplicateNationalId");
        }
      },
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl("/login");
  }

  goToResetPassword(): void {
    this.router.navigateByUrl("/reset-password");
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
