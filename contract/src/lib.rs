#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, symbol_short};

#[contracttype]
pub enum DataKey {
    Votes(u32),
    Total,
    Question,
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    pub fn init(env: Env, question: String) {
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Total, &0u32);
        env.storage().instance().set(&DataKey::Votes(0), &0u32);
        env.storage().instance().set(&DataKey::Votes(1), &0u32);
        env.storage().instance().set(&DataKey::Votes(2), &0u32);
        env.storage().instance().set(&DataKey::Votes(3), &0u32);
    }

    pub fn vote(env: Env, voter: Address, option: u32) -> u32 {
        voter.require_auth();
        assert!(option <= 3, "Invalid option");
        let mut count: u32 = env.storage().instance()
            .get(&DataKey::Votes(option)).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::Votes(option), &count);
        let mut total: u32 = env.storage().instance()
            .get(&DataKey::Total).unwrap_or(0);
        total += 1;
        env.storage().instance().set(&DataKey::Total, &total);
        env.events().publish((symbol_short!("voted"), option), count);
        count
    }

    pub fn get_votes(env: Env, option: u32) -> u32 {
        env.storage().instance().get(&DataKey::Votes(option)).unwrap_or(0)
    }

    pub fn total_votes(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Total).unwrap_or(0)
    }

    pub fn get_question(env: Env) -> String {
        env.storage().instance().get(&DataKey::Question).unwrap()
    }
}