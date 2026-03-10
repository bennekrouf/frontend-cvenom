// src/types/cvFormData.ts
// Unified CV data model used by the form editor.
// Mirrors the Rust CvFormData struct in backend-cvenom/src/web/handlers/cv_handlers/cv_data.rs

export interface PersonalData {
  name: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
}

export interface LinksData {
  github: string;
  linkedin: string;
  website: string;
}

export interface EducationEntry {
  title: string;
  date: string;
  location: string;
}

export interface LanguagesData {
  native: string[];
  fluent: string[];
  intermediate: string[];
  basic: string[];
}

export interface WorkExperienceEntry {
  company: string;
  title: string;
  date: string;
  description: string;
  responsibilities: string[];
  technologies: string[];
}

export interface StylingData {
  primary_color: string;
  secondary_color: string;
}

export interface CvFormData {
  personal: PersonalData;
  links: LinksData;
  /** skill category name → list of skills */
  skills: Record<string, string[]>;
  education: EducationEntry[];
  languages: LanguagesData;
  work_experience: WorkExperienceEntry[];
  styling: StylingData;
}

/** Empty/default CV form data to use as initial state */
export const emptyCvFormData = (): CvFormData => ({
  personal: { name: '', title: '', email: '', phone: '', address: '', summary: '' },
  links:    { github: '', linkedin: '', website: '' },
  skills:   {
    programming_languages: [],
    frameworks: [],
    tools: [],
    technical: [],
  },
  education:       [],
  languages:       { native: [], fluent: [], intermediate: [], basic: [] },
  work_experience: [],
  styling:         { primary_color: '#14A4E6', secondary_color: '#757575' },
});
