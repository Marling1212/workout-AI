"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_WORK_SECONDS = 30;

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Fallback: no-op if AudioContext unavailable
  }
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
const DEFAULT_REST_SECONDS = 30;

function parseTimeToSeconds(str: string): number {
  if (!str || typeof str !== "string") return DEFAULT_REST_SECONDS;
  const s = str.trim().toLowerCase();
  const num = parseInt(s.replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 0) return DEFAULT_REST_SECONDS;
  return s.includes("min") ? num * 60 : num;
}

interface WorkoutInterval {
  type: "work" | "rest";
  durationSeconds: number;
  exercise: string;
  setIndex: number;
  totalSets: number;
}

function buildIntervals(
  mainWorkout: WorkoutExercise[],
  targetMinutes?: number
): WorkoutInterval[] {
  const intervals: WorkoutInterval[] = [];
  let totalRestSec = 0;
  let numWorkIntervals = 0;
  for (const ex of mainWorkout) {
    const restSec = parseTimeToSeconds(ex.rest_time);
    for (let s = 0; s < ex.sets; s++) {
      numWorkIntervals++;
      totalRestSec += restSec;
    }
  }
  const targetTotalSec = targetMinutes ? targetMinutes * 60 : null;
  const workSec =
    targetTotalSec && numWorkIntervals > 0
      ? Math.max(15, Math.min(90, Math.round((targetTotalSec - totalRestSec) / numWorkIntervals)))
      : DEFAULT_WORK_SECONDS;

  for (const ex of mainWorkout) {
    const restSec = parseTimeToSeconds(ex.rest_time);
    for (let s = 0; s < ex.sets; s++) {
      intervals.push({
        type: "work",
        durationSeconds: workSec,
        exercise: ex.exercise,
        setIndex: s + 1,
        totalSets: ex.sets,
      });
      intervals.push({
        type: "rest",
        durationSeconds: restSec,
        exercise: ex.exercise,
        setIndex: s + 1,
        totalSets: ex.sets,
      });
    }
  }
  return intervals;
}

