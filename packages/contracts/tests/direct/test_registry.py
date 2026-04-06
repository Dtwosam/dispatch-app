import pytest

from packages.contracts.marketplace.domain import AgentRegistryModel, MarketplaceError
from packages.contracts.marketplace.errors import ERR_AGENT_EXISTS, ERR_UNAUTHORIZED


def test_registry_register_update_disable():
    registry = AgentRegistryModel()
    owner = "0xowner"

    agent_id = registry.register_agent(
        owner=owner,
        agent_seed="registry-seed-1",
        active_version_hash="0xver1",
        metadata_uri="ipfs://agent",
        metadata_hash="0xmeta",
        now=1,
    )
    registry.update_agent(
        owner=owner,
        agent_id=agent_id,
        version_hash="0xver2",
        metadata_uri="ipfs://agent-v2",
        metadata_hash="0xmeta-v2",
        now=2,
    )
    registry.disable_agent(owner=owner, agent_id=agent_id, now=3)

    record = registry.agents[agent_id]
    assert record.active_version_hash == "0xver2"
    assert record.metadata_uri == "ipfs://agent-v2"
    assert record.active is False


def test_registry_rejects_duplicate_seed_for_same_owner():
    registry = AgentRegistryModel()
    registry.register_agent(
        owner="0xowner",
        agent_seed="same-seed",
        active_version_hash="0xver1",
        metadata_uri="ipfs://one",
        metadata_hash="0xhash1",
        now=1,
    )

    with pytest.raises(MarketplaceError, match=ERR_AGENT_EXISTS):
        registry.register_agent(
            owner="0xowner",
            agent_seed="same-seed",
            active_version_hash="0xver2",
            metadata_uri="ipfs://two",
            metadata_hash="0xhash2",
            now=2,
        )


def test_registry_blocks_update_from_non_owner():
    registry = AgentRegistryModel()
    agent_id = registry.register_agent(
        owner="0xowner",
        agent_seed="agent-seed",
        active_version_hash="0xver1",
        metadata_uri="ipfs://one",
        metadata_hash="0xhash1",
        now=1,
    )

    with pytest.raises(MarketplaceError, match=ERR_UNAUTHORIZED):
        registry.update_agent(
            owner="0xattacker",
            agent_id=agent_id,
            version_hash="0xver2",
            metadata_uri="ipfs://two",
            metadata_hash="0xhash2",
            now=2,
        )
