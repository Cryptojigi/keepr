use starknet::ContractAddress;

// Must match privacy::objects::OpenNoteDeposit (positional Serde).
#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Serde, Copy, Drop, starknet::Store, PartialEq, Debug)]
pub struct SubscriptionRecord {
    pub creator: ContractAddress,
    pub tier: u8,
    pub amount: u128,
    pub period: u64,
    pub last_renewed: u64,
    pub active: bool,
    pub creator_note_id: felt252,
}

#[starknet::interface]
pub trait IErc20<TState> {
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IKeeprSubscriptionHelper<TState> {
    // Called by the privacy pool via selector!("privacy_invoke").
    fn privacy_invoke(
        ref self: TState,
        token: ContractAddress,
        pool_address: ContractAddress,
        op: u8,
        sub_id: felt252,
        creator: ContractAddress,
        tier: u8,
        amount: u128,
        period: u64,
        creator_note_id: felt252,
    ) -> Span<OpenNoteDeposit>;

    fn get_subscription(self: @TState, sub_id: felt252) -> SubscriptionRecord;
    fn is_active(self: @TState, sub_id: felt252) -> bool;
    fn get_invoke_count(self: @TState) -> u64;
}

#[starknet::contract]
pub mod KeeprSubscriptionHelper {
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use super::{IErc20Dispatcher, IErc20DispatcherTrait, OpenNoteDeposit, SubscriptionRecord};

    pub const OP_SUBSCRIBE: u8 = 0;
    pub const OP_RENEW: u8 = 1;
    pub const OP_CANCEL: u8 = 2;

    pub mod errors {
        pub const BAD_POOL: felt252 = 'BAD_POOL';
        pub const INVALID_OP: felt252 = 'INVALID_OP';
        pub const INVALID_AMOUNT: felt252 = 'INVALID_AMOUNT';
        pub const INVALID_PERIOD: felt252 = 'INVALID_PERIOD';
        pub const SUB_NOT_ACTIVE: felt252 = 'SUB_NOT_ACTIVE';
        pub const PERIOD_NOT_ELAPSED: felt252 = 'PERIOD_NOT_ELAPSED';
        pub const AMOUNT_MISMATCH: felt252 = 'AMOUNT_MISMATCH';
        pub const SUB_ID_ZERO: felt252 = 'SUB_ID_ZERO';
        pub const NO_INPUT: felt252 = 'NO_INPUT';
        pub const AMOUNT_OVERFLOW: felt252 = 'AMOUNT_OVERFLOW';
    }

