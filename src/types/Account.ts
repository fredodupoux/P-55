export interface Account {
  id: number;
  name: string;
  username: string;
  password: string;
  website: string;
  notes: string;
  // Adding new fields for compatibility with PrintablePasswordTable
  url?: string;
  lastModified?: number;
}
