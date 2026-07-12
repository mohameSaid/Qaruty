import { Gender } from "../../features/users/models/user.model";

/**
 * Egyptian National IDs encode the holder's birth date in the first 7 digits:
 * digit 1 = century (2 -> 1900s, 3 -> 2000s), digits 2-3 = year, 4-5 = month, 6-7 = day.
 */
export function extractBirthDateFromNationalId(nationalId: string | number): Date | null {
  const id = nationalId.toString().trim();

  if (!/^\d{14}$/.test(id)) {
    return null;
  }

  const centuryDigit = Number(id.charAt(0));
  const year = Number(id.substring(1, 3));
  const month = Number(id.substring(3, 5));
  const day = Number(id.substring(5, 7));

  let century: number;

  switch (centuryDigit) {
    case 2:
      century = 1900;
      break;
    case 3:
      century = 2000;
      break;
    default:
      return null;
  }

  const fullYear = century + year;

  const birthDate = new Date(fullYear, month - 1, day);

  // Validate the generated date
  if (
    birthDate.getFullYear() !== fullYear ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  return birthDate;
}


export function extractGenderFromNationalId(nationalId: string | number): Gender | null {

  const genderDigit = Number(nationalId.toString().trim().charAt(12));

        const male = genderDigit % 2 == 1;

        return male ? Gender.Male : Gender.Female;
}