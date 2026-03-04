#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, symbol_short};

#[contracttype]
pub enum DataKey {
    Rewarded(Address),
    TotalRewarded,
}

#[contract]
pub struct PollRewardContract;

#[contractimpl]
impl PollRewardContract {
    // Called after user votes - gives reward
    pub fn give_reward(env: Env, voter: Address) -> u32 {
        voter.require_auth();

        // Check if already rewarded
        let already: bool = env.storage().instance()
            .get(&DataKey::Rewarded(voter.clone()))
            .unwrap_or(false);

        if already {
            return 0;
        }

        // Mark as rewarded
        env.storage().instance()
            .set(&DataKey::Rewarded(voter.clone()), &true);

        // Increment total rewarded
        let mut total: u32 = env.storage().instance()
            .get(&DataKey::TotalRewarded)
            .unwrap_or(0);
        total += 1;
        env.storage().instance()
            .set(&DataKey::TotalRewarded, &total);

        // Emit event
        env.events().publish(
            (symbol_short!("rewarded"),),
            voter
        );

        total
    }

    pub fn has_reward(env: Env, voter: Address) -> bool {
        env.storage().instance()
            .get(&DataKey::Rewarded(voter))
            .unwrap_or(false)
    }

    pub fn total_rewarded(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::TotalRewarded)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_give_reward() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PollRewardContract);
        let client = PollRewardContractClient::new(&env, &contract_id);
        let voter = Address::generate(&env);

        let result = client.give_reward(&voter);
        assert_eq!(result, 1);
        assert_eq!(client.has_reward(&voter), true);
    }

    #[test]
    fn test_no_double_reward() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PollRewardContract);
        let client = PollRewardContractClient::new(&env, &contract_id);
        let voter = Address::generate(&env);

        client.give_reward(&voter);
        let result = client.give_reward(&voter);
        assert_eq!(result, 0); // second call returns 0
        assert_eq!(client.total_rewarded(), 1);
    }

    #[test]
    fn test_total_rewarded() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PollRewardContract);
        let client = PollRewardContractClient::new(&env, &contract_id);

        let v1 = Address::generate(&env);
        let v2 = Address::generate(&env);
        let v3 = Address::generate(&env);

        client.give_reward(&v1);
        client.give_reward(&v2);
        client.give_reward(&v3);

        assert_eq!(client.total_rewarded(), 3);
    }
}