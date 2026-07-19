import * as XLSX from 'xlsx';
import { UserListItem } from '../../features/users/models/user.model';
import { ParticipantListItem } from '../../features/competitions/models/participant.model';

const PARTICIPANT_COLUMN_HEADERS = [
  'رقم المشارك',
  'الاسم بالعربية',
  'الاسم بالإنجليزية',
  'الرقم القومي',
  'رقم الهاتف',
  'المستوى',
  'المعلم',
  'المكان',
  'عدد الأجزاء',
  'التقييم',
] as const;

export function exportParticipantsToExcel(participants: ParticipantListItem[], filename = 'المشاركون.xlsx'): void {
  const rows = participants.map((participant) => ({
    [PARTICIPANT_COLUMN_HEADERS[0]]: participant.id,
    [PARTICIPANT_COLUMN_HEADERS[1]]: participant.user?.name?.arabic ?? '',
    [PARTICIPANT_COLUMN_HEADERS[2]]: participant.user?.name?.english ?? '',
    [PARTICIPANT_COLUMN_HEADERS[3]]: participant.user?.nationalId ?? '',
    [PARTICIPANT_COLUMN_HEADERS[4]]: participant.user?.mobileNumber ?? '',
    [PARTICIPANT_COLUMN_HEADERS[5]]: participant.level?.name?.arabic ?? '',
    [PARTICIPANT_COLUMN_HEADERS[6]]: participant.instructor?.name?.arabic ?? '',
    [PARTICIPANT_COLUMN_HEADERS[7]]: participant.place?.name?.arabic ?? '',
    [PARTICIPANT_COLUMN_HEADERS[8]]: participant.partsCount ?? '',
    [PARTICIPANT_COLUMN_HEADERS[9]]: participant.score ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...PARTICIPANT_COLUMN_HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المشاركون');
  XLSX.writeFile(workbook, filename);
}

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
