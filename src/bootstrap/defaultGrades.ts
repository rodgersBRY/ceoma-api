export type BootstrapGradeSeed = {
  code: string;
  description: string;
};

export const bootstrapGrades: BootstrapGradeSeed[] = [
  { code: "E", description: "Elephant bean — extra large screen 20+" },
  { code: "AA", description: "Large bean — screen 18 and above" },
  { code: "AB", description: "Medium bean — screen 15/16/17 blend" },
  { code: "C", description: "Small bean — screen 14 and below" },
  { code: "PB", description: "Peaberry — single round bean" },
  { code: "TT", description: "Light beans recovered from AA/AB grading" },
  { code: "T", description: "Light beans recovered from C grading" },
  { code: "MH", description: "Mbuni Heavy — dry processed natural coffee" },
  {
    code: "ML",
    description: "Mbuni Light — dry processed natural coffee, lighter density",
  },
];
