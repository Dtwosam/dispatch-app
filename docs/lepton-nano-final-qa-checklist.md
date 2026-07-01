# Dispatch Nano Final QA Checklist

## Repo Checks

- [ ] `git status --short --branch` is clean before final commit.
- [ ] Latest commit is the intended Nano submission commit.
- [ ] Branch is synced or intentionally ahead before review.
- [ ] Requested tests and builds pass.

## Router Checks

- [ ] `https://dispatch-router.onrender.com/api/nano/metrics` returns the expected contract.
- [ ] `sourceRequestCount` is a number.
- [ ] `verifiedUsdc` is a string.
- [ ] `dispatchAgentCount` is a number.
- [ ] No contract validation error appears in the Nano UI.

## Frontend Checks

- [ ] `/nano` loads.
- [ ] Public stats are visible before wallet connection.
- [ ] Public stats update from the router.
- [ ] Source agent selector appears below the goal input.
- [ ] Start new budget returns to Goal.
- [ ] Mobile widths 390px and 430px have no horizontal overflow.

## Proof And Payment Checks

- [ ] Approval is not payment.
- [ ] Local proof is not paid.
- [ ] Pending proof is not paid.
- [ ] Rejected proof is not paid.
- [ ] Unavailable proof is not paid.
- [ ] `Paid with proof` appears only after verified Arc proof.
- [ ] Transaction links appear only for valid Arc transaction hashes.
- [ ] Gateway, x402, and Circle claims remain planned-only unless implemented and verified.

## Submission Checks

- [ ] Demo link works.
- [ ] Router link works.
- [ ] README includes current Nano links.
- [ ] Live-vs-planned doc is complete.
- [ ] Demo script is ready.
- [ ] Screenshots are captured.
- [ ] Production deploy status is clear.
