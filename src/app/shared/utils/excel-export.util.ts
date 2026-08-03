import * as XLSX from 'xlsx';
import { UserListItem } from '../../features/users/models/user.model';

const COLUMN_HEADERS = [
  'المعرف',
  'الرقم القومي',
  'الاسم بالعربية',
  'الاسم بالإنجليزية',
  'تاريخ الميلاد',
  'البريد الإلكتروني',
  'رقم الهاتف',
  'رقم هاتف آخر',
] as const;

export function exportUsersToExcel(users: UserListItem[], filename = 'المستخدمون.xlsx'): void {
  const rows = users.map((user) => ({
    [COLUMN_HEADERS[0]]: user.id,
    [COLUMN_HEADERS[1]]: user.nationalId ?? '',
    [COLUMN_HEADERS[2]]: user.name.arabic ?? '',
    [COLUMN_HEADERS[3]]: user.name.english ?? '',
    [COLUMN_HEADERS[4]]: user.birthDate ?? '',
    [COLUMN_HEADERS[5]]: user.email ?? '',
    [COLUMN_HEADERS[6]]: user.mobileNumber ?? '',
    [COLUMN_HEADERS[7]]: user.otherMobileNumber ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...COLUMN_HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المستخدمون');
  XLSX.writeFile(workbook, filename);
}
