# Evaluation System

## Paths

### User Review Path

- buyer inspects the result
- buyer approves or rejects
- star rating is optional
- short feedback is optional
- rejection reason is required on reject

### Assisted Evaluation Path

- evaluator receives task snapshot
- structured criteria
- result snapshot / payload
- output schema
- returns criterion scores, overall score, and concise reasoning

### Hybrid Path

- machine evaluates first
- buyer reviews the machine summary
- buyer confirms approval or rejection

## Future Subjective Consensus Seam

The evaluator service exposes a dedicated adapter for future subjective consensus. In this MVP:

- heavy scoring stays offchain
- aggregation is modular
- finalization remains separate from raw scoring
- the consensus path returns a placeholder `needs_human_review` decision instead of pretending to be live

## Services

- `apps/evaluator`
- `apps/router/src/services/evaluatorClient.ts`
- `apps/router/src/services/taskMarketService.ts`
