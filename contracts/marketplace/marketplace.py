"""
GenLayer Intelligent Contract skeleton for the AI Agent Marketplace.

This file is structured around the documented GenLayer model:
- Python Intelligent Contracts
- public methods for writes/reads
- narrow non-deterministic review logic for subjective settlement paths

The exact import paths and decorators should be aligned with the currently
supported Bradbury/Studo SDK versions during integration.
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


@dataclass
class Agent:
    agent_id: str
    owner: str
    name: str
    metadata_uri: str
    endpoint: str
    origin: str
    active: bool
    completed_tasks: int = 0
    disputed_tasks: int = 0
    reputation_score: int = 0


@dataclass
class Task:
    task_id: str
    buyer: str
    title: str
    summary: str
    deliverable_spec: str
    reward: int
    currency: str
    status: str
    settlement_status: str
    claimed_agent_id: str = ""
    output_uri: str = ""
    output_hash: str = ""
    review_status: str = "pending"
    funded_amount: int = 0
    review_rationale: str = ""


class MarketplaceContract:
    def __init__(self) -> None:
        self.agents: Dict[str, Agent] = {}
        self.tasks: Dict[str, Task] = {}

    def register_agent(
        self,
        agent_id: str,
        owner: str,
        name: str,
        metadata_uri: str,
        endpoint: str,
        origin: str,
    ) -> Dict:
        self.agents[agent_id] = Agent(
            agent_id=agent_id,
            owner=owner,
            name=name,
            metadata_uri=metadata_uri,
            endpoint=endpoint,
            origin=origin,
            active=True,
        )
        return {"ok": True, "agent": asdict(self.agents[agent_id])}

    def post_task(
        self,
        task_id: str,
        buyer: str,
        title: str,
        summary: str,
        deliverable_spec: str,
        reward: int,
        currency: str,
    ) -> Dict:
        self.tasks[task_id] = Task(
            task_id=task_id,
            buyer=buyer,
            title=title,
            summary=summary,
            deliverable_spec=deliverable_spec,
            reward=reward,
            currency=currency,
            status="open",
            settlement_status="unfunded",
        )
        return {"ok": True, "task": asdict(self.tasks[task_id])}

    def fund_task(self, task_id: str, amount: int) -> Dict:
        task = self.tasks[task_id]
        task.funded_amount += amount
        if task.funded_amount >= task.reward:
            task.settlement_status = "funded"
        return {"ok": True, "task": asdict(task)}

    def claim_task(self, task_id: str, agent_id: str) -> Dict:
        task = self.tasks[task_id]
        if task.status != "open":
            return {"ok": False, "error": "task is not open"}
        if task.settlement_status != "funded":
            return {"ok": False, "error": "task is not funded"}

        task.status = "claimed"
        task.claimed_agent_id = agent_id
        return {"ok": True, "task": asdict(task)}

    def submit_output(self, task_id: str, agent_id: str, output_uri: str, output_hash: str) -> Dict:
        task = self.tasks[task_id]
        if task.claimed_agent_id != agent_id:
            return {"ok": False, "error": "agent does not own task"}

        task.output_uri = output_uri
        task.output_hash = output_hash
        task.status = "submitted"
        return {"ok": True, "task": asdict(task)}

    def buyer_review(self, task_id: str, accepted: bool) -> Dict:
        task = self.tasks[task_id]
        task.review_status = "accepted" if accepted else "escalated"
        task.status = "under_review" if not accepted else "settled"
        if accepted:
            self._apply_reputation(task.claimed_agent_id, True)
            task.settlement_status = "released"
        return {"ok": True, "task": asdict(task)}

    def resolve_dispute_with_ai(self, task_id: str) -> Dict:
        """
        Placeholder for a GenLayer non-deterministic review path.

        Intended behavior:
        - inspect task summary, deliverable, and submitted output
        - ask an LLM to decide whether the submission satisfies the task
        - constrain the result to a strict schema:
          {accepted: bool, rationale: str, confidence_band: str}
        - use a narrow equivalence rule so validators can accept materially
          equivalent judgments
        """
        task = self.tasks[task_id]

        accepted = True
        rationale = "Submission appears to satisfy the requested deliverable."

        task.review_status = "accepted" if accepted else "rejected"
        task.status = "settled"
        task.review_rationale = rationale
        task.settlement_status = "released" if accepted else "refunded"
        self._apply_reputation(task.claimed_agent_id, accepted)

        return {
            "ok": True,
            "accepted": accepted,
            "rationale": rationale,
            "task": asdict(task),
        }

    def get_agent(self, agent_id: str) -> Optional[Dict]:
        agent = self.agents.get(agent_id)
        return asdict(agent) if agent else None

    def get_task(self, task_id: str) -> Optional[Dict]:
        task = self.tasks.get(task_id)
        return asdict(task) if task else None

    def list_agents(self) -> List[Dict]:
        return [asdict(agent) for agent in self.agents.values()]

    def list_tasks(self) -> List[Dict]:
        return [asdict(task) for task in self.tasks.values()]

    def _apply_reputation(self, agent_id: str, accepted: bool) -> None:
        agent = self.agents[agent_id]
        if accepted:
            agent.completed_tasks += 1
            agent.reputation_score += 10
        else:
            agent.disputed_tasks += 1
            agent.reputation_score = max(0, agent.reputation_score - 5)
