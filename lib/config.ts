// Valid campuses for the location-based system
// These are the only campuses that will be shown in the locations module and job orders
export const VALID_CAMPUSES = ['Main Campus', 'AJA Complex'] as const;

export type ValidCampus = typeof VALID_CAMPUSES[number];

export const isValidCampus = (campus: string): campus is ValidCampus => {
  return VALID_CAMPUSES.includes(campus as ValidCampus);
};

