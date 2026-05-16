# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *


TASK_CREATED = "created"
TASK_FUNDED = "funded"
TASK_ASSIGNED = "assigned"
TASK_SUBMITTED = "submitted"
TASK_UNDER_REVIEW = "under_review"
TASK_ACCEPTED = "accepted"
TASK_REJECTED = "rejected"
TASK_DISPUTED = "disputed"
TASK_APPEALED = "appealed"
TASK_UNRESOLVED = "unresolved"
TASK_SETTLED = "settled"


@allow_storage
@dataclass
class AgentRecord:
    owner: Address
    name: str
    endpoint_hash: str
    skills: str
    tasks_completed: u256
    average_score: u256
    active: bool


@allow_storage
@dataclass
class TaskRecord:
    buyer: Address
    title: str
    spec_hash: str
    reward: u256
    state: str
    agent_id: str
    result_hash: str
    consensus_score: u256
    validator_agreement: u256
    consensus_confidence: u256
    final_outcome: str
    appeal_round: u256
    settlement_eligible: bool


@allow_storage
@dataclass
class ReviewInput:
    validator_id: str
    score: u256
    confidence: u256
    accepted: bool
    reasoning_hash: str
    equivalence_summary: str


@allow_storage
@dataclass
class EventRecord:
    event_type: str
    task_id: str
    detail: str
    actor: Address


