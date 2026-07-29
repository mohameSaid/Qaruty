/** All permission strings the backend can return in the login response. */
export enum Permission {
  UsersRead = 'USERS_READ',
  UserCreate = 'USER_CREATE',
  UserUpdate = 'USER_UPDATE',
  UserDelete = 'USER_DELETE',
  UserDeactivate = 'USER_DEACTIVATE',
  UserDetailsRead = 'USER_DETAILS_READ',
  UserFathersRead = 'USER_FATHERS_READ',
  UserMothersRead = 'USER_MOTHERS_READ',

  CompetitionsRead = 'COMPETITIONS_READ',
  CompetitionCreate = 'COMPETITION_CREATE',
  CompetitionUpdate = 'COMPETITION_UPDATE',
  CompetitionDelete = 'COMPETITION_DELETE',
  CompetitionDeactivate = 'COMPETITION_DEACTIVATE',
  CompetitionDetailsRead = 'COMPETITION_DETAILS_READ',

  ParticipantsRead = 'PARTICIPANTS_READ',
  ParticipantCreate = 'PARTICIPANT_CREATE',
  ParticipantUpdate = 'PARTICIPANT_UPDATE',
  ParticipantDelete = 'PARTICIPANT_DELETE',
  ParticipantDeactivate = 'PARTICIPANT_DEACTIVATE',
  ParticipantDetailsRead = 'PARTICIPANT_DETAILS_READ',

  InstructorsRead = 'INSTRUCTORS_READ',
  InstructorCreate = 'INSTRUCTOR_CREATE',
  InstructorUpdate = 'INSTRUCTOR_UPDATE',
  InstructorDelete = 'INSTRUCTOR_DELETE',
  InstructorDeactivate = 'INSTRUCTOR_DEACTIVATE',
  InstructorDetailsRead = 'INSTRUCTOR_DETAILS_READ',

  EducationPlacesRead = 'EDUCATION_PLACES_READ',
  EducationPlaceCreate = 'EDUCATION_PLACE_CREATE',
  EducationPlaceUpdate = 'EDUCATION_PLACE_UPDATE',
  EducationPlaceDelete = 'EDUCATION_PLACE_DELETE',
  EducationPlaceDeactivate = 'EDUCATION_PLACE_DEACTIVATE',
  EducationPlaceDetailsRead = 'EDUCATION_PLACE_DETAILS_READ',

  dashboard = 'DASHBOARD_ACCESS',
  systemCodesRead = 'SYSTEM_CODES_READ',
  systemCodesUpdate = 'SYSTEM_CODES_UPDATE',
  systemCodesCreate = 'SYSTEM_CODES_CREATE',
  systemCodesDelete = 'SYSTEM_CODES_DELETE',

}
