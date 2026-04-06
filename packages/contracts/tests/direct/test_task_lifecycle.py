import pytest

from packages.contracts.marketplace.constants import TASK_MODE_SINGLE, TASK_STATE_SETTLED
from packages.contracts.marketplace.domain import AgentRegistryModel, MarketplaceError, TaskEscrowModel
from packages.contracts.marketplace.errors import ERR_ALREADY_SETTLED, ERR_INVALID_DEADLINE


def test_happy_path_task_lifecycle():
    registry = AgentRegistryModel()
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    buyer = "0xbuyer"
    agent_owner = "0xagent-owner"
    now = 100

    agent_id = registry.register_agent(
        owner=agent_owner,
        agent_seed="agent-seed-1",
        active_version_hash="0xver1",
        metadata_uri="ipfs://agent",
        metadata_hash="0xmeta-agent",
        now=now,
    )

    task_id = escrow.create_task(
        creator=buyer,
        task_nonce="task-001",
        reward=1_000,
        deadline=1_000_000,
        task_mode=TASK_MODE_SINGLE,
        metadata_uri="ipfs://task",
        metadata_hash="0xmeta-task",
        now=now + 1,
    )
    escrow.fund_task(creator=buyer, task_id=task_id, amount=1_000, now=now + 2)
    escrow.assign_task(creator=buyer, task_id=task_id, agent_id=agent_id, agent_active=True, now=now + 3)
    escrow.start_execution(actor=agent_owner, task_id=task_id, agent_id=agent_id, now=now + 4)

    submission_id = escrow.submit_task(
        submitter=agent_owner,
        task_id=task_id,
        agent_id=agent_id,
        submission_nonce="sub-001",
        result_hash="0xresult",
        metadata_uri="ipfs://output",
        metadata_hash="0xoutput",
        now=now + 5,
    )
    escrow.start_review(creator=buyer, task_id=task_id, now=now + 6)
    escrow.approve_submission(creator=buyer, task_id=task_id, submission_id=submission_id, now=now + 7)
    payout = escrow.settle_task(actor=buyer, task_id=task_id, now=now + 8)

    assert escrow.tasks[task_id].state == TASK_STATE_SETTLED
    assert payout["payout_amount"] == 975
    assert payout["fee_amount"] == 25


def test_create_task_rejects_past_deadline():
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    with pytest.raises(MarketplaceError, match=ERR_INVALID_DEADLINE):
        escrow.create_task(
            creator="0xbuyer",
            task_nonce="task-bad",
            reward=100,
            deadline=10,
            task_mode=TASK_MODE_SINGLE,
            metadata_uri="ipfs://task",
            metadata_hash="0xmeta",
            now=10,
        )


def test_settlement_cannot_run_twice():
    registry = AgentRegistryModel()
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    buyer = "0xbuyer"
    agent_owner = "0xagent-owner"
    agent_id = registry.register_agent(
        owner=agent_owner,
        agent_seed="agent-seed-duplicate-settle",
        active_version_hash="0xver1",
        metadata_uri="ipfs://agent",
        metadata_hash="0xmeta-agent",
        now=1,
    )

    task_id = escrow.create_task(
        creator=buyer,
        task_nonce="task-settle-twice",
        reward=200,
        deadline=1000,
        task_mode=TASK_MODE_SINGLE,
        metadata_uri="ipfs://task",
        metadata_hash="0xmeta-task",
        now=2,
    )
    escrow.fund_task(creator=buyer, task_id=task_id, amount=200, now=3)
    escrow.assign_task(creator=buyer, task_id=task_id, agent_id=agent_id, agent_active=True, now=4)
    submission_id = escrow.submit_task(
        submitter=agent_owner,
        task_id=task_id,
        agent_id=agent_id,
        submission_nonce="sub-settle-twice",
        result_hash="0xresult",
        metadata_uri="ipfs://output",
        metadata_hash="0xmeta-output",
        now=5,
    )
    escrow.approve_submission(creator=buyer, task_id=task_id, submission_id=submission_id, now=6)
    escrow.settle_task(actor=buyer, task_id=task_id, now=7)

    with pytest.raises(MarketplaceError, match=ERR_ALREADY_SETTLED):
        escrow.settle_task(actor=buyer, task_id=task_id, now=8)
