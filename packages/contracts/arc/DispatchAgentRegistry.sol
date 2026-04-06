// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DispatchAgentRegistry {
    struct AgentRecord {
        address owner;
        string slug;
        string versionHash;
        string metadataUri;
        string metadataHash;
        bool active;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    mapping(string => AgentRecord) private agents;

    event AgentRegistered(string indexed agentId, address indexed owner, string slug);
    event AgentUpdated(string indexed agentId, string versionHash, string metadataUri);
    event AgentDisabled(string indexed agentId);

    modifier onlyAgentOwner(string calldata agentId) {
        AgentRecord storage record = agents[agentId];
        require(record.owner != address(0), "agent_missing");
        require(record.owner == msg.sender, "not_agent_owner");
        _;
    }

    function register_agent(
        string calldata agentId,
        string calldata slug,
        string calldata versionHash,
        string calldata metadataUri,
        string calldata metadataHash
    ) external {
        require(bytes(agentId).length > 0, "agent_id_required");
        require(bytes(slug).length > 0, "slug_required");
        require(agents[agentId].owner == address(0), "agent_exists");

        agents[agentId] = AgentRecord({
            owner: msg.sender,
            slug: slug,
            versionHash: versionHash,
            metadataUri: metadataUri,
            metadataHash: metadataHash,
            active: true,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        emit AgentRegistered(agentId, msg.sender, slug);
    }

    function update_agent(
        string calldata agentId,
        string calldata versionHash,
        string calldata metadataUri,
        string calldata metadataHash
    ) external onlyAgentOwner(agentId) {
        AgentRecord storage record = agents[agentId];
        record.versionHash = versionHash;
        record.metadataUri = metadataUri;
        record.metadataHash = metadataHash;
        record.active = true;
        record.updatedAt = uint64(block.timestamp);
        emit AgentUpdated(agentId, versionHash, metadataUri);
    }

    function disable_agent(string calldata agentId) external onlyAgentOwner(agentId) {
        AgentRecord storage record = agents[agentId];
        record.active = false;
        record.updatedAt = uint64(block.timestamp);
        emit AgentDisabled(agentId);
    }

    function ownerOfAgent(string calldata agentId) external view returns (address) {
        return agents[agentId].owner;
    }

    function isAgentActive(string calldata agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    function get_agent(
        string calldata agentId
    )
        external
        view
        returns (
            address owner,
            string memory slug,
            string memory versionHash,
            string memory metadataUri,
            string memory metadataHash,
            bool active,
            uint64 registeredAt,
            uint64 updatedAt
        )
    {
        AgentRecord storage record = agents[agentId];
        require(record.owner != address(0), "agent_missing");
        return (
            record.owner,
            record.slug,
            record.versionHash,
            record.metadataUri,
            record.metadataHash,
            record.active,
            record.registeredAt,
            record.updatedAt
        );
    }
}
