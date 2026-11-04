// Exercise type definitions: each type has its own metrics and labels
export const EXERCISE_TYPES = {
  weights: { label: "Weights", metric1: "weight", metric1Label: "Weight (kg)", metric2: "reps", metric2Label: "Reps", hasSets: true, defaultSets: 3, defaultM1: "0kg", defaultM2: "10", progKey: "w", progKey2: "r", chartLabel1: "Weight (kg)", chartLabel2: "Set Total (kg)" },
  bodyweight: { label: "Bodyweight", metric1: "none", metric1Label: "", metric2: "reps", metric2Label: "Reps", hasSets: true, defaultSets: 3, defaultM1: "BW", defaultM2: "10", progKey: "w", progKey2: "r", chartLabel1: "Reps per set", chartLabel2: "Total reps" },
  timed_hold: { label: "Timed Hold", metric1: "none", metric1Label: "", metric2: "duration", metric2Label: "Duration (sec)", hasSets: true, defaultSets: 3, defaultM1: "BW", defaultM2: "30", progKey: "w", progKey2: "r", chartLabel1: "Hold (sec)", chartLabel2: "Total (sec)" },
  cardio: { label: "Cardio", metric1: "duration", metric1Label: "Duration (min)", metric2: "distance", metric2Label: "Distance (km)", hasSets: false, defaultSets: 1, defaultM1: "20", defaultM2: "0", progKey: "w", progKey2: "r", chartLabel1: "Duration (min)", chartLabel2: "Distance (km)" },
  walking: { label: "Walking", metric1: "duration", metric1Label: "Duration (min)", metric2: "distance", metric2Label: "Distance (km)", hasSets: false, defaultSets: 1, defaultM1: "30", defaultM2: "0", progKey: "w", progKey2: "r", chartLabel1: "Duration (min)", chartLabel2: "Distance (km)" },
  sports: { label: "Sports/Activity", metric1: "duration", metric1Label: "Duration (min)", metric2: "none", metric2Label: "", hasSets: false, defaultSets: 1, defaultM1: "60", defaultM2: "", progKey: "w", progKey2: "r", chartLabel1: "Duration (min)", chartLabel2: "" },
  stretching: { label: "Stretching/Mobility", metric1: "none", metric1Label: "", metric2: "duration", metric2Label: "Duration (sec)", hasSets: true, defaultSets: 3, defaultM1: "BW", defaultM2: "30", progKey: "w", progKey2: "r", chartLabel1: "Hold (sec)", chartLabel2: "Total (sec)" }
};