class DispatchMarketplace(gl.Contract):
    """GenLayer Intelligent Contract for Dispatch marketplace review.

    The contract anchors the work marketplace lifecycle: task identity, agent
    identity, funding intent, result hash, Optimistic Democracy review inputs,
    equivalence-aware finalization, appeal state, and settlement eligibility.
    Heavy execution and rich artifact storage stay offchain.
    """

    agents: TreeMap[str, AgentRecord]
    tasks: TreeMap[str, TaskRecord]
    reviews: TreeMap[str, DynArray[ReviewInput]]
    events: DynArray[EventRecord]
    min_score: u256
    min_agreement: u256
    min_confidence: u256

    def __init__(self):
        self.agents = TreeMap[str, AgentRecord]()
        self.tasks = TreeMap[str, TaskRecord]()
        self.reviews = TreeMap[str, DynArray[ReviewInput]]()
        self.events = []
        self.min_score = 70
        self.min_agreement = 67
        self.min_confidence = 60

    def _require_task(self, task_id: str) -> TaskRecord:
        assert task_id in self.tasks, "TASK_NOT_FOUND"
        return self.tasks[task_id]

    def _emit(self, event_type: str, task_id: str, detail: str):
        self.events.append(EventRecord(event_type, task_id, detail, gl.message.sender_address))

    @gl.public.write
    def register_agent(self, agent_id: str, name: str, endpoint_hash: str, skills: str):
        assert agent_id not in self.agents, "AGENT_ALREADY_EXISTS"
        self.agents[agent_id] = AgentRecord(
            owner=gl.message.sender_address,
            name=name,
            endpoint_hash=endpoint_hash,
            skills=skills,
            tasks_completed=0,
            average_score=0,
            active=True,
        )
        self._emit("AgentRegistered", "", agent_id)

    @gl.public.write.payable
    def create_funded_task(self, task_id: str, title: str, spec_hash: str):
        assert task_id not in self.tasks, "TASK_ALREADY_EXISTS"
        assert gl.message.value > 0, "REWARD_REQUIRED"
        self.tasks[task_id] = TaskRecord(
            buyer=gl.message.sender_address,
            title=title,
            spec_hash=spec_hash,
            reward=gl.message.value,
            state=TASK_FUNDED,
            agent_id="",
            result_hash="",
            consensus_score=0,
            validator_agreement=0,
            consensus_confidence=0,
            final_outcome="",
            appeal_round=0,
            settlement_eligible=False,
        )
        self.reviews[task_id] = []
        self._emit("TaskFunded", task_id, spec_hash)

    @gl.public.write
    def assign_task(self, task_id: str, agent_id: str):
        task = self._require_task(task_id)
        assert task.buyer == gl.message.sender_address, "ONLY_BUYER"
        assert task.state == TASK_FUNDED, "TASK_NOT_FUNDED"
        assert agent_id in self.agents, "AGENT_NOT_FOUND"
        agent = self.agents[agent_id]
        assert agent.active, "AGENT_INACTIVE"
        task.agent_id = agent_id
        task.state = TASK_ASSIGNED
        self.tasks[task_id] = task
        self._emit("TaskAssigned", task_id, agent_id)

    @gl.public.write
    def submit_result(self, task_id: str, result_hash: str):
        task = self._require_task(task_id)
        assert task.state == TASK_ASSIGNED, "TASK_NOT_ASSIGNED"
        assert task.agent_id in self.agents, "AGENT_NOT_FOUND"
        agent = self.agents[task.agent_id]
        assert agent.owner == gl.message.sender_address, "ONLY_ASSIGNED_AGENT"
        task.result_hash = result_hash
        task.state = TASK_SUBMITTED
        self.tasks[task_id] = task
        self._emit("ResultSubmitted", task_id, result_hash)

    @gl.public.write
    def finalize_review(self, task_id: str, review_inputs: DynArray[ReviewInput]):
        task = self._require_task(task_id)
        assert task.state in [TASK_SUBMITTED, TASK_APPEALED], "RESULT_NOT_REVIEWABLE"
        assert len(review_inputs) >= 3, "THREE_VALIDATORS_REQUIRED"

        accepted_count = 0
        total_score = 0
        total_confidence = 0
        normalized_reviews = []

        for review in review_inputs:
            assert review.score <= 100, "SCORE_OUT_OF_RANGE"
            assert review.confidence <= 100, "CONFIDENCE_OUT_OF_RANGE"
            total_score += review.score
            total_confidence += review.confidence
            if review.accepted:
                accepted_count += 1
            normalized_reviews.append(review)

        validator_count = len(review_inputs)
        consensus_score = total_score // validator_count
        agreement = (accepted_count * 100) // validator_count
        confidence = total_confidence // validator_count

        task.state = TASK_UNDER_REVIEW
        task.consensus_score = consensus_score
        task.validator_agreement = agreement
        task.consensus_confidence = confidence
        task.settlement_eligible = False

        if consensus_score >= self.min_score and agreement >= self.min_agreement and confidence >= self.min_confidence:
            task.state = TASK_ACCEPTED
            task.final_outcome = "accepted"
            task.settlement_eligible = True
        elif agreement <= 34:
            task.state = TASK_REJECTED
            task.final_outcome = "rejected"
        elif confidence < self.min_confidence:
            task.state = TASK_UNRESOLVED
            task.final_outcome = "unresolved"
        else:
            task.state = TASK_DISPUTED
            task.final_outcome = "disputed"

        self.tasks[task_id] = task
        self.reviews[task_id] = normalized_reviews
        self._emit("ReviewFinalized", task_id, task.final_outcome)

    @gl.public.write
    def appeal_task(self, task_id: str, reason_hash: str):
        task = self._require_task(task_id)
        assert task.buyer == gl.message.sender_address, "ONLY_BUYER"
        assert task.state in [TASK_REJECTED, TASK_DISPUTED, TASK_UNRESOLVED], "TASK_NOT_APPEALABLE"
        task.state = TASK_APPEALED
        task.appeal_round += 1
        task.settlement_eligible = False
        self.tasks[task_id] = task
        self._emit("TaskAppealed", task_id, reason_hash)

    @gl.public.write
    def settle_task(self, task_id: str):
        task = self._require_task(task_id)
        assert task.buyer == gl.message.sender_address, "ONLY_BUYER"
        assert task.state == TASK_ACCEPTED, "TASK_NOT_ACCEPTED"
        assert task.settlement_eligible, "SETTLEMENT_NOT_ELIGIBLE"

        agent = self.agents[task.agent_id]
        previous_total = agent.average_score * agent.tasks_completed
        agent.tasks_completed += 1
        agent.average_score = (previous_total + task.consensus_score) // agent.tasks_completed
        self.agents[task.agent_id] = agent

        task.state = TASK_SETTLED
        task.settlement_eligible = False
        self.tasks[task_id] = task
        self._emit("TaskSettled", task_id, task.agent_id)

    @gl.public.view
    def get_task(self, task_id: str) -> TaskRecord:
        return self._require_task(task_id)

    @gl.public.view
    def get_agent(self, agent_id: str) -> AgentRecord:
        assert agent_id in self.agents, "AGENT_NOT_FOUND"
        return self.agents[agent_id]

    @gl.public.view
    def get_reviews(self, task_id: str) -> DynArray[ReviewInput]:
        assert task_id in self.reviews, "REVIEWS_NOT_FOUND"
        return self.reviews[task_id]

    @gl.public.view
    def get_events(self) -> DynArray[EventRecord]:
        return self.events

    @gl.public.view
    def get_public_schema(self) -> str:
        return (
            "register_agent(agent_id,name,endpoint_hash,skills); "
            "create_funded_task(task_id,title,spec_hash) payable; "
            "assign_task(task_id,agent_id); submit_result(task_id,result_hash); "
            "finalize_review(task_id,review_inputs[validator_id,score,confidence,accepted,reasoning_hash,equivalence_summary]); "
            "appeal_task(task_id,reason_hash); settle_task(task_id)"
        )
