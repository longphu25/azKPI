// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Task Management System with Walrus Integration
/// This module allows users to create tasks with content and file attachments
/// Content and files are stored on Walrus storage for decentralized access
module task_manager::task_manager {
  use sui::event;
  use sui::address;
  use std::string::{Self, String};

  /// Error codes
  const ENotCreator: u64 = 0;
  const ENoAccess: u64 = 1;

  /// Task object that contains metadata and references to Walrus-stored content
  public struct Task has key, store {
    id: UID,
    creator: address,
    title: String,
    description: String,
    content_blob_id: String, // Walrus blob ID for encrypted content
    file_blob_ids: vector<String>, // Walrus blob IDs for encrypted files
    shared_with: vector<address>, // Users who have access to this task
    created_at: u64,
    updated_at: u64,
    is_completed: bool,
  }

  /// Capability object for managing tasks
  public struct TaskManagerCap has key, store {
    id: UID,
    owner: address,
  }

  /// Event emitted when a new task is created
  public struct TaskCreated has copy, drop {
    task_id: address,
    creator: address,
    title: String,
  }

  /// Event emitted when a task is shared with users
  public struct TaskShared has copy, drop {
    task_id: address,
    shared_with: vector<address>,
  }

  /// Event emitted when task content is updated
  public struct TaskContentUpdated has copy, drop {
    task_id: address,
    content_blob_id: String,
  }

  /// Event emitted when files are added to a task
  public struct TaskFilesAdded has copy, drop {
    task_id: address,
    file_blob_ids: vector<String>,
  }

  /// Create a new task manager capability
  public fun create_task_manager_cap(ctx: &mut TxContext): TaskManagerCap {
    let cap = TaskManagerCap {
      id: object::new(ctx),
      owner: tx_context::sender(ctx),
    };
    cap
  }

  /// Create a new task with title and description
  public fun create_task(
    title: vector<u8>,
    description: vector<u8>,
    ctx: &mut TxContext
  ) {
    let task_title = string::utf8(title);
    let task_description = string::utf8(description);
    
    let task = Task {
      id: object::new(ctx),
      creator: tx_context::sender(ctx),
      title: task_title,
      description: task_description,
      content_blob_id: string::utf8(b""),
      file_blob_ids: vector::empty(),
      shared_with: vector::empty(),
      created_at: tx_context::epoch(ctx),
      updated_at: tx_context::epoch(ctx),
      is_completed: false,
    };

    let task_id = object::uid_to_address(&task.id);
    
    event::emit(TaskCreated {
      task_id,
      creator: tx_context::sender(ctx),
      title: task_title,
    });

    transfer::share_object(task);
  }

  /// Add encrypted content to a task (stored on Walrus)
  public fun add_content(
    task: &mut Task,
    content_blob_id: vector<u8>,
    ctx: &mut TxContext
  ) {
    assert!(task.creator == tx_context::sender(ctx), ENotCreator);
    
    task.content_blob_id = string::utf8(content_blob_id);
    task.updated_at = tx_context::epoch(ctx);

    event::emit(TaskContentUpdated {
      task_id: object::uid_to_address(&task.id),
      content_blob_id: task.content_blob_id,
    });
  }

  /// Add encrypted files to a task (stored on Walrus)
  public fun add_files(
    task: &mut Task,
    file_blob_ids: vector<vector<u8>>,
    ctx: &mut TxContext
  ) {
    assert!(task.creator == tx_context::sender(ctx), ENotCreator);
    
    let mut i = 0;
    let len = vector::length(&file_blob_ids);
    
    while (i < len) {
      let blob_id = vector::borrow(&file_blob_ids, i);
      vector::push_back(&mut task.file_blob_ids, string::utf8(*blob_id));
      i = i + 1;
    };
    
    task.updated_at = tx_context::epoch(ctx);

    event::emit(TaskFilesAdded {
      task_id: object::uid_to_address(&task.id),
      file_blob_ids: task.file_blob_ids,
    });
  }

  /// Share task with specific users
  public fun share_task(
    task: &mut Task,
    users: vector<address>,
    ctx: &mut TxContext
  ) {
    assert!(task.creator == tx_context::sender(ctx), ENotCreator);
    
    task.shared_with = users;
    task.updated_at = tx_context::epoch(ctx);

    event::emit(TaskShared {
      task_id: object::uid_to_address(&task.id),
      shared_with: users,
    });
  }

  /// Mark task as completed
  public fun complete_task(
    task: &mut Task,
    ctx: &mut TxContext
  ) {
    assert!(task.creator == tx_context::sender(ctx), ENotCreator);
    
    task.is_completed = true;
    task.updated_at = tx_context::epoch(ctx);
  }

  /// Check if user has access to task
  public fun has_access(task: &Task, user: address): bool {
    if (task.creator == user) {
      return true
    };
    
    vector::contains(&task.shared_with, &user)
  }

  /// Get the namespace for this task (used for Seal ID verification)
  public fun namespace(task: &Task): vector<u8> {
    // Use the task's unique ID as namespace
    let task_id = object::uid_to_address(&task.id);
    address::to_bytes(task_id)
  }

  /// Internal function to verify access for Seal decryption
  fun approve_internal(caller: address, _id: vector<u8>, task: &Task): bool {
    // For task manager, we use the task's access control
    // In a more complex implementation, you might also check if the ID has the right prefix
    // let task_namespace = namespace(task);
    // if (!is_prefix(task_namespace, id)) {
    //     return false
    // };
    
    has_access(task, caller)
  }

  /// Verify access for decryption (used by Seal)
  public fun verify_access(task: &Task, ctx: &TxContext): bool {
    let user = tx_context::sender(ctx);
    has_access(task, user)
  }

  /// Seal approve function for IBE decryption
  /// This function is called by Seal key servers to verify access
  entry fun seal_approve(id: vector<u8>, task: &Task, ctx: &TxContext) {
    assert!(approve_internal(tx_context::sender(ctx), id, task), ENoAccess);
  }

  // Getter functions
  public fun get_task_id(task: &Task): address {
    object::uid_to_address(&task.id)
  }

  public fun get_creator(task: &Task): address {
    task.creator
  }

  public fun get_title(task: &Task): String {
    task.title
  }

  public fun get_description(task: &Task): String {
    task.description
  }

  public fun get_content_blob_id(task: &Task): String {
    task.content_blob_id
  }

  public fun get_file_blob_ids(task: &Task): vector<String> {
    task.file_blob_ids
  }

  public fun get_shared_with(task: &Task): vector<address> {
    task.shared_with
  }

  public fun is_completed(task: &Task): bool {
    task.is_completed
  }

  public fun get_created_at(task: &Task): u64 {
    task.created_at
  }

  public fun get_updated_at(task: &Task): u64 {
    task.updated_at
  }

  // TaskManagerCap getter functions
  public fun get_cap_owner(cap: &TaskManagerCap): address {
    cap.owner
  }
}