    #[storage]
    struct Storage {
        subscriptions: Map<felt252, SubscriptionRecord>,
        invoke_count: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Subscribed: Subscribed,
        Renewed: Renewed,
        Cancelled: Cancelled,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Subscribed {
        #[key]
        pub sub_id: felt252,
        pub creator: ContractAddress,
        pub tier: u8,
        pub amount: u128,
        pub period: u64,
        pub creator_note_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Renewed {
        #[key]
        pub sub_id: felt252,
        pub creator: ContractAddress,
        pub tier: u8,
        pub amount: u128,
        pub renewed_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Cancelled {
        #[key]
        pub sub_id: felt252,
        pub creator: ContractAddress,
        pub tier: u8,
        pub cancelled_at: u64,
    }

    #[abi(embed_v0)]
    pub impl KeeprSubscriptionHelperImpl of super::IKeeprSubscriptionHelper<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            token: ContractAddress,
            pool_address: ContractAddress,
            op: u8,
            sub_id: felt252,
            creator: ContractAddress,
            tier: u8,
            amount: u128,
            period: u64,
            creator_note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            let caller = get_caller_address();
            assert(pool_address == caller, errors::BAD_POOL);
            assert(sub_id != 0, errors::SUB_ID_ZERO);

            let now = get_block_timestamp();
            let erc20 = IErc20Dispatcher { contract_address: token };

            if op == OP_SUBSCRIBE {
                assert(amount > 0, errors::INVALID_AMOUNT);
                assert(period > 0, errors::INVALID_PERIOD);

                let balance: u256 = erc20.balance_of(get_contract_address());
                let actual_amount: u128 = balance.try_into().expect(errors::AMOUNT_OVERFLOW);
                assert(actual_amount >= amount, errors::NO_INPUT);

                // Approve the privacy pool to pull the subscription amount for creator deposit
                erc20.approve(pool_address, amount.into());

                InternalImpl::execute_subscribe(
                    ref self, token, sub_id, creator, tier, amount, period, creator_note_id, now,
                )
            } else if op == OP_RENEW {
                let record = self.subscriptions.entry(sub_id).read();
                assert(record.active, errors::SUB_NOT_ACTIVE);
                assert(now >= record.last_renewed + record.period, errors::PERIOD_NOT_ELAPSED);
                assert(record.amount == amount, errors::AMOUNT_MISMATCH);

                let balance: u256 = erc20.balance_of(get_contract_address());
                let actual_amount: u128 = balance.try_into().expect(errors::AMOUNT_OVERFLOW);
                assert(actual_amount >= amount, errors::NO_INPUT);

                erc20.approve(pool_address, amount.into());

                InternalImpl::execute_renew(ref self, token, sub_id, amount, now)
            } else if op == OP_CANCEL {
                InternalImpl::execute_cancel(ref self, sub_id, now)
            } else {
                core::panic_with_felt252(errors::INVALID_OP)
            }
        }

        fn get_subscription(self: @ContractState, sub_id: felt252) -> SubscriptionRecord {
            self.subscriptions.entry(sub_id).read()
        }

        fn is_active(self: @ContractState, sub_id: felt252) -> bool {
            let record = self.subscriptions.entry(sub_id).read();
            if !record.active {
                return false;
            }
            let now = get_block_timestamp();
            now < record.last_renewed + record.period
        }

        fn get_invoke_count(self: @ContractState) -> u64 {
            self.invoke_count.read()
        }
    }

    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        fn execute_subscribe(
            ref self: ContractState,
            token: ContractAddress,
            sub_id: felt252,
            creator: ContractAddress,
            tier: u8,
            amount: u128,
            period: u64,
            creator_note_id: felt252,
            now: u64,
        ) -> Span<OpenNoteDeposit> {
            assert(amount > 0, errors::INVALID_AMOUNT);
            assert(period > 0, errors::INVALID_PERIOD);

            let record = SubscriptionRecord {
                creator,
                tier,
                amount,
                period,
                last_renewed: now,
                active: true,
                creator_note_id,
            };
            self.subscriptions.entry(sub_id).write(record);
            self.invoke_count.write(self.invoke_count.read() + 1);

            self.emit(Subscribed {
                sub_id,
                creator,
                tier,
                amount,
                period,
                creator_note_id,
            });

            array![OpenNoteDeposit { note_id: creator_note_id, token, amount }].span()
        }

        fn execute_renew(
            ref self: ContractState,
            token: ContractAddress,
            sub_id: felt252,
            amount: u128,
            now: u64,
        ) -> Span<OpenNoteDeposit> {
            let mut record = self.subscriptions.entry(sub_id).read();
            assert(record.active, errors::SUB_NOT_ACTIVE);
            assert(now >= record.last_renewed + record.period, errors::PERIOD_NOT_ELAPSED);
            assert(record.amount == amount, errors::AMOUNT_MISMATCH);

            record.last_renewed = now;
            self.subscriptions.entry(sub_id).write(record);
            self.invoke_count.write(self.invoke_count.read() + 1);

            self.emit(Renewed {
                sub_id,
                creator: record.creator,
                tier: record.tier,
                amount: record.amount,
                renewed_at: now,
            });

            array![OpenNoteDeposit { note_id: record.creator_note_id, token, amount }].span()
        }

