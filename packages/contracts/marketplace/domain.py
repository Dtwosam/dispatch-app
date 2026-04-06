from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from typing import Dict, List

from .constants import (
    EVENT_AGENT_DISABLED,
    EVENT_AGENT_REGISTERED,
    EVENT_AGENT_UPDATED,
    EVENT_TASK_APPROVED,
    EVENT_TASK_ASSIGNED,
    EVENT_TASK_CREATED,
    EVENT_TASK_DISPUTED,
    EVENT_TASK_ESCROW_FUNDED,
    EVENT_TASK_EXECUTION_STARTED,
    EVENT_TASK_REFUNDED,
    EVENT_TASK_REJECTED,
    EVENT_TASK_REVIEW_STARTED,
    EVENT_TASK_SETTLED,
    EVENT_TASK_SUBMITTED,
    TASK_MODE_SINGLE,
    TASK_STATE_APPROVED,
    TASK_STATE_ASSIGNED,
    TASK_STATE_CANCELLED,
    TASK_STATE_CREATED,
    TASK_STATE_DISPUTED,
    TASK_STATE_ESCROW_FUNDED,
    TASK_STATE_EXECUTING,
    TASK_STATE_OPEN,
    TASK_STATE_REFUNDED,
    TASK_STATE_REJECTED,
    TASK_STATE_SETTLED,
    TASK_STATE_SUBMITTED,
    TASK_STATE_UNDER_REVIEW,
)
from .errors import (
    ERR_AGENT_DISABLED,
    ERR_AGENT_EXISTS,
    ERR_AGENT_NOT_FOUND,
    ERR_ALREADY_ASSIGNED,
    ERR_ALREADY_FUNDED,
    ERR_ALREADY_SETTLED,
    ERR_CANCEL_NOT_ALLOWED,
    ERR_DISPUTE_REQUIRED,
    ERR_ESCROW_MISMATCH,
    ERR_INVALID_AGENT,
    ERR_INVALID_DEADLINE,
    ERR_INVALID_STATE,
    ERR_PROTOCOL_FEE,
    ERR_REFUND_NOT_ALLOWED,
    ERR_REWARD_REQUIRED,
    ERR_SUBMISSION_MODE,
    ERR_SUBMISSION_NOT_FOUND,
    ERR_TASK_EXISTS,
    ERR_TASK_NOT_FOUND,
    ERR_UNAUTHORIZED,
)


class MarketplaceError(Exception):
    pass


@dataclass
class EventRecordModel:
    event_id: str
    event_name: str
    task_id: str
    agent_id: str
    actor: str
    timestamp: int
    payload: str


@dataclass
class AgentRecordModel:
    agent_id: str
    owner: str
    active_version_hash: str
    metadata_uri: str
    metadata_hash: str
    active: bool = True


@dataclass
class SubmissionRecordModel:
    submission_id: str
    task_id: str
    agent_id: str
    submitter: str
    result_hash: str
    metadata_uri: str
    metadata_hash: str
    created_at: int


@dataclass
class TaskRecordModel:
    task_id: str
    creator: str
    reward: int
    deadline: int
    task_mode: str
    metadata_uri: str
    metadata_hash: str
    state: str = TASK_STATE_CREATED
    assigned_agent_id: str = ""
    escrow_locked: int = 0
    dispute_paused: bool = False
    settled_submission_id: str = ""
    submission_ids: List[str] = field(default_factory=list)


def make_deterministic_id(prefix: str, *parts: str) -> str:
    return f"{prefix}_{sha256('::'.join(parts).encode('utf-8')).hexdigest()[:32]}"


class AgentRegistryModel:
    def __init__(self) -> None:
        self.agents: Dict[str, AgentRecordModel] = {}
        self.owner_to_agents: Dict[str, List[str]] = {}
        self.events: List[EventRecordModel] = []

    def register_agent(self, owner: str, agent_seed: str, active_version_hash: str, metadata_uri: str, metadata_hash: str, now: int) -> str:
        agent_id = make_deterministic_id("agent", owner, agent_seed)
        if agent_id in self.agents:
            raise MarketplaceError(ERR_AGENT_EXISTS)

        self.agents[agent_id] = AgentRecordModel(agent_id, owner, active_version_hash, metadata_uri, metadata_hash)
        self.owner_to_agents.setdefault(owner, []).append(agent_id)
        self.events.append(EventRecordModel(make_deterministic_id("evt", EVENT_AGENT_REGISTERED, agent_id, str(now)), EVENT_AGENT_REGISTERED, "", agent_id, owner, now, metadata_hash))
        return agent_id

    def update_agent(self, owner: str, agent_id: str, version_hash: str, metadata_uri: str, metadata_hash: str, now: int) -> None:
        agent = self.agents.get(agent_id)
        if not agent:
            raise MarketplaceError(ERR_AGENT_NOT_FOUND)
        if agent.owner != owner:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        agent.active_version_hash = version_hash
        agent.metadata_uri = metadata_uri
        agent.metadata_hash = metadata_hash
        self.events.append(EventRecordModel(make_deterministic_id("evt", EVENT_AGENT_UPDATED, agent_id, str(now)), EVENT_AGENT_UPDATED, "", agent_id, owner, now, metadata_hash))

    def disable_agent(self, owner: str, agent_id: str, now: int) -> None:
        agent = self.agents.get(agent_id)
        if not agent:
            raise MarketplaceError(ERR_AGENT_NOT_FOUND)
        if agent.owner != owner:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        agent.active = False
        self.events.append(EventRecordModel(make_deterministic_id("evt", EVENT_AGENT_DISABLED, agent_id, str(now)), EVENT_AGENT_DISABLED, "", agent_id, owner, now, "disabled"))


