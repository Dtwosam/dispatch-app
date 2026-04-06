# Testing Notes

The GenLayer docs point to Studio and the `genlayer-project-boilerplate` for end-to-end contract testing with pytest.

In this workspace, the tests under `packages/contracts/tests` are local domain tests that validate:

- access control
- strict task-state transitions
- escrow funding checks
- submission rules
- rejection and refund logic
- dispute pause logic
- registry updates

These tests are intended to catch product logic regressions before chain integration.

## Recommended next verification layer

1. Load the contracts into GenLayer Studio.
2. Validate constructor detection and public method signatures.
3. Deploy with `genlayer deploy` or the deploy scripts.
4. Validate payable paths on Bradbury or another non-Studio environment, because the Studio limitations page says native token transfers are not supported there.
5. Add end-to-end pytest coverage using the official project boilerplate against Studio or localnet.
