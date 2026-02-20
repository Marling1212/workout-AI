export type Lang = "en" | "zh";
export type TranslationKey = keyof (typeof translations)["en"];

export const translations: Record<
  Lang,
  {
    appTitle: string;
    appTagline: string;
    goalDescriptionLabel: string;
    goalDescriptionPlaceholder: string;
    goalDescriptionHint: string;
    equipment: string;
    equipmentBodyweight: string;
    equipmentDumbbells: string;
    equipmentFullGym: string;
    timeAvailable: string;
    min: string;
    timeRange: string;
    generateButton: string;
    buildingWorkout: string;
    warmup: string;
    mainWorkout: string;
    cooldown: string;
    sets: string;
    reps: string;
    rest: string;
    startWorkout: string;
    generateAnother: string;
    estimatedDuration: string;
    matchedToTarget: string;
    playerWork: string;
    playerRest: string;
    playerNext: string;
    playerPlay: string;
    playerPause: string;
    playerSkip: string;
    playerGetReady: string;
    setOf: string;
    errorFailed: string;
    errorGeneric: string;
    footerTailored: string;
    howToExercise: string;
    generalFitness: string;
  }
> = {
  en: {
    appTitle: "Workout Generator",
    appTagline: "Personalized routines for your goals and schedule",
    goalDescriptionLabel: "Describe your goal or problem",
    goalDescriptionPlaceholder: "e.g. I have lower back pain from sitting all day, I want to run my first 5K, I don't know what to train—just want to feel stronger, weak knees need to be careful",
    goalDescriptionHint: "The AI will figure out what to train based on your description.",
    equipment: "Equipment Available",
    equipmentBodyweight: "Bodyweight Only",
    equipmentDumbbells: "Dumbbells / Bands",
    equipmentFullGym: "Full Gym",
    timeAvailable: "Time Available",
    min: "min",
    timeRange: "15 min – 120 min",
    generateButton: "Generate My Workout",
    buildingWorkout: "Building your workout...",
    warmup: "Warmup",
    mainWorkout: "Main Workout",
    cooldown: "Cooldown",
    sets: "sets",
    reps: "reps",
    rest: "Rest",
    startWorkout: "Start Workout",
    generateAnother: "Generate Another Workout",
    estimatedDuration: "Estimated duration",
    matchedToTarget: "matched to your {min} min target",
    playerWork: "Work",
    playerRest: "Rest",
    playerNext: "Next",
    playerPlay: "Play",
    playerPause: "Pause",
    playerSkip: "Skip",
    playerGetReady: "Get ready for",
    setOf: "Set {n} of {total}",
    errorFailed: "Failed to generate workout",
    errorGeneric: "Something went wrong",
    footerTailored: "Your workout will be tailored to your selected preferences",
    howToExercise: "Look up how to do this exercise",
    generalFitness: "General fitness",
  },
  zh: {
    appTitle: "我的健身 AI",
    appTagline: "依目標與時間為你規劃專屬課表",
    goalDescriptionLabel: "描述你的目標或狀況",
    goalDescriptionPlaceholder: "例如：久坐腰痠想改善、想跑第一次 5K、不確定要練什麼只想變健康、膝蓋不好要避開跳躍",
    goalDescriptionHint: "AI 會依你的描述決定要練哪些部位與類型。",
    equipment: "可用器材",
    equipmentBodyweight: "徒手",
    equipmentDumbbells: "啞鈴 / 彈力帶",
    equipmentFullGym: "完整健身房",
    timeAvailable: "可用時間",
    min: "分鐘",
    timeRange: "15 – 120 分鐘",
    generateButton: "生成我的課表",
    buildingWorkout: "正在生成課表...",
    warmup: "熱身",
    mainWorkout: "主課表",
    cooldown: "收操",
    sets: "組",
    reps: "次",
    rest: "休息",
    startWorkout: "開始訓練",
    generateAnother: "重新生成課表",
    estimatedDuration: "預估時長",
    matchedToTarget: "已對齊你的 {min} 分鐘目標",
    playerWork: "訓練",
    playerRest: "休息",
    playerNext: "下一項",
    playerPlay: "開始",
    playerPause: "暫停",
    playerSkip: "跳過",
    playerGetReady: "準備：",
    setOf: "第 {n} / {total} 組",
    errorFailed: "生成課表失敗",
    errorGeneric: "發生錯誤",
    footerTailored: "課表將依你的選擇客製化",
    howToExercise: "查詢此動作做法",
    generalFitness: "一般體能",
  },
};
