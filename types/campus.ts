// types/campus.ts

export type YearLevel =
  | "Grade 7"
  | "Grade 8"
  | "Grade 9"
  | "Grade 10"
  | "Grade 11"
  | "Grade 12"
  | "1st Year"
  | "2nd Year"
  | "3rd Year"
  | "4th Year";

export type Campus =
  | "Binalbagan Catholic College - JHS Campus"
  | "Binalbagan Catholic College - Main Campus";

export const YEAR_LEVELS: YearLevel[] = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export const CAMPUSES: Campus[] = [
  "Binalbagan Catholic College - JHS Campus",
  "Binalbagan Catholic College - Main Campus",
];

// Map year level to campus
export function getCampusForYearLevel(yearLevel: YearLevel | ""): Campus | "" {
  const jhsLevels: YearLevel[] = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  const mainLevels: YearLevel[] = [
    "Grade 11",
    "Grade 12",
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
  ];

  if (!yearLevel) return "";
  if (jhsLevels.includes(yearLevel as YearLevel))
    return "Binalbagan Catholic College - JHS Campus";
  if (mainLevels.includes(yearLevel as YearLevel))
    return "Binalbagan Catholic College - Main Campus";
  return "";
}
