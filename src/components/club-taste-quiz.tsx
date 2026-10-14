"use client";

import { useState } from "react";
import {
  assignClubPairing,
  CLUB_TASTE_QUESTIONS,
  type TasteAnswers,
} from "@/lib/club-taste";

export function ClubTasteQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<TasteAnswers>>({});

  const question = CLUB_TASTE_QUESTIONS[step];
  const finished = step >= CLUB_TASTE_QUESTIONS.length;
  const pairing =
    finished && isComplete(answers) ? assignClubPairing(answers) : null;

  if (pairing) {
    return (
      <div className="club-quiz-result" role="status">
        <p className="club-kicker">Your box</p>
        <h3>{pairing.title}</h3>
        <p>{pairing.note}</p>
        <p>
          Twelve partner pairings a year. A QR code on the bottle or wedge
          reorders that exact item. A share of the month’s margin goes to
          Wisconsin farm and food nonprofits.
        </p>
        <p className="club-quiz-note">
          This page assigns the pairing. It does not charge a card.
        </p>
        <button
          type="button"
          className="club-text-button"
          onClick={() => {
            setAnswers({});
            setStep(0);
          }}
        >
          Retake the quiz
        </button>
      </div>
    );
  }

  if (!question) return null;
  const selected = answers[question.key];

  return (
    <form
      className="club-quiz"
      onSubmit={(event) => event.preventDefault()}
    >
      <p className="club-kicker">
        Question {step + 1} of {CLUB_TASTE_QUESTIONS.length}
      </p>
      <h3 id={`club-q-${question.key}`}>{question.prompt}</h3>
      <div
        className="club-quiz-options"
        role="group"
        aria-labelledby={`club-q-${question.key}`}
      >
        {question.options.map((option) => {
          const pressed = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              className={pressed ? "is-selected" : undefined}
              onClick={() => {
                const next = { ...answers, [question.key]: option.value };
                setAnswers(next);
                setStep((current) => current + 1);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {step > 0 ? (
        <button
          type="button"
          className="club-text-button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </button>
      ) : null}
    </form>
  );
}

function isComplete(answers: Partial<TasteAnswers>): answers is TasteAnswers {
  return CLUB_TASTE_QUESTIONS.every((question) =>
    Boolean(answers[question.key]),
  );
}
