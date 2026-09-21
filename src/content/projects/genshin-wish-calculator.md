---
title: "Genshin Wish Calculator"
description: "An exact-odds planner for Genshin Impact's wish system, built to learn how to turn a huge Markov chain into working code."
date: 2026-09-19
tags: ["TypeScript", "React", "Web", "Probability"]
links:
  - label: "Live Site"
    url: "https://tdmdfever.github.io/genshin-wish-calculator/"
  - label: "Illustrated Explainer"
    url: "https://tdmdfever.github.io/genshin-wish-calculator/wish-engine-internals.html"
  - label: "Repo"
    url: "https://github.com/tdmdfever/genshin-wish-calculator"
draft: false
---

## What it is

A calculator for Genshin Impact's gacha system. You enter your current pity and guarantee state on the Character and Weapon banners, then a priority-ordered list of goals: 5★ and 4★ characters and weapons, optionally with constellation or refinement targets. It returns the odds of completing each prefix of that list by every pull count up to your budget. It also gives a full constellation/refinement breakdown for every 4★ goal.

Most gacha calculators run Monte Carlo simulations. This one computes the exact probabilities, so there is no sampling noise. It runs entirely in the browser with no backend.

## Why I built it

Genshin is a game I like, and its wish system is a surprisingly deep probability problem. Pity counters, 50/50 guarantees, a hidden "Capturing Radiance" mechanic, Epitomized Path, and 4★ rate-ups all interact, and each banner has thousands of possible states. I wanted to know how you would actually implement something like that.

I knew a bit about Markov chains from coursework, but I had never turned one into working code. I didn't really know how it would look in practice, and I had barely worked with transition matrices. Building this was how I learned it: what the state actually is, how to enumerate it, how to push probabilities through it, and what happens when the state space gets too big to handle naively.

## How it works

Three things make the exact version tractable.

- **Model the rules as a Markov chain.** Every pull moves the banner through a state (pity counter, 50/50 guarantee flag, Capturing Radiance counter, 4★ pity). The engine enumerates every possible outcome and next state with its probability, then pushes probability mass forward pull by pull.
- **Split the goal list into phases.** Tracking both banners jointly is tens of millions of states. But a player only pulls on one banner at a time, so the engine breaks the goal list into stretches where one banner has exclusive focus. Each phase is solved as a small single-banner problem.
- **Stitch phases together with convolution.** When a phase starts depends on how the previous one went, so the engine convolves each phase's local completion curve with the distribution of when it started. That puts everything on one shared pull axis.

## What I'd improve

- Make the goal-tracking state phase-scoped instead of banner-wide. That is the root cause of the cap on how many 4★ goals you can track (3 for characters, 4 for weapons).
- Fix the known approximation between phases (details below) by re-running downstream phases per arrival-time bucket instead of from one merged distribution.
- Let two adjacent "disconnected" 4★s share a window. Right now each gets its own sequential phase.

## How I built it (and what "vibecoded" actually meant here)

Almost all the code was written by Claude. My job was the parts it couldn't do alone, and the project's changelog shows what those were.

- **I was the domain expert and the source of truth.** An early audit checked the mechanics against community sources and found the code correct. I later found that the weapon banner was missing its own 75/25 guarantee, separate from Epitomized Path, by reading a trace and noticing a guarantee that never took effect. I gave the corrected mechanic, and it was right. I also confirmed which of the two Capturing Radiance models matched my understanding of the mechanic.
- **I was the QA.** Twenty-one numbered bugs were logged, and most came from me using the live app, not from the tests. One example: a goal list showed "Odette + Alyosha" and "Odette + Alyosha + Miko" as identical curves. My reasoning was that at any pull count, having the first two must be much likelier than having all three. That was correct, and it traced to a real engine bug.
- **I built tooling to check whether the engine acts like a real player.** I asked for a trace tool that narrates one pull-by-pull playthrough in plain language, then a live UI panel for it. When the output was unreadable I said so, and the summary now comes first. Reading those traces is how several bugs surfaced, including some where the seed picked for a test scenario didn't actually demonstrate what the scenario claimed.
- **I made the tradeoff calls.** When there was a real speed-versus-exactness decision, I chose. I kept 4★ anchoring across phases even though it was harder to build. I capped how many disconnected 4★ goals are allowed after measuring where runtime blew up. I abandoned a "resume the computation when the budget increases" optimization after measurement showed it introduced 10 to 38 percentage points of error.
- **I kept the process disciplined.** Performance changes were profiled, not guessed. The full test suite ran after each change. Design passes happened before touching the core algorithm. When the project's context file grew to about 170KB, I had it split into separate docs (orientation, current-state architecture, and full history) so later sessions could still navigate it.

## The math

The engine is applied probability, and these were the ideas I had to understand well enough to direct and verify:

- **Piecewise hazard rates.** Pity is a rate that is flat, then ramps linearly (soft pity), then hits 1 at a hard ceiling. Both 5★ and 4★ have their own curve on each banner.
- **Markov chains, transition lists, and exact DP.** State transitions with attached probabilities, propagated forward. The character banner has 14,400 states (90 × 2 × 4 × 10 × 2), packed into one integer with mixed-radix encoding. A dense transition matrix would need over 200 million entries (14,400²), so the engine stores each state's transitions as a short list of (probability, outcome, next state) instead. That is what makes the exact computation feasible.
- **Independence and factorization.** The main speedup came from noticing a pull's effect on goal tracking depends only on which outcome happened, not on the banner's pity state. Computing that once per outcome and sweeping it across all banner states as array arithmetic took the worst case from about 22 seconds to about 1.7.
- **Convolution.** The sum of two independent waiting times has a distribution equal to the convolution of the two. That is the operation behind the phase stitching.
- **Conditioning and marginalization.** Carrying a distribution from one phase into the next means conditioning on "this phase finished." Averaging over when it finished is exact only when nothing extends the phase past where pity naturally resets. Finding where that breaks was the hardest part of the project.
- **Validation logic.** The exact engine is cross-checked against an independent Monte Carlo one, and discrepancies are read in standard errors, so I can tell noise from a real bug. Cross-validation only proves two engines agree, though, and would miss a mistake they share. So there is also a suite of invariant tests, such as "a wider anchor window can never hurt," that don't depend on a second implementation.

## Implementation lessons and honest limitations

- **Performance was combinatorial, not just slow code.** Profiling showed goal-tracking state multiplies by 8 per character 4★ goal (7 copies plus zero) and compounds across phases. Two rounds of optimization gave 13x, but a 4-goal case still took 120 seconds. That is why the goal caps exist. Constant-factor tuning can't fix a combinatorial blowup.
- **Known approximation.** The between-phase handoff averages over arrival time. In adversarial deep-target cases it can be off by up to about 8 percentage points, and usually far less. I deliberately left it, since the real fix is a substantial architectural change, and I documented the diagnostic trail.
- **Small accepted error elsewhere.** Caching results when the pull budget decreases is off by about 0.0007 percentage points at worst. Long-running 4★ continuation phases are capped at 400 pulls.
- **Some inputs are guesses.** HoYoverse has never published the Capturing Radiance formula, so the app offers two community models instead of pretending to know.
- **Player behavior is an assumption.** The engine models a rational player who pulls by priority and picks up other goals opportunistically. A documented rules file states exactly what that means, pull by pull.
- **Bugs get worse when found by tests alone.** One bug survived because its test used a deep target, where the error was small. A shallow target exposed it immediately. Test power depends on scenario depth as well as shape.
- **Measurement is a valid outcome.** Rejecting a feature because the numbers said so was treated as a good result.