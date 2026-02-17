import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an elite strength and conditioning coach. The user will provide their sport/goal, available equipment, and time limit. Generate a highly effective, sport-specific workout. You MUST return ONLY a raw JSON object with this exact structure: {"title": "string", "warmup": ["string", "string"], "main_workout": [{"exercise": "string", "sets": number, "reps": "string", "rest_time": "string", "focus_note": "string"}], "cooldown": ["string"]}.`;

export interface GenerateWorkoutRequest {
  focus: string;
  equipment: string;
  time: number;
}

export interface WorkoutExercise {
  exercise: string;
  sets: number;
  reps: string;
  rest_time: string;
  focus_note: string;
}

export interface WorkoutResponse {
  title: string;
  warmup: string[];
  main_workout: WorkoutExercise[];
  cooldown: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const body: GenerateWorkoutRequest = await request.json();
    const { focus, equipment, time } = body;

    if (!focus || !equipment || time == null) {
      return NextResponse.json(
        { error: "Missing required fields: focus, equipment, time" },
        { status: 400 }
      );
    }

    const userMessage = `Sport/Goal: ${focus}\nAvailable Equipment: ${equipment}\nTime Limit: ${time} minutes`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const workout: WorkoutResponse = JSON.parse(jsonStr);

    // Validate structure
    if (!workout.title || !Array.isArray(workout.warmup) || !Array.isArray(workout.main_workout) || !Array.isArray(workout.cooldown)) {
      return NextResponse.json(
        { error: "Invalid workout structure from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json(workout);
  } catch (error: unknown) {
    console.error("Workout generation error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    // Handle OpenAI API errors (status on thrown error)
    const err = error as { status?: number; error?: { message?: string }; message?: string };
    const message =
      err?.error?.message ?? err?.message ?? "Workout generation failed";

    if (err?.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key. Check OPENAI_API_KEY in .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    if (err?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a moment." },
        { status: 500 }
      );
    }
    if (err?.status === 403) {
      return NextResponse.json(
        { error: "Access denied. Check your OpenAI account has API access." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: String(message) }, { status: 500 });
  }
}
