import { activity, drop } from './define'

export const investigationActivities = [
  activity({ skillId: 'investigation', id: 'pan-for-gold', name: 'Pan for Gold', description: 'Wash a pan in a stream for a few coins.', requiredLevel: 1, gold: { min: 2, max: 6 } }),
  activity({ skillId: 'investigation', id: 'forest-ruins', name: 'Forest Ruins', description: 'Dig a forest ruin for pages and coin.', requiredLevel: 10, outputs: [drop('ancient-page')], gold: { min: 4, max: 10 } }),
  activity({ skillId: 'investigation', id: 'appraisal', name: 'Appraisal', description: 'Appraise a curio for coin. Magic identification comes later.', requiredLevel: 20, gold: { min: 6, max: 14 } }),
]
