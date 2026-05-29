type SeedExercise = {
  name: string;
  muscle_group: string;
  equipment: string;
};

export const EXERCISE_SEED: SeedExercise[] = [
  // Chest
  { name: 'Barbell Bench Press',        muscle_group: 'Chest',      equipment: 'Barbell'    },
  { name: 'Incline Barbell Press',       muscle_group: 'Chest',      equipment: 'Barbell'    },
  { name: 'Decline Barbell Press',       muscle_group: 'Chest',      equipment: 'Barbell'    },
  { name: 'Incline Dumbbell Press',      muscle_group: 'Chest',      equipment: 'Dumbbell'   },
  { name: 'Dumbbell Fly',               muscle_group: 'Chest',      equipment: 'Dumbbell'   },
  { name: 'Cable Fly',                  muscle_group: 'Chest',      equipment: 'Cable'      },
  { name: 'Chest Dip',                  muscle_group: 'Chest',      equipment: 'Bodyweight' },
  { name: 'Push-Up',                    muscle_group: 'Chest',      equipment: 'Bodyweight' },

  // Back
  { name: 'Deadlift',                   muscle_group: 'Back',       equipment: 'Barbell'    },
  { name: 'Barbell Row',                muscle_group: 'Back',       equipment: 'Barbell'    },
  { name: 'Pull-Up',                    muscle_group: 'Back',       equipment: 'Bodyweight' },
  { name: 'Chin-Up',                    muscle_group: 'Back',       equipment: 'Bodyweight' },
  { name: 'Lat Pulldown',               muscle_group: 'Back',       equipment: 'Cable'      },
  { name: 'Seated Cable Row',           muscle_group: 'Back',       equipment: 'Cable'      },
  { name: 'Dumbbell Row',               muscle_group: 'Back',       equipment: 'Dumbbell'   },
  { name: 'Face Pull',                  muscle_group: 'Back',       equipment: 'Cable'      },
  { name: 'Rack Pull',                  muscle_group: 'Back',       equipment: 'Barbell'    },

  // Shoulders
  { name: 'Overhead Press',             muscle_group: 'Shoulders',  equipment: 'Barbell'    },
  { name: 'Dumbbell Shoulder Press',    muscle_group: 'Shoulders',  equipment: 'Dumbbell'   },
  { name: 'Arnold Press',               muscle_group: 'Shoulders',  equipment: 'Dumbbell'   },
  { name: 'Lateral Raise',              muscle_group: 'Shoulders',  equipment: 'Dumbbell'   },
  { name: 'Cable Lateral Raise',        muscle_group: 'Shoulders',  equipment: 'Cable'      },
  { name: 'Rear Delt Fly',              muscle_group: 'Shoulders',  equipment: 'Dumbbell'   },

  // Legs
  { name: 'Barbell Back Squat',         muscle_group: 'Legs',       equipment: 'Barbell'    },
  { name: 'Front Squat',                muscle_group: 'Legs',       equipment: 'Barbell'    },
  { name: 'Romanian Deadlift',          muscle_group: 'Hamstrings', equipment: 'Barbell'    },
  { name: 'Leg Press',                  muscle_group: 'Legs',       equipment: 'Machine'    },
  { name: 'Hack Squat',                 muscle_group: 'Legs',       equipment: 'Machine'    },
  { name: 'Leg Curl',                   muscle_group: 'Hamstrings', equipment: 'Machine'    },
  { name: 'Leg Extension',              muscle_group: 'Quads',      equipment: 'Machine'    },
  { name: 'Walking Lunge',              muscle_group: 'Legs',       equipment: 'Dumbbell'   },
  { name: 'Bulgarian Split Squat',      muscle_group: 'Legs',       equipment: 'Dumbbell'   },
  { name: 'Calf Raise',                 muscle_group: 'Calves',     equipment: 'Machine'    },
  { name: 'Seated Calf Raise',          muscle_group: 'Calves',     equipment: 'Machine'    },
  { name: 'Hip Thrust',                 muscle_group: 'Glutes',     equipment: 'Barbell'    },
  { name: 'Glute Bridge',               muscle_group: 'Glutes',     equipment: 'Bodyweight' },

  // Arms
  { name: 'Barbell Curl',               muscle_group: 'Biceps',     equipment: 'Barbell'    },
  { name: 'Dumbbell Curl',              muscle_group: 'Biceps',     equipment: 'Dumbbell'   },
  { name: 'Hammer Curl',                muscle_group: 'Biceps',     equipment: 'Dumbbell'   },
  { name: 'Preacher Curl',              muscle_group: 'Biceps',     equipment: 'Barbell'    },
  { name: 'Cable Curl',                 muscle_group: 'Biceps',     equipment: 'Cable'      },
  { name: 'Tricep Pushdown',            muscle_group: 'Triceps',    equipment: 'Cable'      },
  { name: 'Skull Crusher',              muscle_group: 'Triceps',    equipment: 'Barbell'    },
  { name: 'Overhead Tricep Extension',  muscle_group: 'Triceps',    equipment: 'Dumbbell'   },
  { name: 'Tricep Dip',                 muscle_group: 'Triceps',    equipment: 'Bodyweight' },
  { name: 'Close-Grip Bench Press',     muscle_group: 'Triceps',    equipment: 'Barbell'    },

  // Core
  { name: 'Plank',                      muscle_group: 'Core',       equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise',          muscle_group: 'Core',       equipment: 'Bodyweight' },
  { name: 'Cable Crunch',               muscle_group: 'Core',       equipment: 'Cable'      },
  { name: 'Ab Wheel Rollout',           muscle_group: 'Core',       equipment: 'Other'      },
  { name: 'Russian Twist',              muscle_group: 'Core',       equipment: 'Bodyweight' },
];
