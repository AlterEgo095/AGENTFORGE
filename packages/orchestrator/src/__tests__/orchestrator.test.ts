/**
 * ALTER EGO OS — Super Orchestrator Tests
 *
 * Comprehensive tests covering:
 * - Mission submission and lifecycle
 * - Mission parsing (keyword detection, constraint extraction)
 * - Template-based planning (all mission types)
 * - DAG generation and validation
 * - Execution orchestration
 * - Post-execution integration (reflection, memory, knowledge, learning)
 * - Event emission
 * - Agent registry
 * - Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@alterego/event-bus';
import { LoggerImpl, InMemoryTransport } from '@alterego/kernel';
import { WorkflowManager } from '@alterego/workflow';
import { MemoryStore } from '@alterego/memory';
import { KnowledgeStore } from '@alterego/knowledge';
import { ReflectionEngine } from '@alterego/reflection';
import { LearningEngine } from '@alterego/learning';
import { CostOptimizer } from '@alterego/cost-optimizer';
import { SuperOrchestrator } from '../orchestrator.js';
import { parseMission } from '../mission-parser.js';
import { createPlan } from '../planner.js';
import { generateDAG, validateGeneratedDAG } from '../dag-generator.js';
import { getTemplate, getAllTemplates, hasTemplate } from '../templates.js';
import type { Mission, MissionType, ParsedMission } from '../types.js';

// ─── Test Helpers ────────────────────────────────────────────

function createTestLogger(): LoggerImpl {
  const transport = new InMemoryTransport('debug');
  return new LoggerImpl({ source: 'orchestrator-test', transports: [transport] });
}

function createOrchestrator(config?: Record<string, unknown>): SuperOrchestrator {
  const eventBus = new EventBus();
  const workflowManager = new WorkflowManager({ eventBus });
  const memoryStore = new MemoryStore(undefined, eventBus);
  const knowledgeStore = new KnowledgeStore(undefined, eventBus);
  const reflectionEngine = new ReflectionEngine(eventBus);
  const learningEngine = new LearningEngine(eventBus);
  const costOptimizer = new CostOptimizer(eventBus);
  const logger = createTestLogger();

  return new SuperOrchestrator(
    {
      eventBus,
      workflowManager,
      memoryStore,
      knowledgeStore,
      reflectionEngine,
      learningEngine,
      costOptimizer,
      logger,
    },
    config,
  );
}

// ─── Mission Parser Tests ────────────────────────────────────

describe('MissionParser', () => {
  it('should detect formation type from keywords', () => {
    const result = parseMission('Create a training course on machine learning');
    expect(result.type).toBe('formation');
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('should detect research type from keywords', () => {
    const result = parseMission('Research the latest trends in AI safety');
    expect(result.type).toBe('research');
  });

  it('should detect article type from keywords', () => {
    const result = parseMission('Write an article about sustainable energy');
    expect(result.type).toBe('article');
  });

  it('should detect presentation type from keywords', () => {
    const result = parseMission('Create a presentation on quarterly results');
    expect(result.type).toBe('presentation');
  });

  it('should detect audit type from keywords', () => {
    const result = parseMission('Perform a security audit on the web application');
    expect(result.type).toBe('audit');
  });

  it('should detect deployment type from keywords', () => {
    const result = parseMission('Deploy the new version to production');
    expect(result.type).toBe('deployment');
  });

  it('should detect monitoring type from keywords', () => {
    const result = parseMission('Set up monitoring for the API service');
    expect(result.type).toBe('monitoring');
  });

  it('should detect analysis type from keywords', () => {
    const result = parseMission('Analyze the sales data from Q4');
    expect(result.type).toBe('analysis');
  });

  it('should fall back to custom for unrecognized descriptions', () => {
    const result = parseMission('Do something unusual');
    expect(result.type).toBe('custom');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should extract intent as first sentence', () => {
    const result = parseMission('Build a course on Python. It should cover basics.');
    expect(result.intent).toContain('Build a course on Python');
  });

  it('should extract budget constraints', () => {
    const result = parseMission('Research AI safety with a budget of $5');
    expect(result.constraints.maxBudgetUsd).toBe(5);
  });

  it('should extract time constraints', () => {
    const result = parseMission('Write an article within 2 hours');
    expect(result.constraints.maxDurationMs).toBe(2 * 3600_000);
  });

  it('should extract format requirements', () => {
    const result = parseMission('Create a report in PDF and DOCX formats');
    expect(result.constraints.requiredFormats).toContain('pdf');
    expect(result.constraints.requiredFormats).toContain('docx');
  });

  it('should extract quality requirements', () => {
    const result = parseMission('Write a high-quality article on climate change');
    expect(result.constraints.minQualityScore).toBe(80);
  });

  it('should extract scope keywords', () => {
    const result = parseMission('Build a security API with frontend and backend');
    expect(result.scope).toContain('security');
    expect(result.scope).toContain('frontend');
    expect(result.scope).toContain('backend');
  });

  it('should extract deliverable expectations', () => {
    const result = parseMission('Create a course with quiz and slides');
    expect(result.deliverables).toContain('Course Content');
    expect(result.deliverables).toContain('Assessment Quiz');
    expect(result.deliverables).toContain('Presentation Slides');
  });

  it('should extract meaningful keywords', () => {
    const result = parseMission('Research machine learning algorithms');
    expect(result.keywords).toContain('research');
    expect(result.keywords).toContain('machine');
    expect(result.keywords).toContain('learning');
    expect(result.keywords).toContain('algorithms');
  });

  it('should filter stop words from keywords', () => {
    const result = parseMission('The quick brown fox jumps over the lazy dog');
    expect(result.keywords).not.toContain('the');
    expect(result.keywords).not.toContain('over');
  });
});

// ─── Template Tests ──────────────────────────────────────────

describe('Templates', () => {
  it('should provide a template for each mission type', () => {
    const types: MissionType[] = [
      'formation', 'research', 'article', 'presentation',
      'audit', 'deployment', 'monitoring', 'analysis', 'custom',
    ];

    for (const type of types) {
      expect(hasTemplate(type)).toBe(true);
      const template = getTemplate(type);
      expect(template.type).toBe(type);
      expect(template.steps.length).toBeGreaterThan(0);
      expect(template.dependencies.length).toBeGreaterThanOrEqual(0);
      expect(template.estimatedCostUsd).toBeGreaterThan(0);
      expect(template.estimatedDurationMs).toBeGreaterThan(0);
    }
  });

  it('should return all templates', () => {
    const templates = getAllTemplates();
    expect(templates.length).toBe(9);
  });

  it('formation template should have 8 steps', () => {
    const template = getTemplate('formation');
    expect(template.steps.length).toBe(8);
    expect(template.steps[0]!.name).toBe('Research Topic');
  });

  it('research template should have 5 steps', () => {
    const template = getTemplate('research');
    expect(template.steps.length).toBe(5);
  });

  it('article template should have 5 steps', () => {
    const template = getTemplate('article');
    expect(template.steps.length).toBe(5);
  });

  it('presentation template should have 5 steps', () => {
    const template = getTemplate('presentation');
    expect(template.steps.length).toBe(5);
  });

  it('audit template should have 4 steps', () => {
    const template = getTemplate('audit');
    expect(template.steps.length).toBe(4);
  });

  it('templates should have valid dependency references', () => {
    const templates = getAllTemplates();
    for (const template of templates) {
      const stepNames = new Set(template.steps.map((_, i) => `step_${i}`));
      for (const dep of template.dependencies) {
        expect(stepNames.has(dep.from), `Template ${template.type}: dep from "${dep.from}" not found`).toBe(true);
        expect(stepNames.has(dep.to), `Template ${template.type}: dep to "${dep.to}" not found`).toBe(true);
      }
    }
  });

  it('templates should have sequential dependencies (no cycles)', () => {
    const templates = getAllTemplates();
    for (const template of templates) {
      for (const dep of template.dependencies) {
        const fromIdx = parseInt(dep.from.split('_')[1]!, 10);
        const toIdx = parseInt(dep.to.split('_')[1]!, 10);
        expect(fromIdx, `Template ${template.type}: dependency should go forward`).toBeLessThan(toIdx);
      }
    }
  });
});

// ─── Planner Tests ───────────────────────────────────────────

describe('Planner', () => {
  function createTestMission(type: MissionType = 'research'): Mission {
    return {
      id: 'test_mission_1',
      description: 'Research the topic of artificial intelligence',
      type,
      parameters: {},
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  it('should create a plan with correct mission ID', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.missionId).toBe('test_mission_1');
  });

  it('should create steps with proper IDs', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.steps.length).toBeGreaterThan(0);
    for (let i = 0; i < plan.steps.length; i++) {
      expect(plan.steps[i]!.id).toBe(`step_${i}`);
    }
  });

  it('should copy dependencies from template', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.dependencies.length).toBeGreaterThan(0);
  });

  it('should include mission parameters in step inputs', () => {
    const mission = createTestMission();
    mission.parameters = { topic: 'AI safety' };
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    for (const step of plan.steps) {
      expect(step.input.missionId).toBe('test_mission_1');
      expect(step.input.topic).toBe('AI safety');
    }
  });

  it('should apply quality gates for high-quality missions', () => {
    const mission = createTestMission();
    mission.constraints = { minQualityScore: 90 };
    const parsed = parseMission(mission.description);
    parsed.constraints.minQualityScore = 90;
    const plan = createPlan(mission, parsed);
    const gatedSteps = plan.steps.filter((s) => s.qualityGate !== undefined);
    expect(gatedSteps.length).toBeGreaterThan(0);
  });

  it('should apply retry policies for critical missions', () => {
    const mission = createTestMission();
    mission.priority = 'critical';
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    for (const step of plan.steps) {
      expect(step.retryPolicy).toBeDefined();
      expect(step.retryPolicy!.maxAttempts).toBe(5);
    }
  });

  it('should apply retry policies for high-priority missions', () => {
    const mission = createTestMission();
    mission.priority = 'high';
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    for (const step of plan.steps) {
      expect(step.retryPolicy).toBeDefined();
      expect(step.retryPolicy!.maxAttempts).toBe(3);
    }
  });

  it('should calculate cost estimates', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('should calculate duration estimates', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.estimatedDurationMs).toBeGreaterThan(0);
  });

  it('should calculate quality estimates', () => {
    const mission = createTestMission();
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    expect(plan.estimatedQualityScore).toBeGreaterThan(0);
    expect(plan.estimatedQualityScore).toBeLessThanOrEqual(100);
  });

  it('should cap cost at budget constraint', () => {
    const mission = createTestMission();
    mission.constraints = { maxBudgetUsd: 0.5 };
    const parsed = parseMission(mission.description);
    parsed.constraints.maxBudgetUsd = 0.5;
    const plan = createPlan(mission, parsed);
    expect(plan.estimatedCostUsd).toBeLessThanOrEqual(0.5);
  });

  it('should work with all mission types', () => {
    const types: MissionType[] = [
      'formation', 'research', 'article', 'presentation',
      'audit', 'deployment', 'monitoring', 'analysis', 'custom',
    ];

    for (const type of types) {
      const mission: Mission = {
        id: `test_${type}`,
        description: `Create a ${type} task`,
        type,
        parameters: {},
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const parsed = parseMission(mission.description);
      const plan = createPlan(mission, parsed);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.missionId).toBe(`test_${type}`);
    }
  });
});

// ─── DAG Generator Tests ─────────────────────────────────────

describe('DAG Generator', () => {
  function createTestPlan() {
    const mission: Mission = {
      id: 'test_mission',
      description: 'Research AI safety',
      type: 'research',
      parameters: {},
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const parsed = parseMission(mission.description);
    return createPlan(mission, parsed);
  }

  it('should generate a valid DAG from a plan', () => {
    const plan = createTestPlan();
    const dag = generateDAG(plan);
    expect(dag.id).toBeDefined();
    expect(dag.nodes.length).toBe(plan.steps.length);
    expect(dag.edges.length).toBe(plan.dependencies.length);
  });

  it('should set correct node types', () => {
    const plan = createTestPlan();
    const dag = generateDAG(plan);
    for (const node of dag.nodes) {
      expect(node.type).toBe('task');
    }
  });

  it('should map step agentType to node config', () => {
    const plan = createTestPlan();
    const dag = generateDAG(plan);
    for (const node of dag.nodes) {
      expect(node.config.agentType).toBeDefined();
    }
  });

  it('should include mission metadata in DAG', () => {
    const plan = createTestPlan();
    const dag = generateDAG(plan);
    expect(dag.metadata).toBeDefined();
    expect(dag.metadata!.missionId).toBe('test_mission');
  });

  it('should apply retry policies from plan steps', () => {
    const mission: Mission = {
      id: 'test_mission',
      description: 'Research AI safety',
      type: 'research',
      parameters: {},
      priority: 'critical',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    const dag = generateDAG(plan);
    for (const node of dag.nodes) {
      expect(node.retryPolicy).toBeDefined();
    }
  });

  it('should apply quality gates from plan steps', () => {
    const mission: Mission = {
      id: 'test_mission',
      description: 'Write a high-quality research report',
      type: 'research',
      parameters: {},
      constraints: { minQualityScore: 90 },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const parsed = parseMission(mission.description);
    const plan = createPlan(mission, parsed);
    const dag = generateDAG(plan);
    const gatedNodes = dag.nodes.filter((n) => n.qualityGate !== undefined);
    expect(gatedNodes.length).toBeGreaterThan(0);
  });

  it('should validate generated DAGs (no cycles)', () => {
    const plan = createTestPlan();
    const dag = generateDAG(plan);
    const validation = validateGeneratedDAG(dag);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect cycles in invalid DAGs', () => {
    const dag = {
      id: 'bad_dag',
      name: 'Bad DAG',
      nodes: [
        { id: 'a', type: 'task' as const, name: 'A', config: {} },
        { id: 'b', type: 'task' as const, name: 'B', config: {} },
        { id: 'c', type: 'task' as const, name: 'C', config: {} },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
    };
    const validation = validateGeneratedDAG(dag);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should detect self-loops', () => {
    const dag = {
      id: 'self_loop_dag',
      name: 'Self Loop',
      nodes: [
        { id: 'a', type: 'task' as const, name: 'A', config: {} },
      ],
      edges: [
        { from: 'a', to: 'a' },
      ],
    };
    const validation = validateGeneratedDAG(dag);
    expect(validation.valid).toBe(false);
  });

  it('should detect duplicate node IDs', () => {
    const dag = {
      id: 'dup_dag',
      name: 'Duplicate',
      nodes: [
        { id: 'a', type: 'task' as const, name: 'A1', config: {} },
        { id: 'a', type: 'task' as const, name: 'A2', config: {} },
      ],
      edges: [],
    };
    const validation = validateGeneratedDAG(dag);
    expect(validation.valid).toBe(false);
  });

  it('should detect invalid edge references', () => {
    const dag = {
      id: 'bad_ref_dag',
      name: 'Bad Ref',
      nodes: [
        { id: 'a', type: 'task' as const, name: 'A', config: {} },
      ],
      edges: [
        { from: 'a', to: 'nonexistent' },
      ],
    };
    const validation = validateGeneratedDAG(dag);
    expect(validation.valid).toBe(false);
  });

  it('should warn about unreachable nodes', () => {
    const dag = {
      id: 'unreachable_dag',
      name: 'Unreachable',
      nodes: [
        { id: 'a', type: 'task' as const, name: 'A', config: {} },
        { id: 'b', type: 'task' as const, name: 'B', config: {} },
        { id: 'c', type: 'task' as const, name: 'C', config: {} },  // disconnected
      ],
      edges: [
        { from: 'a', to: 'b' },
      ],
    };
    const validation = validateGeneratedDAG(dag);
    expect(validation.warnings.length).toBeGreaterThan(0);
  });

  it('should generate DAGs for all mission types', () => {
    const types: MissionType[] = [
      'formation', 'research', 'article', 'presentation',
      'audit', 'deployment', 'monitoring', 'analysis', 'custom',
    ];

    for (const type of types) {
      const mission: Mission = {
        id: `test_${type}`,
        description: `Create a ${type} task`,
        type,
        parameters: {},
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const parsed = parseMission(mission.description);
      const plan = createPlan(mission, parsed);
      const dag = generateDAG(plan);
      const validation = validateGeneratedDAG(dag);
      expect(validation.valid, `DAG for ${type} should be valid`).toBe(true);
    }
  });
});

// ─── SuperOrchestrator Tests ─────────────────────────────────

describe('SuperOrchestrator', () => {
  let orchestrator: SuperOrchestrator;

  beforeEach(() => {
    orchestrator = createOrchestrator();
  });

  // ─── Mission Submission ──────────────────────────────────

  describe('submitMission', () => {
    it('should submit a mission and return it', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      expect(mission.id).toBeDefined();
      expect(mission.description).toBe('Research AI safety');
      expect(mission.status).toBe('pending');
      expect(mission.createdAt).toBeDefined();
    });

    it('should auto-detect mission type', async () => {
      const mission = await orchestrator.submitMission('Create a course on Python');
      expect(mission.type).toBe('formation');
    });

    it('should allow overriding mission type', async () => {
      const mission = await orchestrator.submitMission('Do something', { type: 'research' });
      expect(mission.type).toBe('research');
    });

    it('should accept mission options', async () => {
      const mission = await orchestrator.submitMission('Write an article', {
        type: 'article',
        priority: 'high',
        parameters: { topic: 'AI' },
        constraints: { maxBudgetUsd: 5 },
        metadata: { source: 'test' },
      });
      expect(mission.type).toBe('article');
      expect(mission.priority).toBe('high');
      expect(mission.parameters.topic).toBe('AI');
      expect(mission.constraints?.maxBudgetUsd).toBe(5);
      expect(mission.metadata?.source).toBe('test');
    });

    it('should store the mission', async () => {
      const mission = await orchestrator.submitMission('Research topic');
      const retrieved = await orchestrator.getMission(mission.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(mission.id);
    });

    it('should emit mission.submitted event', async () => {
      const eventBus = new EventBus();
      const received: unknown[] = [];
      eventBus.subscribe('mission.submitted', (event) => {
        received.push(event.payload);
      });

      const workflowManager = new WorkflowManager({ eventBus });
      const logger = createTestLogger();
      const orch = new SuperOrchestrator({
        eventBus,
        workflowManager,
        memoryStore: new MemoryStore(undefined, eventBus),
        knowledgeStore: new KnowledgeStore(undefined, eventBus),
        reflectionEngine: new ReflectionEngine(eventBus),
        learningEngine: new LearningEngine(eventBus),
        costOptimizer: new CostOptimizer(eventBus),
        logger,
      });

      await orch.submitMission('Research AI');
      expect(received.length).toBe(1);
    });
  });

  // ─── Mission Retrieval ───────────────────────────────────

  describe('getMission', () => {
    it('should return null for non-existent mission', async () => {
      const result = await orchestrator.getMission('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the mission by ID', async () => {
      const mission = await orchestrator.submitMission('Test');
      const retrieved = await orchestrator.getMission(mission.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(mission.id);
    });
  });

  // ─── Mission Listing ─────────────────────────────────────

  describe('listMissions', () => {
    it('should list all missions', async () => {
      await orchestrator.submitMission('Task 1');
      await orchestrator.submitMission('Task 2');
      const missions = await orchestrator.listMissions();
      expect(missions.length).toBe(2);
    });

    it('should filter by status', async () => {
      await orchestrator.submitMission('Task 1');
      const missions = await orchestrator.listMissions({ status: 'pending' });
      expect(missions.length).toBe(1);
    });

    it('should filter by type', async () => {
      await orchestrator.submitMission('Research AI safety');
      await orchestrator.submitMission('Write an article on climate');
      const missions = await orchestrator.listMissions({ type: 'research' });
      expect(missions.length).toBe(1);
      expect(missions[0]!.type).toBe('research');
    });
  });

  // ─── Mission Cancellation ────────────────────────────────

  describe('cancelMission', () => {
    it('should cancel a pending mission', async () => {
      const mission = await orchestrator.submitMission('Test');
      await orchestrator.cancelMission(mission.id);
      const retrieved = await orchestrator.getMission(mission.id);
      expect(retrieved!.status).toBe('cancelled');
    });

    it('should throw for non-existent mission', async () => {
      await expect(orchestrator.cancelMission('nonexistent')).rejects.toThrow('Mission not found');
    });

    it('should throw for already completed mission', async () => {
      const mission = await orchestrator.submitMission('Test');
      // Manually set status to completed
      const retrieved = await orchestrator.getMission(mission.id);
      retrieved!.status = 'completed';
      retrieved!.completedAt = new Date().toISOString();

      await expect(orchestrator.cancelMission(mission.id)).rejects.toThrow('Cannot cancel');
    });
  });

  // ─── Plan Creation ───────────────────────────────────────

  describe('createPlan', () => {
    it('should create a plan for a mission', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      const plan = await orchestrator.createPlan(mission);
      expect(plan.missionId).toBe(mission.id);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(mission.status).toBe('planning');
      expect(mission.plan).toBeDefined();
    });
  });

  // ─── Mission Execution ───────────────────────────────────

  describe('executeMission', () => {
    it('should execute a mission and return a result', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      const result = await orchestrator.executeMission(mission.id);

      expect(result.missionId).toBe(mission.id);
      expect(result.status).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should update mission status after execution', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      await orchestrator.executeMission(mission.id);
      const retrieved = await orchestrator.getMission(mission.id);
      expect(retrieved!.status).toBe('completed');
      expect(retrieved!.completedAt).toBeDefined();
    });

    it('should throw for non-existent mission', async () => {
      await expect(orchestrator.executeMission('nonexistent')).rejects.toThrow('Mission not found');
    });

    it('should throw for already executing mission', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      mission.status = 'executing';
      await expect(orchestrator.executeMission(mission.id)).rejects.toThrow('Cannot execute');
    });

    it('should store the result on the mission', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      await orchestrator.executeMission(mission.id);
      const retrieved = await orchestrator.getMission(mission.id);
      expect(retrieved!.result).toBeDefined();
      expect(retrieved!.result!.missionId).toBe(mission.id);
    });

    it('should emit mission.executing and mission.completed events', async () => {
      const eventBus = new EventBus();
      const events: string[] = [];
      eventBus.subscribe('mission.executing', () => events.push('executing'));
      eventBus.subscribe('mission.completed', () => events.push('completed'));

      const workflowManager = new WorkflowManager({ eventBus });
      const logger = createTestLogger();
      const orch = new SuperOrchestrator({
        eventBus,
        workflowManager,
        memoryStore: new MemoryStore(undefined, eventBus),
        knowledgeStore: new KnowledgeStore(undefined, eventBus),
        reflectionEngine: new ReflectionEngine(eventBus),
        learningEngine: new LearningEngine(eventBus),
        costOptimizer: new CostOptimizer(eventBus),
        logger,
      });

      const mission = await orch.submitMission('Research AI');
      await orch.executeMission(mission.id);
      expect(events).toContain('executing');
      expect(events).toContain('completed');
    });

    it('should execute all mission types successfully', async () => {
      const types: MissionType[] = [
        'formation', 'research', 'article', 'presentation',
        'audit', 'deployment', 'monitoring', 'analysis', 'custom',
      ];

      for (const type of types) {
        const orch = createOrchestrator();
        const mission = await orch.submitMission(`Create a ${type} task`, { type });
        const result = await orch.executeMission(mission.id);
        expect(result.status).toBe('success');
        expect(result.qualityScore).toBeGreaterThan(0);
      }
    });
  });

  // ─── Post-Execution Integration ──────────────────────────

  describe('post-execution integration', () => {
    it('should store mission in memory after execution', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      await orchestrator.executeMission(mission.id);
      // The memory store should have a workflow entry
      const stats = await orchestrator['memoryStore'].getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should record outcome in learning engine', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      await orchestrator.executeMission(mission.id);
      const learningStats = orchestrator['learningEngine'].getStats();
      expect(learningStats.totalOutcomes).toBeGreaterThan(0);
    });

    it('should reflect on results when autoReflect is enabled', async () => {
      const mission = await orchestrator.submitMission('Research AI safety');
      const result = await orchestrator.executeMission(mission.id);
      expect(result.reflections).toBeDefined();
    });

    it('should not reflect when autoReflect is disabled', async () => {
      const orch = createOrchestrator({ autoReflect: false });
      const mission = await orch.submitMission('Research AI safety');
      const result = await orch.executeMission(mission.id);
      expect(result.reflections).toBeUndefined();
    });
  });

  // ─── Agent Registry ──────────────────────────────────────

  describe('agent registry', () => {
    it('should register agent type mappings', () => {
      orchestrator.registerAgent('researcher', 'deep-research-agent');
      const agents = orchestrator.getRegisteredAgents();
      expect(agents.get('researcher')).toBe('deep-research-agent');
    });

    it('should unregister agent type mappings', () => {
      orchestrator.registerAgent('researcher', 'deep-research-agent');
      orchestrator.unregisterAgent('researcher');
      const agents = orchestrator.getRegisteredAgents();
      expect(agents.has('researcher')).toBe(false);
    });
  });

  // ─── Stats ───────────────────────────────────────────────

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = orchestrator.getStats();
      expect(stats.total).toBe(0);
    });

    it('should track missions by status', async () => {
      await orchestrator.submitMission('Task 1');
      await orchestrator.submitMission('Task 2');
      const stats = orchestrator.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byStatus.pending).toBe(2);
    });

    it('should track missions by type', async () => {
      await orchestrator.submitMission('Research AI');
      await orchestrator.submitMission('Write an article');
      const stats = orchestrator.getStats();
      expect(stats.byType.research).toBe(1);
      expect(stats.byType.article).toBe(1);
    });
  });

  // ─── Reset ───────────────────────────────────────────────

  describe('reset', () => {
    it('should clear all missions and agents', async () => {
      await orchestrator.submitMission('Task 1');
      orchestrator.registerAgent('test', 'test-agent');
      orchestrator.reset();
      const stats = orchestrator.getStats();
      expect(stats.total).toBe(0);
      expect(orchestrator.getRegisteredAgents().size).toBe(0);
    });
  });
});
