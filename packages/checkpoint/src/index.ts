/**
 * ALTER EGO OS — Checkpoint
 *
 * Public API for the standalone checkpoint system.
 */

export { CheckpointManager } from './checkpoint-manager.js';
export { InMemoryCheckpointStore } from './stores/in-memory.js';
export type {
  CheckpointId,
  Checkpoint,
  CheckpointStore,
  CheckpointSavedEvent,
  CheckpointRestoredEvent,
  CheckpointCleanedUpEvent,
} from './types.js';