function WorkoutPlayer({
  mainWorkout,
  targetMinutes,
  onClose,
}: {
  mainWorkout: WorkoutExercise[];
  targetMinutes?: number;
  onClose: () => void;
}) {
  const intervals = buildIntervals(mainWorkout, targetMinutes);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(
    () => intervals[0]?.durationSeconds ?? 30
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const announcedReadyRef = useRef(false);

  const current = intervals[index];
  const next = intervals[index + 1];

  const resetTimer = useCallback(() => {
    if (current) setSecondsLeft(current.durationSeconds);
  }, [current?.durationSeconds, index]);

  useEffect(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isPlaying || !current || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [isPlaying, current, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && current && index < intervals.length) {
      if (index < intervals.length - 1) {
        const nextIndex = index + 1;
        const nextInterval = intervals[nextIndex];
        setIndex(nextIndex);
        setSecondsLeft(nextInterval?.durationSeconds ?? DEFAULT_REST_SECONDS);
        announcedReadyRef.current = false;
      } else {
        setIsPlaying(false);
      }
    }
  }, [secondsLeft, current, index, intervals]);

  useEffect(() => {
    if (current?.type === "rest" && next?.type === "work" && secondsLeft === 5 && !muted && !announcedReadyRef.current) {
      announcedReadyRef.current = true;
      speak(`Get ready for ${next.exercise}`);
    }
  }, [current?.type, next?.type, next?.exercise, secondsLeft, muted]);

  useEffect(() => {
    if (secondsLeft >= 1 && secondsLeft <= 3 && isPlaying && !muted) {
      playBeep();
    }
  }, [secondsLeft, isPlaying, muted]);

  const handleSkip = () => {
    if (index < intervals.length - 1) {
      announcedReadyRef.current = false;
      const nextIndex = index + 1;
      const nextInterval = intervals[nextIndex];
      setIndex(nextIndex);
      setSecondsLeft(nextInterval?.durationSeconds ?? DEFAULT_REST_SECONDS);
    } else {
      onClose();
    }
  };

  const isWork = current?.type === "work";

  if (intervals.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-500 h-[100dvh] max-h-[100dvh] overflow-hidden ${
        isWork ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-2 z-10">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className={`p-2 rounded-full touch-manipulation transition-colors ${
            muted ? "bg-white/30 text-white" : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white touch-manipulation"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full max-w-lg px-4 py-2 sm:px-6">
        <p className="text-white/90 text-sm sm:text-lg font-medium uppercase tracking-wider mb-1 sm:mb-2 shrink-0">
          {current?.type === "work" ? "Work" : "Rest"}
        </p>
        <p className="text-white text-lg sm:text-2xl md:text-3xl font-display font-bold text-center mb-2 sm:mb-4 min-h-[1.5rem] sm:min-h-[2.5rem] line-clamp-2">
          {current?.exercise}
          {current && (
            <span className="block text-white/80 text-sm sm:text-lg font-normal mt-0.5 sm:mt-1">
              Set {current.setIndex} of {current.totalSets}
            </span>
          )}
        </p>

        <div className="text-[min(28vw,140px)] sm:text-[160px] md:text-[180px] font-display font-black text-white tabular-nums leading-none my-1 sm:my-2 shrink-0">
          {secondsLeft}
        </div>

        {next && (
          <p className="text-white/70 text-xs sm:text-base md:text-lg mb-2 sm:mb-4 line-clamp-2 shrink-0">
            Next: {next.exercise} ({next.type})
          </p>
        )}

        <div className="flex gap-2 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-5 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-white text-surface-900 font-display font-bold text-base sm:text-lg shadow-lg touch-manipulation active:scale-95"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="px-5 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-white/20 hover:bg-white/30 text-white font-display font-bold text-base sm:text-lg touch-manipulation active:scale-95"
          >
            Skip
          </button>
        </div>
      </div>

      <div className="pb-2 sm:pb-4 flex gap-1 overflow-x-auto px-4 max-w-full shrink-0 min-h-[12px]">
        {intervals.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              i < index ? "bg-white/50" : i === index ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const PRIMARY_FOCUS_OPTIONS = [
  { id: "soccer", label: "Soccer Conditioning", emoji: "⚽" },
  { id: "tennis", label: "Tennis Agility", emoji: "🎾" },
  { id: "physique", label: "General Physique / Hypertrophy", emoji: "💪" },
  { id: "other", label: "Other (describe below)", emoji: "✏️" },
] as const;

const EQUIPMENT_OPTIONS = [
  { id: "bodyweight", label: "Bodyweight Only" },
  { id: "dumbbells", label: "Dumbbells / Bands" },
  { id: "full-gym", label: "Full Gym" },
] as const;

interface WorkoutExercise {
  exercise: string;
  sets: number;
  reps: string;
  rest_time: string;
  focus_note: string;
}

interface Workout {
  title: string;
  warmup: string[];
  main_workout: WorkoutExercise[];
  cooldown: string[];
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ChecklistItem({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-xl active:bg-surface-100 dark:active:bg-surface-800/50 transition-colors min-h-[48px] touch-manipulation"
    >
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          checked
            ? "bg-primary-500 border-primary-500"
            : "border-surface-300 dark:border-surface-600"
        }`}
      >
        {checked && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span
        className={`flex-1 ${
          checked
            ? "text-surface-400 dark:text-surface-500 line-through"
            : "text-surface-800 dark:text-surface-200"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

function WorkoutDisplay({
  workout,
  targetMinutes,
  onGenerateAnother,
}: {
  workout: Workout;
  targetMinutes?: number;
  onGenerateAnother: () => void;
}) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [warmupChecked, setWarmupChecked] = useState<Set<number>>(new Set());
  const [cooldownChecked, setCooldownChecked] = useState<Set<number>>(new Set());
  const [exerciseChecked, setExerciseChecked] = useState<Set<number>>(new Set());

  const toggleWarmup = (i: number) =>
    setWarmupChecked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const toggleCooldown = (i: number) =>
    setCooldownChecked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const toggleExercise = (i: number) =>
    setExerciseChecked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="space-y-5 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
      <h2 className="font-display font-bold text-xl sm:text-2xl text-primary-600 dark:text-primary-400 sticky top-0 bg-white dark:bg-surface-900/95 backdrop-blur-sm py-2 -mt-2 z-10">
        {workout.title}
      </h2>

      {/* Warmup Card */}
      <div className="bg-surface-50 dark:bg-surface-800/40 rounded-2xl border border-surface-200/80 dark:border-surface-700/80 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">🔥</span> Warmup
          </h3>
        </div>
        <div className="divide-y divide-surface-200/80 dark:divide-surface-700/80 px-4 pb-2">
          {workout.warmup.map((item, i) => (
            <ChecklistItem
              key={i}
              checked={warmupChecked.has(i)}
              onToggle={() => toggleWarmup(i)}
            >
              {item}
            </ChecklistItem>
          ))}
        </div>
      </div>

      {/* Main Workout Cards */}
      <div>
        <h3 className="font-display font-semibold text-surface-900 dark:text-white mb-3 px-1 flex items-center gap-2">
          <span className="text-lg">💪</span> Main Workout
        </h3>
        <div className="space-y-4">
          {workout.main_workout.map((ex, i) => (
            <div
              key={i}
              className={`rounded-2xl border-2 overflow-hidden transition-all ${
                exerciseChecked.has(i)
                  ? "bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800"
                  : "bg-white dark:bg-surface-800/60 border-surface-200 dark:border-surface-700 shadow-sm"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExercise(i)}
                className="w-full text-left p-4 sm:p-5 min-h-[56px] touch-manipulation flex gap-3 items-start"
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    exerciseChecked.has(i)
                      ? "bg-primary-500 border-primary-500"
                      : "border-surface-300 dark:border-surface-600"
                  }`}
                >
                  {exerciseChecked.has(i) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-display font-semibold text-base sm:text-lg ${
                        exerciseChecked.has(i)
                          ? "text-surface-500 dark:text-surface-400 line-through"
                          : "text-surface-900 dark:text-white"
                      }`}
                    >
                      {ex.exercise}
                    </p>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.exercise + " exercise how to")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 p-1 rounded-lg text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/30 touch-manipulation"
                      title="Look up how to do this exercise"
                      aria-label={`How to do ${ex.exercise}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-bold text-sm">
                      {ex.sets} sets
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-800 dark:text-surface-200 font-bold text-sm">
                      {ex.reps} reps
                    </span>
                    {ex.rest_time && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-bold text-sm">
                        Rest: {ex.rest_time}
                      </span>
                    )}
                  </div>
                  {ex.focus_note && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 italic">
                      {ex.focus_note}
                    </p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cooldown Card */}
      <div className="bg-surface-50 dark:bg-surface-800/40 rounded-2xl border border-surface-200/80 dark:border-surface-700/80 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">🧘</span> Cooldown
          </h3>
        </div>
        <div className="divide-y divide-surface-200/80 dark:divide-surface-700/80 px-4 pb-2">
          {workout.cooldown.map((item, i) => (
            <ChecklistItem
              key={i}
              checked={cooldownChecked.has(i)}
              onToggle={() => toggleCooldown(i)}
            >
              {item}
            </ChecklistItem>
          ))}
        </div>
      </div>

      {targetMinutes && (
        <p className="text-sm text-surface-500 dark:text-surface-400 text-center">
          Estimated duration: ~
          {Math.round(
            buildIntervals(workout.main_workout, targetMinutes).reduce(
              (s, i) => s + i.durationSeconds,
              0
            ) / 60
          )}{" "}
          min (matched to your {targetMinutes} min target)
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowPlayer(true)}
        className="w-full py-4 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-display font-bold text-lg shadow-lg shadow-primary-500/30 active:scale-[0.99] touch-manipulation"
      >
        Start Workout
      </button>

      <button
        type="button"
        onClick={onGenerateAnother}
        className="w-full py-3 px-6 rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:scale-[0.99] font-display font-semibold transition-all touch-manipulation"
      >
        Generate Another Workout
      </button>

      {showPlayer && (
        <WorkoutPlayer
          mainWorkout={workout.main_workout}
          targetMinutes={targetMinutes}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-surface-200 dark:bg-surface-800 rounded w-3/4" />
      <div className="space-y-3">
        <div className="h-16 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="h-16 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="h-16 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="h-16 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="h-16 bg-surface-200 dark:bg-surface-800 rounded-lg" />
      </div>
      <div className="h-6 bg-surface-200 dark:bg-surface-800 rounded w-1/2 mt-6" />
      <div className="space-y-2">
        <div className="h-12 bg-surface-200 dark:bg-surface-800 rounded" />
        <div className="h-12 bg-surface-200 dark:bg-surface-800 rounded" />
      </div>
    </div>
  );
}

export default function Home() {
  const [primaryFocus, setPrimaryFocus] = useState<string>("soccer");
  const [customFocusText, setCustomFocusText] = useState("");
  const [equipment, setEquipment] = useState<string>("bodyweight");
  const [timeAvailable, setTimeAvailable] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [generatedTime, setGeneratedTime] = useState<number>(45);
  const [error, setError] = useState<string | null>(null);

  const getFocusLabel = (id: string) =>
    id === "other"
      ? (customFocusText.trim() || "General fitness")
      : PRIMARY_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id;
  const getEquipmentLabel = (id: string) =>
    EQUIPMENT_OPTIONS.find((o) => o.id === id)?.label ?? id;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setWorkout(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: getFocusLabel(primaryFocus),
          equipment: getEquipmentLabel(equipment),
          time: timeAvailable,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate workout");
      }

      setWorkout(data);
      setGeneratedTime(timeAvailable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAnother = () => {
    setWorkout(null);
    setError(null);
  };

  const showForm = !workout && !isGenerating;
  return (
    <main
      className={`min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-y-auto ${
        showForm ? "justify-center" : "justify-start pt-4"
      }`}
    >
      {/* Background accent */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-surface-900 dark:text-white mb-2 tracking-tight">
            Workout Generator
          </h1>
          <p className="text-surface-800/80 dark:text-surface-200/80 text-lg">
            Personalized routines for your goals and schedule
          </p>
        </header>

        {/* Form Card */}
        <div className="bg-white dark:bg-surface-900/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-surface-900/5 border border-surface-200/50 dark:border-surface-800 p-8 md:p-10">
          {isGenerating ? (
            <div className="py-4">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                  <Spinner />
                  <span className="font-display font-semibold">
                    Building your workout...
                  </span>
                </div>
                <SkeletonLoader />
              </div>
            </div>
          ) : workout ? (
            <WorkoutDisplay
              workout={workout}
              targetMinutes={generatedTime}
              onGenerateAnother={handleGenerateAnother}
            />
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              {/* Primary Focus */}
              <div>
                <label className="block font-display font-semibold text-surface-900 dark:text-white mb-3">
                  Primary Focus
                </label>
                <div className="grid gap-3">
                  {PRIMARY_FOCUS_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${
                          primaryFocus === option.id
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-surface-200 dark:border-surface-800 hover:border-primary-300 dark:hover:border-primary-700 bg-surface-50 dark:bg-surface-800/50"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="primaryFocus"
                        value={option.id}
                        checked={primaryFocus === option.id}
                        onChange={(e) => setPrimaryFocus(e.target.value)}
                        className="sr-only pointer-events-none"
                      />
                      <span className="text-2xl">{option.emoji}</span>
                      <span
                        className={
                          primaryFocus === option.id
                            ? "font-medium text-primary-700 dark:text-primary-300"
                            : "text-surface-700 dark:text-surface-300"
                        }
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {primaryFocus === "other" && (
                  <input
                    type="text"
                    value={customFocusText}
                    onChange={(e) => setCustomFocusText(e.target.value)}
                    placeholder="e.g. Basketball conditioning, Marathon prep, Upper body strength"
                    className="mt-3 w-full px-4 py-3 rounded-xl border-2 border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              </div>

              {/* Equipment */}
              <div>
                <label
                  htmlFor="equipment"
                  className="block font-display font-semibold text-surface-900 dark:text-white mb-3"
                >
                  Equipment Available
                </label>
                <select
                  id="equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 text-surface-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slider */}
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="font-display font-semibold text-surface-900 dark:text-white">
                    Time Available
                  </label>
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                    {timeAvailable} min
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  value={timeAvailable}
                  onChange={(e) => setTimeAvailable(Number(e.target.value))}
                  className="w-full h-2"
                />
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400 mt-1">
                  <span>15 min</span>
                  <span>120 min</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-4 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-display font-bold text-lg shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Generate My Workout
              </button>
            </form>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-6">
          Your workout will be tailored to your selected preferences
        </p>
      </div>
    </main>
  );
}
