# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *

TASK_STATE_CREATED = "CREATED"
TASK_STATE_ESCROW_FUNDED = "ESCROW_FUNDED"
TASK_STATE_OPEN = "OPEN"
TASK_STATE_ASSIGNED = "ASSIGNED"
TASK_STATE_EXECUTING = "EXECUTING"
TASK_STATE_SUBMITTED = "SUBMITTED"
TASK_STATE_UNDER_REVIEW = "UNDER_REVIEW"
TASK_STATE_APPROVED = "APPROVED"
TASK_STATE_REJECTED = "REJECTED"
TASK_STATE_DISPUTED = "DISPUTED"
TASK_STATE_SETTLED = "SETTLED"
TASK_STATE_CANCELLED = "CANCELLED"
TASK_STATE_REFUNDED = "REFUNDED"

TASK_MODE_SINGLE = "SINGLE_SUBMISSION"
TASK_MODE_MULTI = "MULTI_SUBMISSION"

EVENT_TASK_CREATED = "TaskCreated"
EVENT_TASK_ESCROW_FUNDED = "TaskEscrowFunded"
EVENT_TASK_ASSIGNED = "TaskAssigned"
EVENT_TASK_EXECUTION_STARTED = "TaskExecutionStarted"
EVENT_TASK_SUBMITTED = "TaskSubmitted"
EVENT_TASK_REVIEW_STARTED = "TaskReviewStarted"
EVENT_TASK_APPROVED = "TaskApproved"
EVENT_TASK_REJECTED = "TaskRejected"
EVENT_TASK_DISPUTED = "TaskDisputed"
EVENT_TASK_SETTLED = "TaskSettled"
EVENT_TASK_REFUNDED = "TaskRefunded"
EVENT_AGENT_REGISTERED = "AgentRegistered"
EVENT_AGENT_UPDATED = "AgentUpdated"
EVENT_AGENT_DISABLED = "AgentDisabled"

ERR_UNAUTHORIZED = "ERR_UNAUTHORIZED"
ERR_INVALID_STATE = "ERR_INVALID_STATE"
ERR_TASK_EXISTS = "ERR_TASK_EXISTS"
ERR_TASK_NOT_FOUND = "ERR_TASK_NOT_FOUND"
ERR_AGENT_EXISTS = "ERR_AGENT_EXISTS"
ERR_AGENT_NOT_FOUND = "ERR_AGENT_NOT_FOUND"
ERR_AGENT_DISABLED = "ERR_AGENT_DISABLED"
ERR_INVALID_DEADLINE = "ERR_INVALID_DEADLINE"
ERR_REWARD_REQUIRED = "ERR_REWARD_REQUIRED"
ERR_ESCROW_MISMATCH = "ERR_ESCROW_MISMATCH"
ERR_ALREADY_FUNDED = "ERR_ALREADY_FUNDED"
ERR_ALREADY_ASSIGNED = "ERR_ALREADY_ASSIGNED"
ERR_SUBMISSION_MODE = "ERR_SUBMISSION_MODE"
ERR_SUBMISSION_NOT_FOUND = "ERR_SUBMISSION_NOT_FOUND"
ERR_ALREADY_SETTLED = "ERR_ALREADY_SETTLED"
ERR_DISPUTE_REQUIRED = "ERR_DISPUTE_REQUIRED"
ERR_REFUND_NOT_ALLOWED = "ERR_REFUND_NOT_ALLOWED"
ERR_CANCEL_NOT_ALLOWED = "ERR_CANCEL_NOT_ALLOWED"
ERR_INVALID_AGENT = "ERR_INVALID_AGENT"
ERR_PROTOCOL_FEE = "ERR_PROTOCOL_FEE"




@allow_storage
@dataclass
class AgentRecord:
    owner: Address
    active_version_hash: str
    metadata_uri: str
    metadata_hash: str
    active: bool


