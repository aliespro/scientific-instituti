# Project memory

## Product intent & audience

- Persian (Farsi) RTL mind mapping web app for students and knowledge workers.
- Core features: infinite canvas, structured node creation, labeled relationships, outline synchronization, interactive study modes.
- Includes an AI assistant for the mind map (contrary to initial "without AI assistance" summary — AI integration has been added).

## Brand personality & voice

- UI and assistant responses are in Persian (Farsi), right-to-left.
- Tone is helpful, direct, and technical when explaining configuration changes.

## Visual design & UX direction

- RTL layout throughout; Persian typography and text alignment required.
- AI settings panel exists with a service selector and API key input.
- Built with Vite + React + Tailwind CSS + Lucide React icons; `@/` path alias for `src/` imports.

## Decisions, constraints & rationale

- AI service switched to CoArena (`https://coarena.ai/api/v1`) with model `claude-sonnet-5-5`.
- A default CoArena API key is now bundled so users don't need to enter one manually.
- CoArena added as a selectable option in the AI settings panel.
- Migration logic added: previously saved browser settings matching the old default are auto-updated to the new CoArena service so users aren't stuck on the old provider.
- Do not install extra UI/icon packages; use only lucide-react, Tailwind, and React hooks.

## Open questions & assumptions

- Assume the bundled default API key is acceptable for end users; unclear if it should remain hardcoded or be fetched at runtime.
- Unclear whether the old AI service should be fully removed or kept as a fallback option.
- No confirmation yet on which AI features the assistant powers (node generation, summarization, study quizzes, etc.).
- Initial project summary said "without AI assistance"; current direction includes AI — intent has shifted.