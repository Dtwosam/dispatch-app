from packages.contracts.marketplace.domain import AgentRegistryModel, TaskEscrowModel


def make_registry() -> AgentRegistryModel:
    return AgentRegistryModel()


def make_escrow() -> TaskEscrowModel:
    return TaskEscrowModel(protocol_fee_bps=250)
