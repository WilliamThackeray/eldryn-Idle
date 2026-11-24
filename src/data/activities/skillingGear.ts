import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'
import type { ItemId } from '../items'
import type { TradeSkillId } from '../skills'

interface GearRecipe {
  craftSkill: TradeSkillId
  id: string
  name: string
  requiredLevel: number
  inputs: { itemId: ItemId; quantity?: number }[]
  output: ItemId
}

const RECIPES: GearRecipe[] = [
  { craftSkill: 'smithing', id: 'craft-miners-helm', name: "Craft Miner's Helm", requiredLevel: 5, inputs: [{ itemId: 'iron-bar' }], output: 'miners-helm' },
  { craftSkill: 'leatherworking', id: 'craft-prospectors-belt', name: "Craft Prospector's Belt", requiredLevel: 8, inputs: [{ itemId: 'hide', quantity: 2 }], output: 'prospectors-belt' },
  { craftSkill: 'leatherworking', id: 'craft-smiths-gauntlets', name: "Craft Smith's Gauntlets", requiredLevel: 11, inputs: [{ itemId: 'hide', quantity: 2 }], output: 'smiths-gauntlets' },
  { craftSkill: 'weaving', id: 'craft-forge-apron', name: 'Craft Forge Apron', requiredLevel: 2, inputs: [{ itemId: 'linen-cloth', quantity: 2 }], output: 'forge-apron' },
  { craftSkill: 'leatherworking', id: 'craft-loggers-gloves', name: "Craft Logger's Gloves", requiredLevel: 12, inputs: [{ itemId: 'hide' }], output: 'loggers-gloves' },
  { craftSkill: 'smithing', id: 'craft-woodcutters-helm', name: "Craft Woodcutter's Helm", requiredLevel: 45, inputs: [{ itemId: 'steel-bar' }], output: 'woodcutters-helm' },
  { craftSkill: 'leatherworking', id: 'craft-carvers-gloves', name: "Craft Carver's Gloves", requiredLevel: 23, inputs: [{ itemId: 'hide' }], output: 'carvers-gloves' },
  { craftSkill: 'jewelcrafting', id: 'craft-joiners-ring', name: "Craft Joiner's Ring", requiredLevel: 52, inputs: [{ itemId: 'silver-bar' }, { itemId: 'cut-quartz' }], output: 'joiners-ring' },
  { craftSkill: 'weaving', id: 'craft-tanners-apron', name: "Craft Tanner's Apron", requiredLevel: 9, inputs: [{ itemId: 'linen-cloth' }], output: 'tanners-apron' },
  { craftSkill: 'jewelcrafting', id: 'craft-awl-ring', name: 'Craft Awl Ring', requiredLevel: 58, inputs: [{ itemId: 'silver-bar' }, { itemId: 'cut-quartz' }], output: 'awl-ring' },
  { craftSkill: 'smithing', id: 'craft-loupe', name: 'Craft Loupe', requiredLevel: 10, inputs: [{ itemId: 'iron-bar' }, { itemId: 'cut-quartz' }], output: 'loupe' },
  { craftSkill: 'leatherworking', id: 'craft-setters-gloves', name: "Craft Setter's Gloves", requiredLevel: 27, inputs: [{ itemId: 'hide' }], output: 'setters-gloves' },
  { craftSkill: 'leatherworking', id: 'craft-thiefs-gloves', name: "Craft Thief's Gloves", requiredLevel: 29, inputs: [{ itemId: 'hide' }], output: 'thiefs-gloves' },
  { craftSkill: 'leatherworking', id: 'craft-thiefs-cloak', name: "Craft Thief's Cloak", requiredLevel: 34, inputs: [{ itemId: 'hide', quantity: 2 }], output: 'thiefs-cloak' },
  { craftSkill: 'leatherworking', id: 'craft-cooks-mitts', name: "Craft Cook's Mitts", requiredLevel: 37, inputs: [{ itemId: 'hide' }], output: 'cooks-mitts' },
  { craftSkill: 'weaving', id: 'craft-cooks-hat', name: "Craft Cook's Hat", requiredLevel: 15, inputs: [{ itemId: 'linen-cloth' }], output: 'cooks-hat' },
  { craftSkill: 'jewelcrafting', id: 'craft-alchemists-goggles', name: "Craft Alchemist's Goggles", requiredLevel: 13, inputs: [{ itemId: 'cut-quartz' }, { itemId: 'empty-vial' }], output: 'alchemists-goggles' },
  { craftSkill: 'weaving', id: 'craft-alchemists-belt', name: "Craft Alchemist's Belt", requiredLevel: 27, inputs: [{ itemId: 'linen-cloth', quantity: 2 }], output: 'alchemists-belt' },
  { craftSkill: 'jewelcrafting', id: 'craft-scribes-spectacles', name: "Craft Scribe's Spectacles", requiredLevel: 66, inputs: [{ itemId: 'cut-quartz' }, { itemId: 'silver-bar' }], output: 'scribes-spectacles' },
  { craftSkill: 'weaving', id: 'craft-scribes-gloves', name: "Craft Scribe's Gloves", requiredLevel: 37, inputs: [{ itemId: 'linen-cloth' }], output: 'scribes-gloves' },
  { craftSkill: 'jewelcrafting', id: 'craft-enchanters-circlet', name: "Craft Enchanter's Circlet", requiredLevel: 96, inputs: [{ itemId: 'cut-amethyst' }, { itemId: 'gold-bar' }], output: 'enchanters-circlet' },
  { craftSkill: 'weaving', id: 'craft-dust-stained-gloves', name: 'Craft Dust-stained Gloves', requiredLevel: 45, inputs: [{ itemId: 'wool-cloth' }], output: 'dust-stained-gloves' },
  { craftSkill: 'leatherworking', id: 'craft-weavers-gloves', name: "Craft Weaver's Gloves", requiredLevel: 40, inputs: [{ itemId: 'hide' }], output: 'weavers-gloves' },
  { craftSkill: 'jewelcrafting', id: 'craft-shuttle-ring', name: 'Craft Shuttle Ring', requiredLevel: 72, inputs: [{ itemId: 'silver-bar' }, { itemId: 'cut-quartz' }], output: 'shuttle-ring' },
  { craftSkill: 'weaving', id: 'craft-herbalists-satchel', name: "Craft Herbalist's Satchel", requiredLevel: 49, inputs: [{ itemId: 'linen-cloth' }], output: 'herbalists-satchel' },
  { craftSkill: 'leatherworking', id: 'craft-herbalists-hat', name: "Craft Herbalist's Hat", requiredLevel: 43, inputs: [{ itemId: 'hide' }], output: 'herbalists-hat' },
  { craftSkill: 'jewelcrafting', id: 'craft-anglers-ring', name: "Craft Angler's Ring", requiredLevel: 78, inputs: [{ itemId: 'silver-bar' }, { itemId: 'cut-quartz' }], output: 'anglers-ring' },
  { craftSkill: 'weaving', id: 'craft-anglers-hat', name: "Craft Angler's Hat", requiredLevel: 51, inputs: [{ itemId: 'linen-cloth' }], output: 'anglers-hat' },
  { craftSkill: 'leatherworking', id: 'craft-hunters-cloak', name: "Craft Hunter's Cloak", requiredLevel: 47, inputs: [{ itemId: 'hide', quantity: 2 }], output: 'hunters-cloak' },
  { craftSkill: 'leatherworking', id: 'craft-hunters-boots', name: "Craft Hunter's Boots", requiredLevel: 50, inputs: [{ itemId: 'hide', quantity: 2 }], output: 'hunters-boots' },
  { craftSkill: 'jewelcrafting', id: 'craft-merchants-ring', name: "Craft Merchant's Ring", requiredLevel: 88, inputs: [{ itemId: 'silver-bar' }, { itemId: 'cut-quartz' }], output: 'merchants-ring' },
  { craftSkill: 'weaving', id: 'craft-merchants-hat', name: "Craft Merchant's Hat", requiredLevel: 63, inputs: [{ itemId: 'linen-cloth' }], output: 'merchants-hat' },
  { craftSkill: 'weaving', id: 'craft-performers-gloves', name: "Craft Performer's Gloves", requiredLevel: 75, inputs: [{ itemId: 'linen-cloth' }], output: 'performers-gloves' },
  { craftSkill: 'leatherworking', id: 'craft-performers-feathered-hat', name: "Craft Performer's Feathered Hat", requiredLevel: 54, inputs: [{ itemId: 'hide' }, { itemId: 'feathers', quantity: 2 }], output: 'performers-feathered-hat' },
  { craftSkill: 'jewelcrafting', id: 'craft-binders-amulet', name: "Craft Binder's Amulet", requiredLevel: 92, inputs: [{ itemId: 'gold-bar' }, { itemId: 'cut-amethyst' }], output: 'binders-amulet' },
  { craftSkill: 'weaving', id: 'craft-binders-gloves', name: "Craft Binder's Gloves", requiredLevel: 78, inputs: [{ itemId: 'wool-cloth' }], output: 'binders-gloves' },
]

export const skillingGearActivities: ActivityDef[] = RECIPES.map((recipe) =>
  activity({
    skillId: recipe.craftSkill,
    id: recipe.id,
    name: recipe.name,
    description: `Craft skilling gear.`,
    requiredLevel: recipe.requiredLevel,
    inputs: recipe.inputs.map((entry) => stack(entry.itemId, entry.quantity ?? 1)),
    outputs: [drop(recipe.output)],
    category: 'Skilling Gear',
  }),
)
