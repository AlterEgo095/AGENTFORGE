/**
 * ALTER EGO OS — Pre-defined Mission Templates
 *
 * Ready-to-use templates for common mission types in ALTER EGO OS.
 */

import type { MissionTemplate } from './types.js';

// ─── Formation Complète ──────────────────────────────────────

export const FORMATION_COMPLETE_TEMPLATE: MissionTemplate = {
  id: 'formation-complete',
  name: 'Formation Complète',
  description:
    'Créer une formation complète avec tous les supports : plan de cours, diapositives, exercices pratiques, et évaluations.',
  missionType: 'formation',
  parameters: [
    {
      name: 'topic',
      type: 'string',
      label: 'Sujet de la formation',
      description: 'Le sujet ou domaine de la formation',
      required: true,
    },
    {
      name: 'targetAudience',
      type: 'string',
      label: 'Public cible',
      description: 'Niveau et profil du public visé',
      required: true,
    },
    {
      name: 'duration',
      type: 'select',
      label: 'Durée',
      description: 'Durée estimée de la formation',
      required: true,
      defaultValue: '2h',
      options: [
        { label: '1 heure', value: '1h' },
        { label: '2 heures', value: '2h' },
        { label: 'Demi-journée', value: '4h' },
        { label: 'Journée complète', value: '8h' },
      ],
    },
    {
      name: 'includeExercises',
      type: 'boolean',
      label: 'Inclure des exercices pratiques',
      required: false,
      defaultValue: true,
    },
    {
      name: 'includeAssessment',
      type: 'boolean',
      label: 'Inclure une évaluation',
      required: false,
      defaultValue: true,
    },
    {
      name: 'language',
      type: 'select',
      label: 'Langue',
      required: false,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
  defaultConstraints: {
    maxCostCents: 500,
    maxDurationMs: 30 * 60 * 1000, // 30 minutes
    minQualityScore: 0.85,
    tags: ['formation', 'education'],
  },
  estimatedDuration: '15-30 minutes',
  estimatedCost: '~5€',
};

// ─── Veille Technologique ────────────────────────────────────

export const VEILLE_TECHNOLOGIQUE_TEMPLATE: MissionTemplate = {
  id: 'veille-technologique',
  name: 'Veille Technologique',
  description:
    'Effectuer une veille technologique automatisée sur un sujet et générer un rapport synthétique.',
  missionType: 'research',
  parameters: [
    {
      name: 'domain',
      type: 'string',
      label: 'Domaine technologique',
      description: 'Le domaine ou la technologie à surveiller',
      required: true,
    },
    {
      name: 'depth',
      type: 'select',
      label: 'Profondeur',
      description: 'Niveau de profondeur de la recherche',
      required: false,
      defaultValue: 'medium',
      options: [
        { label: 'Rapide', value: 'shallow' },
        { label: 'Standard', value: 'medium' },
        { label: 'Approfondie', value: 'deep' },
      ],
    },
    {
      name: 'sources',
      type: 'multiselect',
      label: 'Sources',
      description: 'Types de sources à consulter',
      required: false,
      defaultValue: ['web', 'github'],
      options: [
        { label: 'Web', value: 'web' },
        { label: 'GitHub', value: 'github' },
        { label: 'Papers', value: 'papers' },
        { label: 'RSS', value: 'rss' },
      ],
    },
    {
      name: 'language',
      type: 'select',
      label: 'Langue du rapport',
      required: false,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
  defaultConstraints: {
    maxCostCents: 200,
    maxDurationMs: 15 * 60 * 1000, // 15 minutes
    minQualityScore: 0.75,
    tags: ['veille', 'research', 'technologie'],
  },
  estimatedDuration: '5-15 minutes',
  estimatedCost: '~2€',
};

// ─── Article Professionnel ───────────────────────────────────

export const ARTICLE_PROFESSIONNEL_TEMPLATE: MissionTemplate = {
  id: 'article-professionnel',
  name: 'Article Professionnel',
  description:
    'Rédiger un article professionnel optimisé pour la publication, avec recherche, rédaction et relecture.',
  missionType: 'article',
  parameters: [
    {
      name: 'subject',
      type: 'string',
      label: 'Sujet de l\'article',
      description: 'Le sujet principal de l\'article',
      required: true,
    },
    {
      name: 'tone',
      type: 'select',
      label: 'Ton',
      description: 'Ton de rédaction',
      required: false,
      defaultValue: 'professional',
      options: [
        { label: 'Professionnel', value: 'professional' },
        { label: 'Décontracté', value: 'casual' },
        { label: 'Académique', value: 'academic' },
        { label: 'Technique', value: 'technical' },
      ],
    },
    {
      name: 'length',
      type: 'select',
      label: 'Longueur',
      required: false,
      defaultValue: 'medium',
      options: [
        { label: 'Court (~500 mots)', value: 'short' },
        { label: 'Moyen (~1000 mots)', value: 'medium' },
        { label: 'Long (~2000 mots)', value: 'long' },
      ],
    },
    {
      name: 'seoOptimized',
      type: 'boolean',
      label: 'Optimisation SEO',
      required: false,
      defaultValue: true,
    },
    {
      name: 'language',
      type: 'select',
      label: 'Langue',
      required: false,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
  defaultConstraints: {
    maxCostCents: 300,
    maxDurationMs: 20 * 60 * 1000, // 20 minutes
    minQualityScore: 0.85,
    tags: ['article', 'redaction', 'publication'],
  },
  estimatedDuration: '10-20 minutes',
  estimatedCost: '~3€',
};

// ─── Présentation ────────────────────────────────────────────

export const PRESENTATION_TEMPLATE: MissionTemplate = {
  id: 'presentation',
  name: 'Présentation',
  description:
    'Créer une présentation professionnelle avec diapositives, notes de conférencier et visuels.',
  missionType: 'presentation',
  parameters: [
    {
      name: 'topic',
      type: 'string',
      label: 'Sujet de la présentation',
      description: 'Le sujet principal de la présentation',
      required: true,
    },
    {
      name: 'slideCount',
      type: 'number',
      label: 'Nombre de diapositives',
      required: false,
      defaultValue: 15,
    },
    {
      name: 'audience',
      type: 'select',
      label: 'Public',
      required: false,
      defaultValue: 'professional',
      options: [
        { label: 'Exécutif', value: 'executive' },
        { label: 'Professionnel', value: 'professional' },
        { label: 'Technique', value: 'technical' },
        { label: 'Grand public', value: 'general' },
      ],
    },
    {
      name: 'includeSpeakerNotes',
      type: 'boolean',
      label: 'Inclure les notes de conférencier',
      required: false,
      defaultValue: true,
    },
    {
      name: 'language',
      type: 'select',
      label: 'Langue',
      required: false,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
  defaultConstraints: {
    maxCostCents: 400,
    maxDurationMs: 25 * 60 * 1000, // 25 minutes
    minQualityScore: 0.80,
    tags: ['presentation', 'slides'],
  },
  estimatedDuration: '10-25 minutes',
  estimatedCost: '~4€',
};

// ─── Audit Infrastructure ────────────────────────────────────

export const AUDIT_INFRASTRUCTURE_TEMPLATE: MissionTemplate = {
  id: 'audit-infrastructure',
  name: 'Audit Infrastructure',
  description:
    'Réaliser un audit complet d\'une infrastructure VPS/serveur : sécurité, performance, et recommandations.',
  missionType: 'audit',
  parameters: [
    {
      name: 'target',
      type: 'string',
      label: 'Cible de l\'audit',
      description: 'URL ou adresse du serveur/VPS à auditer',
      required: true,
    },
    {
      name: 'auditType',
      type: 'multiselect',
      label: 'Types d\'audit',
      required: false,
      defaultValue: ['security', 'performance'],
      options: [
        { label: 'Sécurité', value: 'security' },
        { label: 'Performance', value: 'performance' },
        { label: 'Configuration', value: 'configuration' },
        { label: 'Conformité', value: 'compliance' },
      ],
    },
    {
      name: 'includeRecommendations',
      type: 'boolean',
      label: 'Inclure des recommandations',
      required: false,
      defaultValue: true,
    },
    {
      name: 'language',
      type: 'select',
      label: 'Langue du rapport',
      required: false,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
  defaultConstraints: {
    maxCostCents: 600,
    maxDurationMs: 45 * 60 * 1000, // 45 minutes
    minQualityScore: 0.90,
    tags: ['audit', 'infrastructure', 'securite'],
  },
  estimatedDuration: '20-45 minutes',
  estimatedCost: '~6€',
};

// ─── All Templates ───────────────────────────────────────────

/** All pre-defined mission templates */
export const PREDEFINED_TEMPLATES: MissionTemplate[] = [
  FORMATION_COMPLETE_TEMPLATE,
  VEILLE_TECHNOLOGIQUE_TEMPLATE,
  ARTICLE_PROFESSIONNEL_TEMPLATE,
  PRESENTATION_TEMPLATE,
  AUDIT_INFRASTRUCTURE_TEMPLATE,
];
