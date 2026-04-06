# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *

from .constants import (
    EVENT_TASK_APPROVED,
    EVENT_TASK_APPEALED,
    EVENT_TASK_ASSIGNED,
    EVENT_TASK_CREATED,
    EVENT_TASK_DISPUTED,
    EVENT_TASK_ESCROW_FUNDED,
    EVENT_TASK_EXECUTION_STARTED,
    EVENT_TASK_REFUNDED,
    EVENT_TASK_REJECTED,
    EVENT_TASK_REVIEW_FINALIZED,
    EVENT_TASK_REVIEW_STARTED,
    EVENT_TASK_SETTLED,
    EVENT_TASK_SUBMITTED,
    EVENT_TASK_UNRESOLVED,
    TASK_STATE_APPEALED,
    TASK_MODE_MULTI,
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
    TASK_STATE_UNRESOLVED,
)
from .errors import (
    ERR_AGENT_DISABLED,
    ERR_ALREADY_ASSIGNED,
    ERR_ALREADY_FUNDED,
    ERR_ALREADY_SETTLED,
    ERR_APPEAL_NOT_ALLOWED,
    ERR_CANCEL_NOT_ALLOWED,
    ERR_DISPUTE_REQUIRED,
    ERR_ESCROW_MISMATCH,
    ERR_INVALID_AGENT,
    ERR_INVALID_DEADLINE,
    ERR_INVALID_REVIEW_OUTCOME,
    ERR_INVALID_STATE,
    ERR_PROTOCOL_FEE,
    ERR_REFUND_NOT_ALLOWED,
    ERR_REWARD_REQUIRED,
    ERR_SETTLEMENT_NOT_ELIGIBLE,
    ERR_SUBMISSION_MODE,
    ERR_SUBMISSION_NOT_FOUND,
    ERR_TASK_EXISTS,
    ERR_TASK_NOT_FOUND,
    ERR_UNAUTHORIZED,
)


@gl.contract_interface
class AgentRegistryContractIface:
    class View:
        def get_agent(self, agent_id: str): ...


@allow_storage
@dataclass
class TaskRecord:
    creator: Address
    reward: u256
    deadline: u256
    task_mode: str
    metadata_uri: str
    metadata_hash: str
    state: str
    assigned_agent_id: str
    escrow_locked: u256
    dispute_paused: bool
    settled_submission_id: str
    review_round: u256
    review_outcome: str
    consensus_score: u256
    validator_agreement_bps: u256
    consensus_confidence_bps: u256
    evaluation_hash: str


@allow_storage
@dataclass
class SubmissionRecord:
    task_id: str
    agent_id: str
    submitter: Address
    result_hash: str
    metadata_uri: str
    metadata_hash: str
    created_at: u256


@allow_storage
@dataclass
class EventRecord:
    event_id: str
    event_name: str
    task_id: str
    agent_id: str
    actor: Address
    timestamp: u256
    payload: str


