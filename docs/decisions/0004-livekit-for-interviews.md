# 0004: LiveKit Agents for voice and video interviews

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

AI interviews are the main selling point. They need natural real-time voice,
the candidate's camera video (the AI should see them, recordings, proctoring),
and swappable models. The prototype used browser speech, which only works
properly in Chrome.

## Decision

- **LiveKit Agents** (Apache-2.0), Python, in `services/interview-agent`.
- **LiveKit Cloud** hosts the media server and the agent (`lk agent deploy`).
- Default mode: a realtime model with video input (Gemini Live). Alternative
  mode: any speech-to-text + any LLM + any text-to-speech, with camera frames
  sampled for vision.
- Recordings: LiveKit Egress writes to Supabase Storage (S3-compatible,
  private bucket), only with the candidate's consent.
- Proctoring runs in the browser (MediaPipe) and is reported to `apps/api`.
- An AI interviewer with a video face (Anam or Tavus) is optional, behind a
  switch.

## Consequences

- Works in all modern browsers; voice quality and latency are much better.
- One more cloud account and usage-based cost per interview minute.
- Can move to a self-hosted LiveKit server later without changing the agent.