class TaskEscrowModel:
    def __init__(self, protocol_fee_bps: int = 250) -> None:
        if protocol_fee_bps < 0 or protocol_fee_bps > 10_000:
            raise MarketplaceError(ERR_PROTOCOL_FEE)
        self.protocol_fee_bps = protocol_fee_bps
        self.tasks: Dict[str, TaskRecordModel] = {}
        self.submissions: Dict[str, SubmissionRecordModel] = {}
        self.events: List[EventRecordModel] = []

    def create_task(self, creator: str, task_nonce: str, reward: int, deadline: int, task_mode: str, metadata_uri: str, metadata_hash: str, now: int) -> str:
        if reward <= 0:
            raise MarketplaceError(ERR_REWARD_REQUIRED)
        if deadline <= now:
            raise MarketplaceError(ERR_INVALID_DEADLINE)
        task_id = make_deterministic_id("task", creator, task_nonce)
        if task_id in self.tasks:
            raise MarketplaceError(ERR_TASK_EXISTS)

        self.tasks[task_id] = TaskRecordModel(task_id, creator, reward, deadline, task_mode, metadata_uri, metadata_hash)
        self._event(EVENT_TASK_CREATED, task_id, "", creator, now, metadata_hash)
        return task_id

    def fund_task(self, creator: str, task_id: str, amount: int, now: int) -> None:
        task = self._require_task(task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state != TASK_STATE_CREATED:
            raise MarketplaceError(ERR_ALREADY_FUNDED if task.state == TASK_STATE_ESCROW_FUNDED else ERR_INVALID_STATE)
        if amount != task.reward:
            raise MarketplaceError(ERR_ESCROW_MISMATCH)

        task.escrow_locked = amount
        task.state = TASK_STATE_ESCROW_FUNDED
        self._event(EVENT_TASK_ESCROW_FUNDED, task_id, "", creator, now, str(amount))
        task.state = TASK_STATE_OPEN

    def assign_task(self, creator: str, task_id: str, agent_id: str, agent_active: bool, now: int) -> None:
        task = self._require_task(task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state != TASK_STATE_OPEN:
            raise MarketplaceError(ERR_ALREADY_ASSIGNED if task.state == TASK_STATE_ASSIGNED else ERR_INVALID_STATE)
        if not agent_active:
            raise MarketplaceError(ERR_AGENT_DISABLED)

        task.assigned_agent_id = agent_id
        task.state = TASK_STATE_ASSIGNED
        self._event(EVENT_TASK_ASSIGNED, task_id, agent_id, creator, now, "assigned")

    def start_execution(self, actor: str, task_id: str, agent_id: str, now: int) -> None:
        task = self._require_task(task_id)
        if task.state != TASK_STATE_ASSIGNED:
            raise MarketplaceError(ERR_INVALID_STATE)
        if task.assigned_agent_id != agent_id:
            raise MarketplaceError(ERR_INVALID_AGENT)
        task.state = TASK_STATE_EXECUTING
        self._event(EVENT_TASK_EXECUTION_STARTED, task_id, agent_id, actor, now, "executing")

    def submit_task(self, submitter: str, task_id: str, agent_id: str, submission_nonce: str, result_hash: str, metadata_uri: str, metadata_hash: str, now: int) -> str:
        task = self._require_task(task_id)
        if task.state not in (TASK_STATE_ASSIGNED, TASK_STATE_EXECUTING, TASK_STATE_SUBMITTED):
            raise MarketplaceError(ERR_INVALID_STATE)
        if task.assigned_agent_id and task.assigned_agent_id != agent_id:
            raise MarketplaceError(ERR_INVALID_AGENT)
        if task.task_mode == TASK_MODE_SINGLE and len(task.submission_ids) >= 1:
            raise MarketplaceError(ERR_SUBMISSION_MODE)

        submission_id = make_deterministic_id("sub", task_id, agent_id, submission_nonce)
        self.submissions[submission_id] = SubmissionRecordModel(submission_id, task_id, agent_id, submitter, result_hash, metadata_uri, metadata_hash, now)
        task.submission_ids.append(submission_id)
        task.state = TASK_STATE_SUBMITTED
        self._event(EVENT_TASK_SUBMITTED, task_id, agent_id, submitter, now, result_hash)
        return submission_id

    def start_review(self, creator: str, task_id: str, now: int) -> None:
        task = self._require_task(task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state != TASK_STATE_SUBMITTED:
            raise MarketplaceError(ERR_INVALID_STATE)
        task.state = TASK_STATE_UNDER_REVIEW
        self._event(EVENT_TASK_REVIEW_STARTED, task_id, task.assigned_agent_id, creator, now, "under_review")

    def approve_submission(self, creator: str, task_id: str, submission_id: str, now: int) -> None:
        task = self._require_task(task_id)
        self._require_submission(submission_id, task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state not in (TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW):
            raise MarketplaceError(ERR_INVALID_STATE)
        task.state = TASK_STATE_APPROVED
        task.settled_submission_id = submission_id
        self._event(EVENT_TASK_APPROVED, task_id, task.assigned_agent_id, creator, now, submission_id)

    def reject_submission(self, creator: str, task_id: str, submission_id: str, now: int) -> None:
        task = self._require_task(task_id)
        self._require_submission(submission_id, task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state not in (TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW):
            raise MarketplaceError(ERR_INVALID_STATE)
        task.state = TASK_STATE_REJECTED
        self._event(EVENT_TASK_REJECTED, task_id, task.assigned_agent_id, creator, now, submission_id)

    def dispute_task(self, actor: str, task_id: str, reason_hash: str, now: int) -> None:
        task = self._require_task(task_id)
        if task.state not in (TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW, TASK_STATE_REJECTED):
            raise MarketplaceError(ERR_INVALID_STATE)
        task.state = TASK_STATE_DISPUTED
        task.dispute_paused = True
        self._event(EVENT_TASK_DISPUTED, task_id, task.assigned_agent_id, actor, now, reason_hash)

    def settle_task(self, actor: str, task_id: str, now: int) -> Dict[str, int]:
        task = self._require_task(task_id)
        if task.state == TASK_STATE_SETTLED:
            raise MarketplaceError(ERR_ALREADY_SETTLED)
        if task.state == TASK_STATE_DISPUTED:
            raise MarketplaceError(ERR_DISPUTE_REQUIRED)
        if task.state != TASK_STATE_APPROVED:
            raise MarketplaceError(ERR_INVALID_STATE)
        fee_amount = (task.escrow_locked * self.protocol_fee_bps) // 10_000
        payout_amount = task.escrow_locked - fee_amount
        task.state = TASK_STATE_SETTLED
        self._event(EVENT_TASK_SETTLED, task_id, task.assigned_agent_id, actor, now, str(payout_amount))
        return {"payout_amount": payout_amount, "fee_amount": fee_amount}

    def cancel_task(self, creator: str, task_id: str, now: int) -> None:
        task = self._require_task(task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state not in (TASK_STATE_CREATED, TASK_STATE_OPEN):
            raise MarketplaceError(ERR_CANCEL_NOT_ALLOWED)
        task.state = TASK_STATE_CANCELLED

    def refund_task(self, creator: str, task_id: str, now: int) -> int:
        task = self._require_task(task_id)
        if task.creator != creator:
            raise MarketplaceError(ERR_UNAUTHORIZED)
        if task.state not in (TASK_STATE_REJECTED, TASK_STATE_CANCELLED):
            raise MarketplaceError(ERR_REFUND_NOT_ALLOWED)
        refund_amount = task.escrow_locked
        task.state = TASK_STATE_REFUNDED
        self._event(EVENT_TASK_REFUNDED, task_id, task.assigned_agent_id, creator, now, str(refund_amount))
        return refund_amount

    def _require_task(self, task_id: str) -> TaskRecordModel:
        task = self.tasks.get(task_id)
        if not task:
            raise MarketplaceError(ERR_TASK_NOT_FOUND)
        return task

    def _require_submission(self, submission_id: str, task_id: str) -> SubmissionRecordModel:
        submission = self.submissions.get(submission_id)
        if not submission or submission.task_id != task_id:
            raise MarketplaceError(ERR_SUBMISSION_NOT_FOUND)
        return submission

    def _event(self, name: str, task_id: str, agent_id: str, actor: str, now: int, payload: str) -> None:
        self.events.append(EventRecordModel(make_deterministic_id("evt", name, task_id, agent_id, actor, str(now), payload), name, task_id, agent_id, actor, now, payload))