        fn execute_cancel(
            ref self: ContractState,
            sub_id: felt252,
            now: u64,
        ) -> Span<OpenNoteDeposit> {
            let mut record = self.subscriptions.entry(sub_id).read();
            assert(record.active, errors::SUB_NOT_ACTIVE);

            record.active = false;
            self.subscriptions.entry(sub_id).write(record);
            self.invoke_count.write(self.invoke_count.read() + 1);

            self.emit(Cancelled {
                sub_id,
                creator: record.creator,
                tier: record.tier,
                cancelled_at: now,
            });

            // Return empty span: no fund movement on cancellation
            array![].span()
        }

        fn set_subscription_for_testing(
            ref self: ContractState,
            sub_id: felt252,
            record: SubscriptionRecord,
        ) {
            self.subscriptions.entry(sub_id).write(record);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        KeeprSubscriptionHelper, IKeeprSubscriptionHelper, OpenNoteDeposit, SubscriptionRecord,
    };
    use core::traits::TryInto;
    use starknet::testing::{set_caller_address, set_block_timestamp};

    #[test]
    fn test_subscription_record_fields() {
        let creator = 0x123.try_into().unwrap();
        let sub = SubscriptionRecord {
            creator,
            tier: 1,
            amount: 100_000_000_000_000_000_000, // 100 STRK
            period: 2592000, // 30 days
            last_renewed: 1700000000,
            active: true,
            creator_note_id: 0x999,
        };

        assert(sub.creator == creator, 'creator mismatch');
        assert(sub.tier == 1, 'tier mismatch');
        assert(sub.amount == 100_000_000_000_000_000_000, 'amount mismatch');
        assert(sub.period == 2592000, 'period mismatch');
        assert(sub.last_renewed == 1700000000, 'last_renewed mismatch');
        assert(sub.active == true, 'active mismatch');
        assert(sub.creator_note_id == 0x999, 'note_id mismatch');
    }

    #[test]
    fn test_open_note_deposit_structure() {
        let token = 0xcafe.try_into().unwrap();
        let dep = OpenNoteDeposit { note_id: 0xabc, token, amount: 25_000_000_000_000_000_000 };

        assert(dep.note_id == 0xabc, 'note_id mismatch');
        assert(dep.token == token, 'token mismatch');
        assert(dep.amount == 25_000_000_000_000_000_000, 'amount mismatch');
    }

    #[test]
    fn test_operation_constants() {
        assert(KeeprSubscriptionHelper::OP_SUBSCRIBE == 0, 'op subscribe != 0');
        assert(KeeprSubscriptionHelper::OP_RENEW == 1, 'op renew != 1');
        assert(KeeprSubscriptionHelper::OP_CANCEL == 2, 'op cancel != 2');
    }

    #[test]
    fn test_initial_contract_state() {
        let state = KeeprSubscriptionHelper::contract_state_for_testing();
        assert(
            state.get_invoke_count() == 0,
            'invoke count != 0',
        );
        assert(
            state.is_active(0x111) == false,
            'should not be active',
        );
    }

    #[test]
    fn test_is_active_lifecycle_and_expiry() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x777;

        // 1. Unregistered sub_id is inactive
        assert(state.is_active(sub_id) == false, 'unregistered should be false');

        // 2. Active sub: renewed at 1000, period 2000 -> expires at 3000
        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 1,
                amount: 10_000_000_000_000_000_000,
                period: 2000,
                last_renewed: 1000,
                active: true,
                creator_note_id: 0x111,
            },
        );

        // Before expiry
        set_block_timestamp(1500);
        assert(state.is_active(sub_id) == true, 'should be active before expiry');

        // At expiry boundary (now == last_renewed + period == 3000)
        set_block_timestamp(3000);
        assert(state.is_active(sub_id) == false, 'boundary should be inactive');

        // After expiry (now > 3000)
        set_block_timestamp(3500);
        assert(state.is_active(sub_id) == false, 'expired should be inactive');

