import pytest

from packages.contracts.marketplace.constants import TASK_MODE_SINGLE, TASK_STATE_DISPUTED, TASK_STATE_REFUNDED
from packages.contracts.marketplace.domain import AgentRegistryModel, MarketplaceError, TaskEscrowModel
from packages.contracts.marketplace.errors import ERR_DISPUTE_REQUIRED, ERR_SUBMISSION_MODE


def test_dispute_pauses_settlement():
    registry = AgentRegistryModel()
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    buyer = "0xbuyer"
    agent_owner = "0xagent-owner"
    agent_id = registry.register_agent(
        owner=agent_owner,
        agent_seed="agent-seed-3",
        active_version_hash="0xver3",
        metadata_uri="ipfs://agent-3",
        metadata_hash="0xmeta-agent-3",
        now=1,
    )

    task_id = escrow.create_task(
        creator=buyer,
        task_nonce="task-003",
        reward=900,
        deadline=10_000,
        task_mode=TASK_MODE_SINGLE,
        metadata_uri="ipfs://task-3",
        metadata_hash="0xmeta-task-3",
        now=2,
    )
    escrow.fund_task(creator=buyer, task_id=task_id, amount=900, now=3)
    escrow.assign_task(creator=buyer, task_id=task_id, agent_id=agent_id, agent_active=True, now=4)
    escrow.submit_task(
        submitter=agent_owner,
        task_id=task_id,
        agent_id=agent_id,
        submission_nonce="sub-003",
        result_hash="0xresult-3",
        metadata_uri="ipfs://output-3",
        metadata_hash="0xoutput-3",
        now=5,
    )
    escrow.dispute_task(actor=buyer, task_id=task_id, reason_hash="0xdispute", now=6)

    assert escrow.tasks[task_id].state == TASK_STATE_DISPUTED
    with pytest.raises(MarketplaceError, match=ERR_DISPUTE_REQUIRED):
        escrow.settle_task(actor=buyer, task_id=task_id, now=7)


def test_rejection_then_refund():
    registry = AgentRegistryModel()
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    buyer = "0xbuyer"
    agent_owner = "0xagent-owner"
    agent_id = registry.register_agent(
        owner=agent_owner,
        agent_seed="agent-seed-2",
        active_version_hash="0xver2",
        metadata_uri="ipfs://agent-2",
        metadata_hash="0xmeta-agent-2",
        now=1,
    )

    task_id = escrow.create_task(
        creator=buyer,
        task_nonce="task-002",
        reward=800,
        deadline=10_000,
        task_mode=TASK_MODE_SINGLE,
        metadata_uri="ipfs://task-2",
        metadata_hash="0xmeta-task-2",
        now=2,
    )
    escrow.fund_task(creator=buyer, task_id=task_id, amount=800, now=3)
    escrow.assign_task(creator=buyer, task_id=task_id, agent_id=agent_id, agent_active=True, now=4)
    escrow.start_execution(actor=agent_owner, task_id=task_id, agent_id=agent_id, now=5)
    submission_id = escrow.submit_task(
        submitter=agent_owner,
        task_id=task_id,
        agent_id=agent_id,
        submission_nonce="sub-002",
        result_hash="0xresult-2",
        metadata_uri="ipfs://output-2",
        metadata_hash="0xoutput-2",
        now=6,
    )
    escrow.start_review(creator=buyer, task_id=task_id, now=7)
    escrow.reject_submission(creator=buyer, task_id=task_id, submission_id=submission_id, now=8)
    refunded = escrow.refund_task(creator=buyer, task_id=task_id, now=9)

    assert refunded == 800
    assert escrow.tasks[task_id].state == TASK_STATE_REFUNDED


def test_single_submission_mode_blocks_second_submission():
    registry = AgentRegistryModel()
    escrow = TaskEscrowModel(protocol_fee_bps=250)

    buyer = "0xbuyer"
    agent_owner = "0xagent-owner"
    agent_id = registry.register_agent(
        owner=agent_owner,
        agent_seed="agent-seed-single-mode",
        active_version_hash="0xver2",
        metadata_uri="ipfs://agent-2",
        metadata_hash="0xmeta-agent-2",
        now=1,
    )

    task_id = escrow.create_task(
        creator=buyer,
        task_nonce="task-single-mode",
        reward=800,
        deadline=10_000,
        task_mode=TASK_MODE_SINGLE,
        metadata_uri="ipfs://task-2",
        metadata_hash="0xmeta-task-2",
        now=2,
    )
    escrow.fund_task(creator=buyer, task_id=task_id, amount=800, now=3)
    escrow.assign_task(creator=buyer, task_id=task_id, agent_id=agent_id, agent_active=True, now=4)
    escrow.submit_task(
        submitter=agent_owner,
        task_id=task_id,
        agent_id=agent_id,
        submission_nonce="sub-002",
        result_hash="0xresult-2",
        metadata_uri="ipfs://output-2",
        metadata_hash="0xoutput-2",
        now=6,
    )

    with pytest.raises(MarketplaceError, match=ERR_SUBMISSION_MODE):
        escrow.submit_task(
            submitter=agent_owner,
            task_id=task_id,
            agent_id=agent_id,
            submission_nonce="sub-003",
            result_hash="0xresult-3",
            metadata_uri="ipfs://output-3",
            metadata_hash="0xoutput-3",
            now=7,
        )
