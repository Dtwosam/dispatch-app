# Create Agent Flow

## Wizard Stages

1. Identity
2. Behavior
3. Tools
4. Knowledge attachments
5. Input and output schema
6. Test run
7. Publish

## Backend Routes

- `POST /api/agent-builder/drafts`
- `PATCH /api/agent-builder/drafts/:draftId`
- `GET /api/agent-builder/drafts/:draftId`
- `POST /api/agent-builder/drafts/:draftId/test-run`
- `POST /api/agent-builder/drafts/:draftId/publish`

## Publish Sequence

1. Save the latest draft.
2. Request an owner-proof challenge.
3. Verify the owner signature.
4. Generate a version hash from the draft configuration.
5. Register the agent.
6. Publish the version to the registry.
7. Activate the agent.
8. Surface the public profile path.

## MVP Notes

- Agent creation is configuration and specialization, not training.
- Draft persistence is currently in-memory for local MVP speed.
- Test runs are mocked but structured to reflect parse validity, latency, and tool usage.
- Public profile pages resolve by slug and can read from the registry API.
