import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { ApiEnvelope, PagedData } from "../models/api-response.model";
import {
  CreateUserRequest,
  CreateUserResult,
  PersonMatch,
  UpdateUserRequest,
  UserDetail,
  UserFilters,
  UserListItem,
} from "../models/user.model";

export interface GetUsersOptions {
  pageNo: number;
  size: number;
  sortColumn: string;
  sortDirection: "ASC" | "DESC";
  /** Optional advanced-search criteria — see `UserFilters` for the param-naming caveat. */
  filters?: UserFilters;
}

@Injectable({ providedIn: "root" })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/user`;

  getUsers(options: GetUsersOptions): Observable<PagedData<UserListItem>> {
    let params = new HttpParams()
      .set("page.pageNo", options.pageNo)
      .set("page.size", options.size)
      .set("sort.column", options.sortColumn)
      .set("sort.direction", options.sortDirection);

    params = this.applyFilterParams(params, options.filters);

    return this.http
      .get<ApiEnvelope<PagedData<UserListItem>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Appends `filters.*` query params for advanced search. See the `UserFilters`
   * doc comment — this param naming follows the codebase's one confirmed
   * `filters.*` example (`filters.student.id` in CompetitionService) but was not
   * independently verified against the live `GET /user` endpoint.
   */
  private applyFilterParams(
    params: HttpParams,
    filters: UserFilters | undefined,
  ): HttpParams {
    if (!filters) {
      return params;
    }
    if (filters.nationalId) {
      params = params.set("filters.nationalId", filters.nationalId);
    }
    if (filters.arabicName) {
      // params = params.set("filters.name.arabic", filters.arabicName);
      params = params.set("search.columnValues", filters.arabicName);
      params = params.set("search.columnNames", "name.arName");
    }
    if (filters.englishName) {
      params = params.set("filters.name.english", filters.englishName);
    }
    if (filters.mobileNumber) {
      params = params.set("filters.contact.mobileNumber", filters.mobileNumber);
    }
    if (filters.email) {
      params = params.set("filters.contact.email", filters.email);
    }
    if (filters.gender) {
      params = params.set("filters.gender.id", filters.gender);
    }
    return params;
  }

  getUserByNationalId(nationalId: string): Observable<UserDetail> {
    return this.http
      .get<ApiEnvelope<UserDetail>>(`${this.baseUrl}/${nationalId}`)
      .pipe(map((res) => res.data));
  }

  getFathers(): Observable<UserListItem[]> {
    return this.http
      .get<ApiEnvelope<UserListItem[] | PagedData<UserListItem>>>(`${this.baseUrl}/father`)
      .pipe(map((res) => this.toFlatList(res.data)));
  }

  getMothers(): Observable<UserListItem[]> {
    return this.http
      .get<ApiEnvelope<UserListItem[] | PagedData<UserListItem>>>(`${this.baseUrl}/mother`)
      .pipe(map((res) => this.toFlatList(res.data)));
  }

  /**
   * `/father` and `/mother` weren't confirmed against a live paged response like the rest of this
   * service's list endpoints — this normalizes either a bare array or the usual `{ data, totalRecords }`
   * envelope so a shape mismatch can't crash callers with "list.filter is not a function".
   */
  private toFlatList<T>(data: T[] | PagedData<T>): T[] {
    return Array.isArray(data) ? data : (data?.data ?? []);
  }

  createUser(payload: CreateUserRequest): Observable<CreateUserResult> {
    return this.http
      .post<
        ApiEnvelope<UserDetail | PagedData<PersonMatch>>
      >(this.baseUrl, payload)
      .pipe(
        map((res) => this.toCreateUserResult(res.data, res.message?.english)),
      );
  }

  /** Distinguishes "possible duplicates found" (paged `PersonMatch[]`) from a plain created `UserDetail`. */
  private toCreateUserResult(
    data: UserDetail | PagedData<PersonMatch>,
    returnedMessge: string,
  ): CreateUserResult {
    if (
      data &&
      Array.isArray((data as PagedData<PersonMatch>).data) &&
      returnedMessge === "There are similar for this name."
    ) {
      return {
        kind: "similar",
        matches: (data as PagedData<PersonMatch>).data,
      };
    }
    return {
      kind: "created",
      person: (data as PagedData<UserDetail>).data[0],
    };
  }

  updateUser(id: number, payload: UpdateUserRequest): Observable<UserDetail> {
    return this.http
      .put<ApiEnvelope<UserDetail>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  deleteUser(id: number, type: "SOFT" | "HARD"): Observable<void> {
    const params = new HttpParams().set("type", type);
    return this.http
      .delete<ApiEnvelope<void>>(`${this.baseUrl}/${id}`, { params })
      .pipe(map(() => undefined));
  }
}
