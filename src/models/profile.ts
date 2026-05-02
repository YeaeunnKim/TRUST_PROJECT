export type Profile = {
  name: string;
  age: string;
  relationshipStartDate: string; // YYYY-MM-DD
  photoUri?: string;
};

export const emptyProfile: Profile = {
  name: '',
  age: '',
  relationshipStartDate: '',
  photoUri: undefined,
};
