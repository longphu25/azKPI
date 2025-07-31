// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module task_manager::task_manager_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::test_utils;
    use std::string;
    use std::vector;
    use task_manager::task_manager::{Self, Task, TaskManagerCap, ENotCreator, EInvalidPriority};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    #[test]
    fun test_create_task_manager_cap() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create task manager capability
        let cap = task_manager::create_task_manager_cap(test_scenario::ctx(&mut scenario));
        
        // Verify capability properties
        assert!(task_manager::get_cap_owner(&cap) == ADMIN);
        
        test_utils::destroy(cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_task() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task
        let title = b"Test Task";
        let description = b"This is a test task";
        let due_date = 1234567890; // Example timestamp
        let priority = task_manager::priority_medium();
        
        task_manager::create_task(title, description, due_date, priority, test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        // Check that task was created and shared
        assert!(test_scenario::has_most_recent_shared<Task>());
        
        let task = test_scenario::take_shared<Task>(&scenario);
        
        // Verify task properties
        assert!(task_manager::get_creator(&task) == ADMIN);
        assert!(task_manager::get_title(&task) == string::utf8(title));
        assert!(task_manager::get_description(&task) == string::utf8(description));
        assert!(task_manager::get_content_blob_id(&task) == string::utf8(b""));
        assert!(vector::is_empty(&task_manager::get_file_blob_ids(&task)));
        assert!(vector::is_empty(&task_manager::get_shared_with(&task)));
        assert!(!task_manager::is_completed(&task));
        assert!(task_manager::get_due_date(&task) == due_date);
        assert!(task_manager::get_priority(&task) == priority);
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_add_content() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task first
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Add content to the task
        let content_blob_id = b"blob123456";
        task_manager::add_content(&mut task, content_blob_id, test_scenario::ctx(&mut scenario));
        
        // Verify content was added
        assert!(task_manager::get_content_blob_id(&task) == string::utf8(content_blob_id));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_add_files() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task first
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Add files to the task
        let mut file_blob_ids = vector::empty<vector<u8>>();
        vector::push_back(&mut file_blob_ids, b"file1_blob");
        vector::push_back(&mut file_blob_ids, b"file2_blob");
        
        task_manager::add_files(&mut task, file_blob_ids, test_scenario::ctx(&mut scenario));
        
        // Verify files were added
        let stored_files = task_manager::get_file_blob_ids(&task);
        assert!(vector::length(&stored_files) == 2);
        assert!(vector::contains(&stored_files, &string::utf8(b"file1_blob")));
        assert!(vector::contains(&stored_files, &string::utf8(b"file2_blob")));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_share_task() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task first
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Share task with users
        let mut users = vector::empty<address>();
        vector::push_back(&mut users, USER1);
        vector::push_back(&mut users, USER2);
        
        task_manager::share_task(&mut task, users, test_scenario::ctx(&mut scenario));
        
        // Verify task was shared
        let shared_with = task_manager::get_shared_with(&task);
        assert!(vector::length(&shared_with) == 2);
        assert!(vector::contains(&shared_with, &USER1));
        assert!(vector::contains(&shared_with, &USER2));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_complete_task() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task first
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Initially task should not be completed
        assert!(!task_manager::is_completed(&task));
        
        // Complete the task
        task_manager::complete_task(&mut task, test_scenario::ctx(&mut scenario));
        
        // Verify task is completed
        assert!(task_manager::is_completed(&task));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_has_access() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Creator should have access
        assert!(task_manager::has_access(&task, ADMIN));
        
        // Other users should not have access initially
        assert!(!task_manager::has_access(&task, USER1));
        assert!(!task_manager::has_access(&task, USER2));
        
        // Share with USER1
        let mut users = vector::empty<address>();
        vector::push_back(&mut users, USER1);
        task_manager::share_task(&mut task, users, test_scenario::ctx(&mut scenario));
        
        // Now USER1 should have access, but not USER2
        assert!(task_manager::has_access(&task, USER1));
        assert!(!task_manager::has_access(&task, USER2));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_verify_access() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let task = test_scenario::take_shared<Task>(&scenario);
        
        // Creator should be able to verify access
        assert!(task_manager::verify_access(&task, test_scenario::ctx(&mut scenario)));
        
        test_scenario::return_shared(task);
        
        // Test with different user
        test_scenario::next_tx(&mut scenario, USER1);
        
        let task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 should not have access
        assert!(!task_manager::verify_access(&task, test_scenario::ctx(&mut scenario)));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_add_content_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to add content (should fail)
        task_manager::add_content(&mut task, b"unauthorized_blob", test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_add_files_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to add files (should fail)
        let mut file_blob_ids = vector::empty<vector<u8>>();
        vector::push_back(&mut file_blob_ids, b"unauthorized_file");
        task_manager::add_files(&mut task, file_blob_ids, test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_share_task_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to share task (should fail)
        let mut users = vector::empty<address>();
        vector::push_back(&mut users, USER2);
        task_manager::share_task(&mut task, users, test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_complete_task_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to complete task (should fail)
        task_manager::complete_task(&mut task, test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_getter_functions() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task
        let title = b"Test Task";
        let description = b"Test Description";
        let due_date = 9876543210;
        let priority = task_manager::priority_high();
        task_manager::create_task(title, description, due_date, priority, test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let task = test_scenario::take_shared<Task>(&scenario);
        
        // Test all getter functions
        assert!(task_manager::get_creator(&task) == ADMIN);
        assert!(task_manager::get_title(&task) == string::utf8(title));
        assert!(task_manager::get_description(&task) == string::utf8(description));
        assert!(task_manager::get_content_blob_id(&task) == string::utf8(b""));
        assert!(vector::is_empty(&task_manager::get_file_blob_ids(&task)));
        assert!(vector::is_empty(&task_manager::get_shared_with(&task)));
        assert!(!task_manager::is_completed(&task));
        assert!(task_manager::get_due_date(&task) == due_date);
        assert!(task_manager::get_priority(&task) == priority);
        
        // Test that task ID is valid address
        let task_id = task_manager::get_task_id(&task);
        assert!(task_id != @0x0);
        
        // Test timestamps
        let created_at = task_manager::get_created_at(&task);
        let updated_at = task_manager::get_updated_at(&task);
        assert!(created_at == updated_at); // Should be same initially
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_priority() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task with medium priority
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_medium(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Verify initial priority
        assert!(task_manager::get_priority(&task) == task_manager::priority_medium());
        
        // Update to high priority
        task_manager::update_priority(&mut task, task_manager::priority_high(), test_scenario::ctx(&mut scenario));
        
        // Verify priority was updated
        assert!(task_manager::get_priority(&task) == task_manager::priority_high());
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_due_date() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task with no due date
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Verify initial due date
        assert!(task_manager::get_due_date(&task) == 0);
        
        // Update due date
        let new_due_date = 1234567890;
        task_manager::update_due_date(&mut task, new_due_date, test_scenario::ctx(&mut scenario));
        
        // Verify due date was updated
        assert!(task_manager::get_due_date(&task) == new_due_date);
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_is_overdue() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task with due date in the past
        let past_due_date = 1000000000;
        task_manager::create_task(b"Test Task", b"Description", past_due_date, task_manager::priority_medium(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Task should be overdue (not completed and due date has passed)
        let current_time = 2000000000;
        assert!(task_manager::is_overdue(&task, current_time));
        
        // Complete the task
        task_manager::complete_task(&mut task, test_scenario::ctx(&mut scenario));
        
        // Task should no longer be overdue (even though due date passed, it's completed)
        assert!(!task_manager::is_overdue(&task, current_time));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_priority_constants() {
        // Test priority constant getter functions
        assert!(task_manager::priority_low() == 1);
        assert!(task_manager::priority_medium() == 2);
        assert!(task_manager::priority_high() == 3);
        assert!(task_manager::priority_critical() == 4);
    }

    #[test]
    #[expected_failure(abort_code = EInvalidPriority)]
    fun test_create_task_invalid_priority() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Try to create a task with invalid priority (0)
        task_manager::create_task(b"Test Task", b"Description", 0, 0, test_scenario::ctx(&mut scenario));
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = EInvalidPriority)]
    fun test_update_priority_invalid() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // Try to update to invalid priority (5)
        task_manager::update_priority(&mut task, 5, test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_update_priority_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to update priority (should fail)
        task_manager::update_priority(&mut task, task_manager::priority_high(), test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = ENotCreator)]
    fun test_update_due_date_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Create a task as ADMIN
        task_manager::create_task(b"Test Task", b"Description", 0, task_manager::priority_low(), test_scenario::ctx(&mut scenario));
        
        test_scenario::next_tx(&mut scenario, USER1); // Switch to USER1
        
        let mut task = test_scenario::take_shared<Task>(&scenario);
        
        // USER1 tries to update due date (should fail)
        task_manager::update_due_date(&mut task, 1234567890, test_scenario::ctx(&mut scenario));
        
        test_scenario::return_shared(task);
        test_scenario::end(scenario);
    }
}