        // 3. Explicitly deactivated subscription
        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 1,
                amount: 10_000_000_000_000_000_000,
                period: 2000,
                last_renewed: 1000,
                active: false,
                creator_note_id: 0x111,
            },
        );
        set_block_timestamp(1500);
        assert(state.is_active(sub_id) == false, 'cancelled should be false');
    }

    #[test]
    fn test_subscribe_happy_path() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;
        let creator_note_id = 0x888;
        let amount = 50_000_000_000_000_000_000_u128; // 50 STRK
        let period = 2592000_u64; // 30 days
        let now = 1700000000_u64;

        set_block_timestamp(now);

        let deposits = KeeprSubscriptionHelper::InternalImpl::execute_subscribe(
            ref state,
            token,
            sub_id,
            creator,
            2,
            amount,
            period,
            creator_note_id,
            now,
        );

        // Verify returned open note deposit
        assert(deposits.len() == 1, 'deposits len should be 1');
        let dep = *deposits.at(0);
        assert(dep.note_id == creator_note_id, 'deposit note_id mismatch');
        assert(dep.token == token, 'deposit token mismatch');
        assert(dep.amount == amount, 'deposit amount mismatch');

        // Verify storage state
        assert(state.get_invoke_count() == 1, 'invoke_count should be 1');
        assert(state.is_active(sub_id) == true, 'sub should be active');

        let record = state.get_subscription(sub_id);
        assert(record.creator == creator, 'creator mismatch');
        assert(record.tier == 2, 'tier mismatch');
        assert(record.amount == amount, 'amount mismatch');
        assert(record.period == period, 'period mismatch');
        assert(record.last_renewed == now, 'last_renewed mismatch');
        assert(record.active == true, 'active mismatch');
        assert(record.creator_note_id == creator_note_id, 'creator_note_id mismatch');
    }

    #[test]
    #[should_panic(expected: ('INVALID_AMOUNT',))]
    fn test_subscribe_invalid_amount_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        KeeprSubscriptionHelper::InternalImpl::execute_subscribe(
            ref state, token, 0x555, creator, 1, 0, 2592000, 0x888, 1000,
        );
    }

    #[test]
    #[should_panic(expected: ('INVALID_PERIOD',))]
    fn test_subscribe_invalid_period_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        KeeprSubscriptionHelper::InternalImpl::execute_subscribe(
            ref state, token, 0x555, creator, 1, 50_000, 0, 0x888, 1000,
        );
    }

    #[test]
    fn test_renew_happy_path() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;
        let creator_note_id = 0x888;
        let amount = 50_000_000_000_000_000_000_u128;
        let period = 2592000_u64;

        // Seed initial subscription renewed at t = 1000
        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 2,
                amount,
                period,
                last_renewed: 1000,
                active: true,
                creator_note_id,
            },
        );

        // Renew at t = 1000 + period + 500 = 2593500
        let renew_time = 1000 + period + 500;
        set_block_timestamp(renew_time);

        let deposits = KeeprSubscriptionHelper::InternalImpl::execute_renew(
            ref state, token, sub_id, amount, renew_time,
        );

        // Verify returned open note deposit
        assert(deposits.len() == 1, 'deposits len should be 1');
        let dep = *deposits.at(0);
        assert(dep.note_id == creator_note_id, 'deposit note_id mismatch');
        assert(dep.token == token, 'deposit token mismatch');
        assert(dep.amount == amount, 'deposit amount mismatch');

        // Verify storage state
        assert(state.get_invoke_count() == 1, 'invoke_count should be 1');
        assert(state.is_active(sub_id) == true, 'sub should be active');

        let record = state.get_subscription(sub_id);
        assert(record.last_renewed == renew_time, 'last_renewed not advanced');
        assert(record.active == true, 'active mismatch');
        assert(record.creator == creator, 'creator mismatch');
    }

    #[test]
    #[should_panic(expected: ('AMOUNT_MISMATCH',))]
    fn test_renew_amount_mismatch_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;

        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 2,
                amount: 100,
                period: 1000,
                last_renewed: 1000,
                active: true,
                creator_note_id: 0x888,
            },
        );

        // Attempt renew with wrong amount (50 instead of 100)
        KeeprSubscriptionHelper::InternalImpl::execute_renew(
            ref state, token, sub_id, 50, 2500,
        );
    }

    #[test]
    #[should_panic(expected: ('PERIOD_NOT_ELAPSED',))]
    fn test_renew_period_not_elapsed_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;

        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 2,
                amount: 100,
                period: 1000,
                last_renewed: 1000,
                active: true,
                creator_note_id: 0x888,
            },
        );

        // Attempt renew before period elapsed (now = 1500 < 1000 + 1000)
        KeeprSubscriptionHelper::InternalImpl::execute_renew(
            ref state, token, sub_id, 100, 1500,
        );
    }

    #[test]
    #[should_panic(expected: ('SUB_NOT_ACTIVE',))]
    fn test_renew_inactive_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;

        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 2,
                amount: 100,
                period: 1000,
                last_renewed: 1000,
                active: false,
                creator_note_id: 0x888,
            },
        );

        KeeprSubscriptionHelper::InternalImpl::execute_renew(
            ref state, token, sub_id, 100, 2500,
        );
    }

    #[test]
    fn test_cancel_flow() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let pool = 0x1111.try_into().unwrap();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x555;

        // Seed an active subscription in storage
        KeeprSubscriptionHelper::InternalImpl::set_subscription_for_testing(
            ref state,
            sub_id,
            SubscriptionRecord {
                creator,
                tier: 2,
                amount: 50_000_000_000_000_000_000,
                period: 2592000,
                last_renewed: 1000,
                active: true,
                creator_note_id: 0x888,
            },
        );

        set_block_timestamp(1500);
        assert(state.is_active(sub_id) == true, 'should be active');

        // Execute Cancel operation (op = 2)
        set_caller_address(pool);

        let deposits = state.privacy_invoke(
            token,
            pool,
            KeeprSubscriptionHelper::OP_CANCEL,
            sub_id,
            creator,
            2,
            0,
            0,
            0,
        );

        assert(deposits.len() == 0, 'cancel should return 0 deposit');
        assert(state.is_active(sub_id) == false, 'should be cancelled');
        assert(state.get_invoke_count() == 1, 'invoke_count should be 1');

        let record = state.get_subscription(sub_id);
        assert(record.active == false, 'record active should be false');
        assert(record.creator == creator, 'creator mismatch');
    }

    #[test]
    #[should_panic(expected: ('SUB_NOT_ACTIVE',))]
    fn test_cancel_inactive_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let pool = 0x1111.try_into().unwrap();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();
        let sub_id = 0x999;

        set_caller_address(pool);
        state.privacy_invoke(
            token,
            pool,
            KeeprSubscriptionHelper::OP_CANCEL,
            sub_id,
            creator,
            0,
            0,
            0,
            0,
        );
    }

    #[test]
    #[should_panic(expected: ('BAD_POOL',))]
    fn test_bad_pool_caller_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let pool = 0x1111.try_into().unwrap();
        let imposter = 0x9999.try_into().unwrap();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();

        set_caller_address(imposter);
        state.privacy_invoke(
            token,
            pool,
            KeeprSubscriptionHelper::OP_CANCEL,
            0x555,
            creator,
            1,
            0,
            0,
            0,
        );
    }

    #[test]
    #[should_panic(expected: ('SUB_ID_ZERO',))]
    fn test_sub_id_zero_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let pool = 0x1111.try_into().unwrap();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();

        set_caller_address(pool);
        state.privacy_invoke(
            token,
            pool,
            KeeprSubscriptionHelper::OP_CANCEL,
            0,
            creator,
            1,
            0,
            0,
            0,
        );
    }

    #[test]
    #[should_panic(expected: ('INVALID_OP',))]
    fn test_invalid_op_panics() {
        let mut state = KeeprSubscriptionHelper::contract_state_for_testing();
        let pool = 0x1111.try_into().unwrap();
        let token = 0x2222.try_into().unwrap();
        let creator = 0x3333.try_into().unwrap();

        set_caller_address(pool);
        state.privacy_invoke(
            token,
            pool,
            99, // invalid op
            0x555,
            creator,
            1,
            0,
            0,
            0,
        );
    }
}
