/** Maps RPC exception codes (raised via `raise exception '<CODE>'` in Postgres) to Arabic UI messages. */
export const KHATMAH_ERROR_MESSAGES: Record<string, string> = {
  KHATMAH_CLOSED: 'هذه الختمة مغلقة حاليًا.',
  INVALID_DISPLAY_NAME: 'الرجاء إدخال اسم صحيح.',
  INVALID_TITLE: 'الرجاء إدخال عنوان صحيح للختمة.',
  SLUG_GENERATION_FAILED: 'حدث خطأ أثناء إنشاء رابط الختمة، حاول مرة أخرى.',
  PART_UNAVAILABLE: 'تم حجز هذا الجزء للتو من مشارك آخر.',
  NOT_YOUR_RESERVATION: 'هذا الجزء غير محجوز باسمك.',
  WRONG_STATE: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية للجزء.',
  FORBIDDEN: 'لا تملك صلاحية تنفيذ هذا الإجراء.',
  ALREADY_CLOSED: 'الختمة مغلقة بالفعل.',
};

export function getKhatmahErrorMessage(error: unknown): string {
  const code = extractErrorCode(error);
  return (code && KHATMAH_ERROR_MESSAGES[code]) || 'حدث خطأ غير متوقع، حاول مرة أخرى.';
}

function extractErrorCode(error: unknown): string | null {
  if (!error) return null;
  const message = typeof error === 'string' ? error : (error as { message?: string }).message;
  if (!message) return null;
  const match = Object.keys(KHATMAH_ERROR_MESSAGES).find((code) => message.includes(code));
  return match ?? null;
}
