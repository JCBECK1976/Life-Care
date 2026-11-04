export const DEFAULT_MEDS = [
  "Levothyroxine", "Atorvastatin", "Simvastatin", "Rosuvastatin", "Citalopram",
  "Sertraline", "Fluoxetine", "Metformin", "Ramipril", "Amlodipine",
  "Omeprazole", "Lansoprazole", "Ezetimibe", "Lisinopril", "Bisoprolol",
];

export const DEFAULT_SUPPS = [
  "Creatine Monohydrate", "Collagen + Vitamin C", "Protein Shake",
  "Vitamin D", "Omega 3", "Magnesium", "Zinc", "Iron", "B12",
  "Multivitamin", "Probiotics", "Glucosamine", "CoQ10", "Turmeric",
];

export const IDEALS = { jc: 13.43, becks: 11.14 };

export const BLOOD_TESTS = [
  { group: "Thyroid Function", tests: [
    { key: "tsh", name: "TSH", unit: "mIU/L", lo: 0.3, hi: 4.2 },
    { key: "freeT4", name: "Free T4", unit: "pmol/L", lo: 10.0, hi: 22.0 },
    { key: "freeT3", name: "Free T3", unit: "pmol/L", lo: 3.1, hi: 6.8 },
  ]},
  { group: "Lipid Profile", tests: [
    { key: "totalChol", name: "Total Cholesterol", unit: "mmol/L" },
    { key: "ldl", name: "LDL", unit: "mmol/L" },
    { key: "hdl", name: "HDL", unit: "mmol/L" },
    { key: "triglycerides", name: "Triglycerides", unit: "mmol/L", lo: 0.4, hi: 1.8 },
    { key: "cholRatio", name: "Cholesterol/HDL Ratio", unit: "" },
    { key: "nonHdl", name: "Non-HDL", unit: "mmol/L" },
  ]},
  { group: "Metabolic", tests: [
    { key: "hba1c", name: "HbA1c", unit: "mmol/mol" },
    { key: "egfr", name: "eGFR", unit: "mL/min" },
  ]},
  { group: "Other", tests: [
    { key: "ck", name: "CK (Creatine Kinase)", unit: "U/L" },
  ]},
];
