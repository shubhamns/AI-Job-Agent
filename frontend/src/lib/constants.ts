export const defaultPreferenceForm = {
  desired_titles: "",
  preferred_locations: "Bangalore, Mumbai, Hyderabad, Remote India",
  remote_preference: "remote-first",
  employment_types: "permanent",
  required_excluded_technologies: "",
  preferred_excluded_technologies: "",
  salary_min: "",
  salary_currency: "INR",
};

export type JobFilters = {
  search: string;
  sortBy: "score" | "recent" | "salary";
  minScore: number;
  includeSkipped: boolean;
  remoteTypes: string;
};

export const defaultJobFilters: JobFilters = {
  search: "",
  sortBy: "score",
  minScore: 0,
  includeSkipped: false,
  remoteTypes: "",
};