@allow_storage
@dataclass
class EventRecord:
    event_id: str
    event_name: str
    subject_id: str
    actor: Address
    timestamp: u256
    payload: str


class AgentRegistryContract(gl.Contract):
    owner: Address
    agents: TreeMap[str, AgentRecord]
    owner_to_agents: TreeMap[Address, DynArray[str]]
    event_log: DynArray[EventRecord]
    clock: u256

    def __init__(self):
        self.owner = gl.message.sender_address
        self.clock = u256(0)

    def _next_timestamp(self) -> u256:
        self.clock = self.clock + 1
        return self.clock

    def _require_owner(self, agent_id: str) -> AgentRecord:
        if agent_id not in self.agents:
            raise gl.vm.UserError(ERR_AGENT_NOT_FOUND)
        record = self.agents[agent_id]
        if record.owner != gl.message.sender_address:
            raise gl.vm.UserError(ERR_UNAUTHORIZED)
        return record

    def _record_event(self, event_name: str, subject_id: str, payload: str) -> None:
        """
        Persist an event-like record for indexing.

        Uncertainty note:
        the docs reviewed did not expose a dedicated stable event emission API,
        so this contract stores events explicitly and prints a compact execution log.
        """
        ts = self._next_timestamp()
        event_id = f"{event_name}:{subject_id}:{ts}"
        self.event_log.append(
            EventRecord(
                event_id=event_id,
                event_name=event_name,
                subject_id=subject_id,
                actor=gl.message.sender_address,
                timestamp=ts,
                payload=payload,
            )
        )
        print(f"event={event_name} subject={subject_id} payload={payload}")

    @gl.public.write
    def register_agent(
        self,
        agent_id: str,
        active_version_hash: str,
        metadata_uri: str,
        metadata_hash: str,
    ) -> None:
        """Register a new agent identity owned by the transaction sender."""
        if agent_id in self.agents:
            raise gl.vm.UserError(ERR_AGENT_EXISTS)

        self.agents[agent_id] = AgentRecord(
            owner=gl.message.sender_address,
            active_version_hash=active_version_hash,
            metadata_uri=metadata_uri,
            metadata_hash=metadata_hash,
            active=True,
        )
        if gl.message.sender_address not in self.owner_to_agents:
            self.owner_to_agents[gl.message.sender_address] = []
        self.owner_to_agents[gl.message.sender_address].append(agent_id)
        self._record_event(EVENT_AGENT_REGISTERED, agent_id, metadata_hash)

    @gl.public.write
    def update_agent(
        self,
        agent_id: str,
        active_version_hash: str,
        metadata_uri: str,
        metadata_hash: str,
    ) -> None:
        """Update the active version and public metadata for an owned agent."""
        record = self._require_owner(agent_id)
        record.active_version_hash = active_version_hash
        record.metadata_uri = metadata_uri
        record.metadata_hash = metadata_hash
        self.agents[agent_id] = record
        self._record_event(EVENT_AGENT_UPDATED, agent_id, metadata_hash)

    @gl.public.write
    def disable_agent(self, agent_id: str) -> None:
        """Deactivate an owned agent so it can no longer be assigned new tasks."""
        record = self._require_owner(agent_id)
        record.active = False
        self.agents[agent_id] = record
        self._record_event(EVENT_AGENT_DISABLED, agent_id, "disabled")

    @gl.public.view
    def get_agent(self, agent_id: str) -> AgentRecord | None:
        """Return a single agent record for frontend and indexer queries."""
        if agent_id not in self.agents:
            return None
        return self.agents[agent_id]

    @gl.public.view
    def get_agent_ids_by_owner(self, owner_address: str) -> DynArray[str]:
        """Return all agent IDs owned by a wallet address."""
        owner = Address(owner_address)
        if owner not in self.owner_to_agents:
            return []
        return self.owner_to_agents[owner]

    @gl.public.view
    def get_events(self) -> DynArray[EventRecord]:
        """Return the in-contract event log until a native event API is adopted."""
        return self.event_log