// Comprehensive exercise database with type metadata
export const EXERCISE_DATABASE = [
  // Weights — Machine/Cable
  { name: "Leg Extension", type: "weights", category: "Legs" },
  { name: "Leg Press", type: "weights", category: "Legs" },
  { name: "Leg Curl", type: "weights", category: "Legs" },
  { name: "Standing Calf Raise", type: "weights", category: "Calves" },
  { name: "Single Leg Calf Raise", type: "weights", category: "Calves" },
  { name: "Seated Calf Raise", type: "weights", category: "Calves" },
  { name: "Squat Row", type: "weights", category: "Compound" },
  { name: "Cable Crunch", type: "weights", category: "Core" },
  { name: "Chest Press", type: "weights", category: "Chest" },
  { name: "Lat Pulldown", type: "weights", category: "Back" },
  { name: "Shoulder Press", type: "weights", category: "Shoulders" },
  { name: "Seated Cable Row", type: "weights", category: "Back" },
  { name: "Butterfly", type: "weights", category: "Chest" },
  { name: "Lateral Raise", type: "weights", category: "Shoulders" },
  { name: "Bicep Curl", type: "weights", category: "Arms" },
  { name: "Tricep Pushdown", type: "weights", category: "Arms" },
  { name: "Face Pull", type: "weights", category: "Back" },
  { name: "Upright Row", type: "weights", category: "Shoulders" },
  { name: "Single Arm Curl", type: "weights", category: "Arms" },
  { name: "Reverse Fly", type: "weights", category: "Back" },
  { name: "Cable Crossover", type: "weights", category: "Chest" },
  { name: "Hammer Curl", type: "weights", category: "Arms" },
  { name: "Overhead Tricep Extension", type: "weights", category: "Arms" },
  // Weights — Free weights
  { name: "Dumbbell Bench Press", type: "weights", category: "Chest" },
  { name: "Dumbbell Row", type: "weights", category: "Back" },
  { name: "Dumbbell Shoulder Press", type: "weights", category: "Shoulders" },
  { name: "Dumbbell Lateral Raise", type: "weights", category: "Shoulders" },
  { name: "Dumbbell Bicep Curl", type: "weights", category: "Arms" },
  { name: "Barbell Squat", type: "weights", category: "Legs" },
  { name: "Barbell Deadlift", type: "weights", category: "Compound" },
  { name: "Barbell Row", type: "weights", category: "Back" },
  // Bodyweight
  { name: "Push Up", type: "bodyweight", category: "Chest" },
  { name: "Pull Up", type: "bodyweight", category: "Back" },
  { name: "Chin Up", type: "bodyweight", category: "Back" },
  { name: "Dip", type: "bodyweight", category: "Arms" },
  { name: "Bodyweight Squat", type: "bodyweight", category: "Legs" },
  { name: "Lunge", type: "bodyweight", category: "Legs" },
  { name: "Step Up", type: "bodyweight", category: "Legs" },
  { name: "Glute Bridge", type: "bodyweight", category: "Legs" },
  { name: "Crunch", type: "bodyweight", category: "Core" },
  { name: "Sit Up", type: "bodyweight", category: "Core" },
  { name: "Leg Raise", type: "bodyweight", category: "Core" },
  { name: "Mountain Climber", type: "bodyweight", category: "Core" },
  { name: "Burpee", type: "bodyweight", category: "Compound" },
  { name: "Jumping Jack", type: "bodyweight", category: "Cardio" },
  // Timed holds
  { name: "Plank", type: "timed_hold", category: "Core" },
  { name: "Side Plank", type: "timed_hold", category: "Core" },
  { name: "Wall Sit", type: "timed_hold", category: "Legs" },
  { name: "Dead Hang", type: "timed_hold", category: "Back" },
  { name: "Hollow Hold", type: "timed_hold", category: "Core" },
  // Cardio
  { name: "Running", type: "cardio", category: "Cardio" },
  { name: "Cycling", type: "cardio", category: "Cardio" },
  { name: "Rowing Machine", type: "cardio", category: "Cardio" },
  { name: "Cross Trainer", type: "cardio", category: "Cardio" },
  { name: "Stair Climber", type: "cardio", category: "Cardio" },
  { name: "Skipping Rope", type: "cardio", category: "Cardio" },
  { name: "Swimming", type: "cardio", category: "Cardio" },
  // Walking
  { name: "Walking", type: "walking", category: "Walking" },
  { name: "Dog Walking", type: "walking", category: "Walking" },
  { name: "Hiking", type: "walking", category: "Walking" },
  // Sports
  { name: "Football", type: "sports", category: "Sports" },
  { name: "Tennis", type: "sports", category: "Sports" },
  { name: "Badminton", type: "sports", category: "Sports" },
  { name: "Basketball", type: "sports", category: "Sports" },
  { name: "Golf", type: "sports", category: "Sports" },
  { name: "Yoga", type: "sports", category: "Sports" },
  { name: "Pilates", type: "sports", category: "Sports" },
  // Stretching/Mobility
  { name: "Hamstring Stretch", type: "stretching", category: "Stretching" },
  { name: "Quad Stretch", type: "stretching", category: "Stretching" },
  { name: "Hip Flexor Stretch", type: "stretching", category: "Stretching" },
  { name: "Shoulder Stretch", type: "stretching", category: "Stretching" },
  { name: "Cat-Cow Stretch", type: "stretching", category: "Stretching" },
  { name: "Foam Rolling", type: "stretching", category: "Stretching" }
];

// Backwards-compatible: extract just names for existing code that uses allExNames
export const DEFAULT_EXERCISES = EXERCISE_DATABASE.map(function(e) { return e.name; });

export const PIN_WEIGHTS = [9, 16, 22, 29, 36, 42, 49, 55, 62, 68, 75, 81, 87, 90];
