// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Arc {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IDispatchAgentRegistry {
    function ownerOfAgent(string calldata agentId) external view returns (address);
    function isAgentActive(string calldata agentId) external view returns (bool);
}

contract DispatchMarketplace {
    enum TaskState {
        NONE,
        CREATED,
        ESCROW_FUNDED,
        OPEN,
        ASSIGNED,
        EXECUTING,
        SUBMITTED,
        UNDER_REVIEW,
        APPROVED,
        REJECTED,
        DISPUTED,
        APPEALED,
        UNRESOLVED,
        SETTLED,
        CANCELLED,
        REFUNDED
    }

    struct TaskRecord {
        address creator;
        uint256 rewardAmount;
        uint64 deadlineTimestamp;
        string taskMode;
        string metadataUri;
        string metadataHash;
        TaskState state;
        uint256 escrowLocked;
        string assignedAgentId;
        string latestSubmissionId;
        string latestResultHash;
        string latestResultUri;
        string latestResultMetadataHash;
        string reviewOutcome;
        uint256 consensusScore;
        uint256 validatorAgreementBps;
        uint256 consensusConfidenceBps;
        string evaluationHash;
    }

    IERC20Arc public immutable paymentToken;
    IDispatchAgentRegistry public immutable agentRegistry;
    address public immutable platformTreasury;
    address public operator;
    uint16 public immutable platformFeeBps;

    mapping(string => TaskRecord) private tasks;

    event TaskCreated(string indexed taskId, address indexed creator, uint256 rewardAmount);
    event TaskFunded(string indexed taskId, uint256 rewardAmount);
    event TaskAssigned(string indexed taskId, string indexed agentId);
    event TaskExecutionStarted(string indexed taskId, string indexed agentId);
    event TaskSubmitted(string indexed taskId, string indexed submissionId);
    event TaskStateChanged(string indexed taskId, TaskState state);
    event TaskSettled(string indexed taskId, address indexed agentWallet, uint256 agentPayout, uint256 platformFee);
    event TaskRefunded(string indexed taskId, address indexed creator, uint256 amount);

    modifier onlyOperator() {
        require(msg.sender == operator, "not_operator");
        _;
    }

    modifier onlyCreator(string calldata taskId) {
        require(tasks[taskId].creator == msg.sender, "not_task_creator");
        _;
    }

    modifier onlyCreatorOrOperator(string calldata taskId) {
        require(tasks[taskId].creator == msg.sender || msg.sender == operator, "not_task_controller");
        _;
    }

    constructor(
        address paymentTokenAddress,
        address agentRegistryAddress,
        address platformTreasuryAddress,
        address operatorAddress,
        uint16 platformFeeBpsValue
    ) {
        require(paymentTokenAddress != address(0), "payment_token_required");
        require(agentRegistryAddress != address(0), "agent_registry_required");
        require(platformTreasuryAddress != address(0), "platform_treasury_required");
        paymentToken = IERC20Arc(paymentTokenAddress);
        agentRegistry = IDispatchAgentRegistry(agentRegistryAddress);
        platformTreasury = platformTreasuryAddress;
        operator = operatorAddress;
        platformFeeBps = platformFeeBpsValue;
    }

    function setOperator(address nextOperator) external onlyOperator {
        require(nextOperator != address(0), "operator_required");
        operator = nextOperator;
    }

    function create_task(
        string calldata taskId,
        uint256 rewardAmount,
        uint256 deadlineTimestamp,
        string calldata taskMode,
        string calldata metadataUri,
        string calldata metadataHash
    ) external {
        require(bytes(taskId).length > 0, "task_id_required");
        require(tasks[taskId].creator == address(0), "task_exists");
        require(rewardAmount > 0, "reward_required");
        TaskRecord storage record = tasks[taskId];
        record.creator = msg.sender;
        record.rewardAmount = rewardAmount;
        record.deadlineTimestamp = uint64(deadlineTimestamp);
        record.taskMode = taskMode;
        record.metadataUri = metadataUri;
        record.metadataHash = metadataHash;
        record.state = TaskState.CREATED;
        emit TaskCreated(taskId, msg.sender, rewardAmount);
    }

    function fund_task(string calldata taskId) external onlyCreator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.CREATED, "task_not_creatable");
        require(record.escrowLocked == 0, "already_funded");
        require(paymentToken.transferFrom(msg.sender, address(this), record.rewardAmount), "fund_transfer_failed");
        record.escrowLocked = record.rewardAmount;
        record.state = TaskState.ESCROW_FUNDED;
        emit TaskFunded(taskId, record.rewardAmount);
        record.state = TaskState.OPEN;
        emit TaskStateChanged(taskId, TaskState.OPEN);
    }

    function assign_task(string calldata taskId, string calldata agentId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.escrowLocked > 0, "escrow_required");
        require(record.state == TaskState.OPEN || record.state == TaskState.ESCROW_FUNDED, "task_not_assignable");
        require(agentRegistry.ownerOfAgent(agentId) != address(0), "agent_missing");
        require(agentRegistry.isAgentActive(agentId), "agent_inactive");
        record.assignedAgentId = agentId;
        record.state = TaskState.ASSIGNED;
        emit TaskAssigned(taskId, agentId);
        emit TaskStateChanged(taskId, TaskState.ASSIGNED);
    }

    function start_execution(string calldata taskId, string calldata agentId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.ASSIGNED, "task_not_assigned");
        require(_sameString(record.assignedAgentId, agentId), "wrong_agent");
        record.state = TaskState.EXECUTING;
        emit TaskExecutionStarted(taskId, agentId);
        emit TaskStateChanged(taskId, TaskState.EXECUTING);
    }

    function submit_task(
        string calldata taskId,
        string calldata agentId,
        string calldata submissionNonce,
        string calldata resultHash,
        string calldata metadataUri,
        string calldata metadataHash
    ) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.escrowLocked > 0, "escrow_required");
        require(record.state == TaskState.ASSIGNED || record.state == TaskState.EXECUTING, "task_not_running");
        require(_sameString(record.assignedAgentId, agentId), "wrong_agent");
        string memory submissionId = _submissionId(taskId, agentId, submissionNonce);
        record.latestSubmissionId = submissionId;
        record.latestResultHash = resultHash;
        record.latestResultUri = metadataUri;
        record.latestResultMetadataHash = metadataHash;
        record.state = TaskState.SUBMITTED;
        emit TaskSubmitted(taskId, submissionId);
        emit TaskStateChanged(taskId, TaskState.SUBMITTED);
    }

    function start_review(string calldata taskId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.SUBMITTED || record.state == TaskState.REJECTED, "review_not_open");
        record.state = TaskState.UNDER_REVIEW;
        emit TaskStateChanged(taskId, TaskState.UNDER_REVIEW);
    }

    function approve_submission(string calldata taskId, string calldata submissionId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(_sameString(record.latestSubmissionId, submissionId), "submission_missing");
        record.reviewOutcome = "accepted";
        record.state = TaskState.APPROVED;
        emit TaskStateChanged(taskId, TaskState.APPROVED);
    }

    function reject_submission(string calldata taskId, string calldata submissionId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(_sameString(record.latestSubmissionId, submissionId), "submission_missing");
        record.reviewOutcome = "rejected";
        record.state = TaskState.REJECTED;
        emit TaskStateChanged(taskId, TaskState.REJECTED);
    }

    function dispute_task(string calldata taskId, string calldata reasonHash) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.SUBMITTED || record.state == TaskState.UNDER_REVIEW || record.state == TaskState.APPROVED || record.state == TaskState.REJECTED, "dispute_not_open");
        record.reviewOutcome = reasonHash;
        record.state = TaskState.DISPUTED;
        emit TaskStateChanged(taskId, TaskState.DISPUTED);
    }

    function appeal_task(string calldata taskId, string calldata appealHash) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.DISPUTED || record.state == TaskState.REJECTED, "appeal_not_open");
        record.reviewOutcome = appealHash;
        record.state = TaskState.APPEALED;
        emit TaskStateChanged(taskId, TaskState.APPEALED);
    }

    function finalize_review(
        string calldata taskId,
        string calldata submissionId,
        string calldata requestedOutcome,
        uint256 consensusScore,
        uint256 validatorAgreementBps,
        uint256 consensusConfidenceBps,
        string calldata evaluationHash
    ) external onlyOperator {
        TaskRecord storage record = tasks[taskId];
        require(_sameString(record.latestSubmissionId, submissionId), "submission_missing");
        record.reviewOutcome = requestedOutcome;
        record.consensusScore = consensusScore;
        record.validatorAgreementBps = validatorAgreementBps;
        record.consensusConfidenceBps = consensusConfidenceBps;
        record.evaluationHash = evaluationHash;

        bytes32 outcome = keccak256(bytes(requestedOutcome));
        if (outcome == keccak256("accepted")) {
            record.state = TaskState.APPROVED;
        } else if (outcome == keccak256("rejected")) {
            record.state = TaskState.REJECTED;
        } else if (outcome == keccak256("disputed")) {
            record.state = TaskState.DISPUTED;
        } else {
            record.state = TaskState.UNRESOLVED;
        }
        emit TaskStateChanged(taskId, record.state);
    }

    function settle_task(string calldata taskId) external onlyOperator {
        TaskRecord storage record = tasks[taskId];
        require(record.state == TaskState.APPROVED, "task_not_approved");
        require(record.escrowLocked > 0, "escrow_missing");
        address agentWallet = agentRegistry.ownerOfAgent(record.assignedAgentId);
        require(agentWallet != address(0), "agent_wallet_missing");

        uint256 platformFee = (record.escrowLocked * platformFeeBps) / 10_000;
        uint256 agentPayout = record.escrowLocked - platformFee;
        record.escrowLocked = 0;
        record.state = TaskState.SETTLED;

        require(paymentToken.transfer(agentWallet, agentPayout), "agent_payout_failed");
        if (platformFee > 0) {
            require(paymentToken.transfer(platformTreasury, platformFee), "fee_payout_failed");
        }
        emit TaskSettled(taskId, agentWallet, agentPayout, platformFee);
        emit TaskStateChanged(taskId, TaskState.SETTLED);
    }

    function cancel_task(string calldata taskId) external onlyCreatorOrOperator(taskId) {
        TaskRecord storage record = tasks[taskId];
        require(
            record.state == TaskState.CREATED ||
            record.state == TaskState.OPEN ||
            record.state == TaskState.ASSIGNED,
            "task_not_cancellable"
        );
        record.state = TaskState.CANCELLED;
        emit TaskStateChanged(taskId, TaskState.CANCELLED);
    }

    function refund_task(string calldata taskId) external onlyOperator {
        TaskRecord storage record = tasks[taskId];
        require(
            record.state == TaskState.CANCELLED ||
            record.state == TaskState.REJECTED ||
            record.state == TaskState.UNRESOLVED ||
            record.state == TaskState.DISPUTED ||
            record.state == TaskState.APPEALED,
            "task_not_refundable"
        );
        require(record.escrowLocked > 0, "escrow_missing");
        uint256 amount = record.escrowLocked;
        record.escrowLocked = 0;
        record.state = TaskState.REFUNDED;
        require(paymentToken.transfer(record.creator, amount), "refund_transfer_failed");
        emit TaskRefunded(taskId, record.creator, amount);
        emit TaskStateChanged(taskId, TaskState.REFUNDED);
    }

    function get_task(
        string calldata taskId
    )
        external
        view
        returns (
            address creator,
            uint256 rewardAmount,
            uint64 deadlineTimestamp,
            string memory taskMode,
            string memory metadataUri,
            string memory metadataHash,
            string memory stateName,
            uint8 state,
            uint256 escrow_locked,
            string memory assignedAgentId,
            string memory latestSubmissionId,
            string memory latestResultHash,
            string memory latestResultUri,
            string memory latestResultMetadataHash,
            string memory reviewOutcome,
            uint256 consensusScore,
            uint256 validatorAgreementBps,
            uint256 consensusConfidenceBps,
            string memory evaluationHash
        )
    {
        TaskRecord storage record = tasks[taskId];
        require(record.creator != address(0), "task_missing");
        return (
            record.creator,
            record.rewardAmount,
            record.deadlineTimestamp,
            record.taskMode,
            record.metadataUri,
            record.metadataHash,
            _stateName(record.state),
            uint8(record.state),
            record.escrowLocked,
            record.assignedAgentId,
            record.latestSubmissionId,
            record.latestResultHash,
            record.latestResultUri,
            record.latestResultMetadataHash,
            record.reviewOutcome,
            record.consensusScore,
            record.validatorAgreementBps,
            record.consensusConfidenceBps,
            record.evaluationHash
        );
    }

    function _submissionId(
        string calldata taskId,
        string calldata agentId,
        string calldata submissionNonce
    ) private pure returns (string memory) {
        return string(abi.encodePacked("sub:", taskId, ":", agentId, ":", submissionNonce));
    }

    function _stateName(TaskState state) private pure returns (string memory) {
        if (state == TaskState.CREATED) return "CREATED";
        if (state == TaskState.ESCROW_FUNDED) return "ESCROW_FUNDED";
        if (state == TaskState.OPEN) return "OPEN";
        if (state == TaskState.ASSIGNED) return "ASSIGNED";
        if (state == TaskState.EXECUTING) return "EXECUTING";
        if (state == TaskState.SUBMITTED) return "SUBMITTED";
        if (state == TaskState.UNDER_REVIEW) return "UNDER_REVIEW";
        if (state == TaskState.APPROVED) return "APPROVED";
        if (state == TaskState.REJECTED) return "REJECTED";
        if (state == TaskState.DISPUTED) return "DISPUTED";
        if (state == TaskState.APPEALED) return "APPEALED";
        if (state == TaskState.UNRESOLVED) return "UNRESOLVED";
        if (state == TaskState.SETTLED) return "SETTLED";
        if (state == TaskState.CANCELLED) return "CANCELLED";
        if (state == TaskState.REFUNDED) return "REFUNDED";
        return "NONE";
    }

    function _sameString(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