class TaskEscrowContract(gl.Contract):
    owner: Address
    treasury: Address
    agent_registry: Address
    protocol_fee_bps: u256
    clock: u256
    tasks: TreeMap[str, TaskRecord]
    submissions: TreeMap[str, SubmissionRecord]
    task_to_submission_ids: TreeMap[str, DynArray[str]]
    event_log: DynArray[EventRecord]

    def __init__(self, treasury_address: str, agent_registry_address: str, protocol_fee_bps: int):
        if protocol_fee_bps < 0 or protocol_fee_bps > 10_000:
            raise gl.vm.UserError(ERR_PROTOCOL_FEE)
        self.owner = gl.message.sender_address
        self.treasury = Address(treasury_address)
        self.agent_registry = Address(agent_registry_address)
        self.protocol_fee_bps = u256(protocol_fee_bps)
        self.clock = u256(0)

    def _next_timestamp(self) -> u256:
        self.clock = self.clock + 1
        return self.clock

    def _require_task(self, task_id: str) -> TaskRecord:
        if task_id not in self.tasks:
            raise gl.vm.UserError(ERR_TASK_NOT_FOUND)
        return self.tasks[task_id]

    def _require_creator(self, task_id: str) -> TaskRecord:
        task = self._require_task(task_id)
        if task.creator != gl.message.sender_address:
            raise gl.vm.UserError(ERR_UNAUTHORIZED)
        return task

    def _require_submission(self, task_id: str, submission_id: str) -> SubmissionRecord:
        if submission_id not in self.submissions:
            raise gl.vm.UserError(ERR_SUBMISSION_NOT_FOUND)
        submission = self.submissions[submission_id]
        if submission.task_id != task_id:
            raise gl.vm.UserError(ERR_SUBMISSION_NOT_FOUND)
        return submission

    def _record_event(self, event_name: str, task_id: str, agent_id: str, payload: str) -> None:
        """
        Store event-like records in contract storage for frontend/indexer reads.

        Uncertainty note:
        the reviewed docs did not expose a stable native event/log API, so the
        MVP uses explicit storage-backed event records plus execution-log prints.
        """
        ts = self._next_timestamp()
        event_id = f"{event_name}:{task_id}:{agent_id}:{ts}"
        self.event_log.append(
            EventRecord(
                event_id=event_id,
                event_name=event_name,
                task_id=task_id,
                agent_id=agent_id,
                actor=gl.message.sender_address,
                timestamp=ts,
                payload=payload,
            )
        )
        print(f"event={event_name} task={task_id} agent={agent_id} payload={payload}")

    def _agent_is_active(self, agent_record) -> bool:
        """
        Read the `active` flag from a registry response.

        The contract-to-contract docs show this interface is still evolving, so
        this helper tolerates either mapping-style or attribute-style responses.
        """
        if agent_record is None:
            return False
        try:
            return bool(agent_record["active"])
        except Exception:
            return bool(getattr(agent_record, "active", False))

    def _agent_owner(self, agent_record) -> Address | None:
        if agent_record is None:
            return None
        try:
            return agent_record["owner"]
        except Exception:
            return getattr(agent_record, "owner", None)

    def _require_agent_sender(self, agent_id: str):
        registry = AgentRegistryContractIface(self.agent_registry)
        agent = registry.view().get_agent(agent_id)
        if not self._agent_is_active(agent):
            raise gl.vm.UserError(ERR_AGENT_DISABLED)
        owner = self._agent_owner(agent)
        if owner != gl.message.sender_address:
            raise gl.vm.UserError(ERR_UNAUTHORIZED)
        return agent

    @gl.public.write
    def create_task(
        self,
        task_id: str,
        reward: int,
        deadline: int,
        task_mode: str,
        metadata_uri: str,
        metadata_hash: str,
    ) -> None:
        """Create a new task record before escrow is funded."""
        if task_id in self.tasks:
            raise gl.vm.UserError(ERR_TASK_EXISTS)
        if reward <= 0:
            raise gl.vm.UserError(ERR_REWARD_REQUIRED)
        if deadline <= 0:
            raise gl.vm.UserError(ERR_INVALID_DEADLINE)

        self.tasks[task_id] = TaskRecord(
            creator=gl.message.sender_address,
            reward=u256(reward),
            deadline=u256(deadline),
            task_mode=task_mode,
            metadata_uri=metadata_uri,
            metadata_hash=metadata_hash,
            state=TASK_STATE_CREATED,
            assigned_agent_id="",
            escrow_locked=u256(0),
            dispute_paused=False,
            settled_submission_id="",
            review_round=u256(0),
            review_outcome="pending",
            consensus_score=u256(0),
            validator_agreement_bps=u256(0),
            consensus_confidence_bps=u256(0),
            evaluation_hash="",
        )
        self.task_to_submission_ids[task_id] = []
        self._record_event(EVENT_TASK_CREATED, task_id, "", metadata_hash)

    @gl.public.write.payable
    def fund_task(self, task_id: str) -> None:
        """Lock the exact task reward into escrow and open the task."""
        task = self._require_creator(task_id)
        if task.state != TASK_STATE_CREATED:
            raise gl.vm.UserError(ERR_ALREADY_FUNDED if task.state == TASK_STATE_ESCROW_FUNDED else ERR_INVALID_STATE)
        if gl.message.value != task.reward:
            raise gl.vm.UserError(ERR_ESCROW_MISMATCH)

        task.escrow_locked = gl.message.value
        task.state = TASK_STATE_ESCROW_FUNDED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_ESCROW_FUNDED, task_id, "", str(gl.message.value))
        task.state = TASK_STATE_OPEN
        self.tasks[task_id] = task

    @gl.public.write
    def assign_task(self, task_id: str, agent_id: str) -> None:
        """Assign an open task to a chosen active agent."""
        task = self._require_creator(task_id)
        if task.state != TASK_STATE_OPEN:
            raise gl.vm.UserError(ERR_ALREADY_ASSIGNED if task.state == TASK_STATE_ASSIGNED else ERR_INVALID_STATE)
        registry = AgentRegistryContractIface(self.agent_registry)
        agent = registry.view().get_agent(agent_id)
        if not self._agent_is_active(agent):
            raise gl.vm.UserError(ERR_AGENT_DISABLED)

        task.assigned_agent_id = agent_id
        task.state = TASK_STATE_ASSIGNED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_ASSIGNED, task_id, agent_id, "assigned")

    @gl.public.write
    def start_execution(self, task_id: str, agent_id: str) -> None:
        """Mark an assigned task as actively executing by its assigned agent."""
        task = self._require_task(task_id)
        if task.state != TASK_STATE_ASSIGNED:
            raise gl.vm.UserError(ERR_INVALID_STATE)
        if task.assigned_agent_id != agent_id:
            raise gl.vm.UserError(ERR_INVALID_AGENT)
        self._require_agent_sender(agent_id)

        task.state = TASK_STATE_EXECUTING
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_EXECUTION_STARTED, task_id, agent_id, "executing")

    @gl.public.write
    def submit_task(
        self,
        task_id: str,
        submission_id: str,
        agent_id: str,
        result_hash: str,
        metadata_uri: str,
        metadata_hash: str,
    ) -> None:
        """Anchor a submission hash and metadata pointer for the task."""
        task = self._require_task(task_id)
        if task.state not in [TASK_STATE_ASSIGNED, TASK_STATE_EXECUTING, TASK_STATE_SUBMITTED]:
            raise gl.vm.UserError(ERR_INVALID_STATE)
        if task.assigned_agent_id != "" and task.assigned_agent_id != agent_id:
            raise gl.vm.UserError(ERR_INVALID_AGENT)
        if task.task_mode == TASK_MODE_SINGLE and len(self.task_to_submission_ids[task_id]) >= 1:
            raise gl.vm.UserError(ERR_SUBMISSION_MODE)
        self._require_agent_sender(agent_id)

        self.submissions[submission_id] = SubmissionRecord(
            task_id=task_id,
            agent_id=agent_id,
            submitter=gl.message.sender_address,
            result_hash=result_hash,
            metadata_uri=metadata_uri,
            metadata_hash=metadata_hash,
            created_at=self._next_timestamp(),
        )
        self.task_to_submission_ids[task_id].append(submission_id)
        task.state = TASK_STATE_SUBMITTED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_SUBMITTED, task_id, agent_id, result_hash)

    @gl.public.write
    def start_review(self, task_id: str) -> None:
        """Move a submitted task into review before approval, rejection, or dispute."""
        task = self._require_creator(task_id)
        if task.state != TASK_STATE_SUBMITTED:
            raise gl.vm.UserError(ERR_INVALID_STATE)

        task.state = TASK_STATE_UNDER_REVIEW
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_REVIEW_STARTED, task_id, task.assigned_agent_id, "under_review")

    def _coerce_review_outcome(
        self,
        requested_outcome: str,
        consensus_score: int,
        validator_agreement_bps: int,
        consensus_confidence_bps: int,
    ) -> str:
        """
        Apply an equivalence-aware acceptance gate.

        This is the contract-level anchor for Bradbury-style subjective finalization:
        even if offchain validators disagree on wording, the contract only accepts a
        result when the scored outcome is equivalent enough to a successful task
        completion across score, agreement, and confidence thresholds.
        """
        if requested_outcome not in ["accepted", "rejected", "disputed", "unresolved"]:
            raise gl.vm.UserError(ERR_INVALID_REVIEW_OUTCOME)
        if requested_outcome == "accepted":
            if consensus_score >= 72 and validator_agreement_bps >= 6600 and consensus_confidence_bps >= 6200:
                return "accepted"
            return "unresolved"
        if requested_outcome == "rejected":
            if consensus_score <= 55 and validator_agreement_bps >= 6600:
                return "rejected"
            return "disputed"
        return requested_outcome

    @gl.public.write
    def finalize_review(
        self,
        task_id: str,
        submission_id: str,
        requested_outcome: str,
        consensus_score: int,
        validator_agreement_bps: int,
        consensus_confidence_bps: int,
        evaluation_hash: str,
    ) -> None:
        """Anchor the review round, consensus inputs, and final review outcome before settlement."""
        task = self._require_creator(task_id)
        self._require_submission(task_id, submission_id)
        if task.state not in [
            TASK_STATE_SUBMITTED,
            TASK_STATE_UNDER_REVIEW,
            TASK_STATE_DISPUTED,
            TASK_STATE_APPEALED,
            TASK_STATE_UNRESOLVED,
        ]:
            raise gl.vm.UserError(ERR_INVALID_STATE)

        outcome = self._coerce_review_outcome(
            requested_outcome,
            consensus_score,
            validator_agreement_bps,
            consensus_confidence_bps,
        )
        task.review_round = task.review_round + 1
        task.review_outcome = outcome
        task.consensus_score = u256(consensus_score)
        task.validator_agreement_bps = u256(validator_agreement_bps)
        task.consensus_confidence_bps = u256(consensus_confidence_bps)
        task.evaluation_hash = evaluation_hash
        task.dispute_paused = outcome in ["disputed", "unresolved"]
        if outcome == "accepted":
            task.state = TASK_STATE_APPROVED
            task.settled_submission_id = submission_id
            self._record_event(EVENT_TASK_APPROVED, task_id, task.assigned_agent_id, submission_id)
        elif outcome == "rejected":
            task.state = TASK_STATE_REJECTED
            self._record_event(EVENT_TASK_REJECTED, task_id, task.assigned_agent_id, submission_id)
        elif outcome == "disputed":
            task.state = TASK_STATE_DISPUTED
            self._record_event(EVENT_TASK_DISPUTED, task_id, task.assigned_agent_id, evaluation_hash)
        else:
            task.state = TASK_STATE_UNRESOLVED
            self._record_event(EVENT_TASK_UNRESOLVED, task_id, task.assigned_agent_id, evaluation_hash)
        self.tasks[task_id] = task
        self._record_event(
            EVENT_TASK_REVIEW_FINALIZED,
            task_id,
            task.assigned_agent_id,
            f"{outcome}:{consensus_score}:{validator_agreement_bps}:{consensus_confidence_bps}",
        )

    @gl.public.write
    def approve_submission(self, task_id: str, submission_id: str) -> None:
        """Approve a specific submission so the task can be settled."""
        task = self._require_creator(task_id)
        self._require_submission(task_id, submission_id)
        if task.state not in [TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW]:
            raise gl.vm.UserError(ERR_INVALID_STATE)

        task.state = TASK_STATE_APPROVED
        task.settled_submission_id = submission_id
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_APPROVED, task_id, task.assigned_agent_id, submission_id)

    @gl.public.write
    def reject_submission(self, task_id: str, submission_id: str) -> None:
        """Reject a submission so the task can move toward refund or dispute."""
        task = self._require_creator(task_id)
        self._require_submission(task_id, submission_id)
        if task.state not in [TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW]:
            raise gl.vm.UserError(ERR_INVALID_STATE)

        task.state = TASK_STATE_REJECTED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_REJECTED, task_id, task.assigned_agent_id, submission_id)

    @gl.public.write
    def dispute_task(self, task_id: str, dispute_hash: str) -> None:
        """Pause settlement when a task enters a dispute for later subjective review."""
        task = self._require_task(task_id)
        if task.state not in [TASK_STATE_SUBMITTED, TASK_STATE_UNDER_REVIEW, TASK_STATE_REJECTED]:
            raise gl.vm.UserError(ERR_INVALID_STATE)

        task.state = TASK_STATE_DISPUTED
        task.dispute_paused = True
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_DISPUTED, task_id, task.assigned_agent_id, dispute_hash)

    @gl.public.write
    def appeal_task(self, task_id: str, appeal_hash: str) -> None:
        """Open a new appeal round for disputed, rejected, or unresolved tasks."""
        task = self._require_creator(task_id)
        if task.state not in [TASK_STATE_DISPUTED, TASK_STATE_REJECTED, TASK_STATE_UNRESOLVED]:
            raise gl.vm.UserError(ERR_APPEAL_NOT_ALLOWED)
        task.state = TASK_STATE_APPEALED
        task.dispute_paused = True
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_APPEALED, task_id, task.assigned_agent_id, appeal_hash)

    @gl.public.write
    def settle_task(self, task_id: str) -> None:
        """Finalize payout, deduct the protocol fee, and mark the task as settled."""
        task = self._require_task(task_id)
        if task.state == TASK_STATE_SETTLED:
            raise gl.vm.UserError(ERR_ALREADY_SETTLED)
        if task.state == TASK_STATE_DISPUTED:
            raise gl.vm.UserError(ERR_DISPUTE_REQUIRED)
        if task.state != TASK_STATE_APPROVED or task.review_outcome != "accepted":
            raise gl.vm.UserError(ERR_SETTLEMENT_NOT_ELIGIBLE)

        fee_amount = (task.escrow_locked * self.protocol_fee_bps) // u256(10_000)
        payout_amount = task.escrow_locked - fee_amount

        if fee_amount > 0:
            gl.ContractAt(self.treasury).emit_transfer(value=fee_amount)
        if payout_amount > 0:
            winner_submission = self.submissions[task.settled_submission_id]
            gl.ContractAt(winner_submission.submitter).emit_transfer(value=payout_amount)

        task.state = TASK_STATE_SETTLED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_SETTLED, task_id, task.assigned_agent_id, str(payout_amount))

    @gl.public.write
    def cancel_task(self, task_id: str) -> None:
        """Cancel an unassigned task before execution has started."""
        task = self._require_creator(task_id)
        if task.state not in [TASK_STATE_CREATED, TASK_STATE_OPEN]:
            raise gl.vm.UserError(ERR_CANCEL_NOT_ALLOWED)
        task.state = TASK_STATE_CANCELLED
        self.tasks[task_id] = task

    @gl.public.write
    def refund_task(self, task_id: str) -> None:
        """Refund escrow to the creator after cancellation or rejection."""
        task = self._require_creator(task_id)
        if task.state not in [TASK_STATE_REJECTED, TASK_STATE_CANCELLED]:
            raise gl.vm.UserError(ERR_REFUND_NOT_ALLOWED)

        refund_amount = task.escrow_locked
        if refund_amount > 0:
            gl.ContractAt(task.creator).emit_transfer(value=refund_amount)
        task.state = TASK_STATE_REFUNDED
        self.tasks[task_id] = task
        self._record_event(EVENT_TASK_REFUNDED, task_id, task.assigned_agent_id, str(refund_amount))

    @gl.public.view
    def get_task(self, task_id: str) -> TaskRecord | None:
        """Return a single task record for UI and backend reads."""
        if task_id not in self.tasks:
            return None
        return self.tasks[task_id]

    @gl.public.view
    def get_submission(self, submission_id: str) -> SubmissionRecord | None:
        """Return a single submission record for audit and review flows."""
        if submission_id not in self.submissions:
            return None
        return self.submissions[submission_id]

    @gl.public.view
    def get_submission_ids(self, task_id: str) -> DynArray[str]:
        """Return all anchored submission IDs for a task."""
        if task_id not in self.task_to_submission_ids:
            return []
        return self.task_to_submission_ids[task_id]

    @gl.public.view
    def get_events(self) -> DynArray[EventRecord]:
        """Return the storage-backed event feed until a native event API is adopted."""
        return self.event_log

    @gl.public.view
    def get_public_schema(self) -> dict:
        """Expose a small schema summary for frontend integration and admin tooling."""
        return {
            "task_states": [
                TASK_STATE_CREATED,
                TASK_STATE_ESCROW_FUNDED,
                TASK_STATE_OPEN,
                TASK_STATE_ASSIGNED,
                TASK_STATE_EXECUTING,
                TASK_STATE_SUBMITTED,
                TASK_STATE_UNDER_REVIEW,
                TASK_STATE_APPROVED,
                TASK_STATE_REJECTED,
                TASK_STATE_DISPUTED,
                TASK_STATE_APPEALED,
                TASK_STATE_UNRESOLVED,
                TASK_STATE_SETTLED,
                TASK_STATE_CANCELLED,
                TASK_STATE_REFUNDED,
            ],
            "submission_modes": [TASK_MODE_SINGLE, TASK_MODE_MULTI],
            "supports_subjective_dispute_pause": True,
            "supports_appeals": True,
            "supports_equivalence_gated_review": True,
        }
