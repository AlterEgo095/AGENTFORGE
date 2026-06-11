/**
 * ALTER EGO OS — Mission Center
 *
 * Public API for the mission creation and management system.
 */

export { MissionCenter } from './mission-center.js';
export type { MinimalEventBus } from './mission-center.js';
export { PREDEFINED_TEMPLATES } from './templates.js';
export {
  FORMATION_COMPLETE_TEMPLATE,
  VEILLE_TECHNOLOGIQUE_TEMPLATE,
  ARTICLE_PROFESSIONNEL_TEMPLATE,
  PRESENTATION_TEMPLATE,
  AUDIT_INFRASTRUCTURE_TEMPLATE,
} from './templates.js';

export type {
  MissionTemplateId,
  MissionId,
  MissionConstraints,
  TemplateParameter,
  MissionTemplate,
  MissionSubmission,
  MissionPriority,
  MissionStatus,
  Deliverable,
  MissionTracker,
  OrchestratorDelegate,
  ValidationResult,
  MissionCenterEvents,
} from './types.js';
