import os

import pytest


gltest = pytest.importorskip("gltest")
from gltest import get_contract_factory  # noqa: E402
from gltest.assertions import tx_execution_succeeded  # noqa: E402


@pytest.mark.integration
def test_agent_registry_deploy_and_register_smoke():
    factory = get_contract_factory("AgentRegistryContract")
    contract = factory.deploy(args=[])

    tx_receipt = contract.register_agent(
        args=[
            "agent-demo-1",
            "0xversionhash",
            "ipfs://agent-demo",
            "0xmetahash",
        ]
    ).transact()

    assert tx_execution_succeeded(tx_receipt)


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("GLTEST_ENABLE_PAYABLE"),
    reason="Payable escrow smoke is opt-in. Set GLTEST_ENABLE_PAYABLE=1 when the target environment supports native token transfers.",
)
def test_task_escrow_deploy_smoke():
    registry_factory = get_contract_factory("AgentRegistryContract")
    registry = registry_factory.deploy(args=[])

    escrow_factory = get_contract_factory("TaskEscrowContract")
    contract = escrow_factory.deploy(
        args=[
            "0xdb1fca85854ddcb5557c03f95a94dd78c966d6e4",
            registry.address,
            250,
        ]
    )

    tx_receipt = contract.create_task(
        args=[
            "task-demo-1",
            1,
            9999999999,
            "SINGLE_SUBMISSION",
            "ipfs://task-demo",
            "0xmetahash",
        ]
    ).transact()

    assert tx_execution_succeeded(tx_receipt)
