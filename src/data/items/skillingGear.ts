import type { TradeSkillId } from '../skills'
import { magicBonusForRarity, type GearSlot, type ItemDef } from './types'

function skilling(
  id: string,
  name: string,
  description: string,
  slot: GearSlot,
  skillId: TradeSkillId,
  check: number,
  sellValue: number,
  extra?: { skillXpPct?: number },
): ItemDef {
  return {
    id,
    name,
    description,
    category: 'gear',
    rarity: check >= 3 ? 'rare' : check >= 2 ? 'uncommon' : 'common',
    stackable: true,
    sellValue,
    tags: ['skilling'],
    qualityKind: 'skilling-gear',
    gear: {
      slot,
      magicBonus: magicBonusForRarity('common'),
      stats: {
        skillCheck: { [skillId]: check },
        ...(extra?.skillXpPct != null ? { skillXpPct: { [skillId]: extra.skillXpPct } } : {}),
      },
    },
  }
}

export const SKILLING_GEAR = [
  skilling('miners-helm', "Miner's Helm", 'A stout helm for the mine.', 'helmet', 'mining', 1, 8),
  skilling('prospectors-belt', "Prospector's Belt", 'A belt of sample pouches.', 'belt', 'mining', 2, 14),
  skilling('lucky-nugget', 'Lucky Nugget', 'A golden nugget set as a ring.', 'ring', 'mining', 1, 20),

  skilling('smiths-gauntlets', "Smith's Gauntlets", 'Heat-scarred forging gloves.', 'gauntlets', 'smithing', 1, 10),
  skilling('forge-apron', 'Forge Apron', 'A thick apron for the forge.', 'belt', 'smithing', 2, 16),
  skilling('goblin-tinkers-goggles', "Goblin Tinker's Goggles", 'Crooked goggles that somehow help at the anvil.', 'helmet', 'smithing', 1, 18),

  skilling('loggers-gloves', "Logger's Gloves", 'Grip gloves for the axe.', 'gauntlets', 'woodcutting', 1, 8),
  skilling('woodcutters-helm', "Woodcutter's Helm", 'A helm that shrugs off falling limbs.', 'helmet', 'woodcutting', 2, 16),

  skilling('carvers-gloves', "Carver's Gloves", 'Fine gloves for woodcraft.', 'gauntlets', 'woodcraft', 1, 8),
  skilling('joiners-ring', "Joiner's Ring", 'A ring that steadies the chisel.', 'ring', 'woodcraft', 2, 14),

  skilling('tanners-apron', "Tanner's Apron", 'A belt apron for leatherwork.', 'belt', 'leatherworking', 1, 8),
  skilling('awl-ring', 'Awl Ring', 'A ring set with a tiny awl tip.', 'ring', 'leatherworking', 2, 14),

  skilling('loupe', 'Loupe', 'A jeweler\'s loupe worn as a helm glass.', 'helmet', 'jewelcrafting', 1, 10),
  skilling('setters-gloves', "Setter's Gloves", 'Soft gloves for setting stones.', 'gauntlets', 'jewelcrafting', 2, 14),

  skilling('thiefs-gloves', "Thief's Gloves", 'Quiet fingers.', 'gauntlets', 'thievery', 1, 10),
  skilling('thiefs-cloak', "Thief's Cloak", 'A cloak that drinks light.', 'cloak', 'thievery', 2, 18),

  skilling('cooks-mitts', "Cook's Mitts", 'Mitts for the hearth.', 'gauntlets', 'cooking', 1, 8),
  skilling('cooks-hat', "Cook's Hat", 'A tall white hat.', 'helmet', 'cooking', 2, 12),

  skilling('alchemists-goggles', "Alchemist's Goggles", 'Goggles that keep fumes out.', 'helmet', 'alchemy', 1, 14),
  skilling('alchemists-belt', "Alchemist's Belt", 'Vial loops for the belt.', 'belt', 'alchemy', 2, 16),

  skilling('scribes-spectacles', "Scribe's Spectacles", 'Spectacles for fine script.', 'helmet', 'scribing', 1, 12),
  skilling('scribes-gloves', "Scribe's Gloves", 'Ink-stained gloves.', 'gauntlets', 'scribing', 2, 12),

  skilling('enchanters-circlet', "Enchanter's Circlet", 'A circlet that hums with dust.', 'helmet', 'enchanting', 1, 16),
  skilling('dust-stained-gloves', 'Dust-stained Gloves', 'Gloves sifted with Arcane Dust.', 'gauntlets', 'enchanting', 2, 14),

  skilling('weavers-gloves', "Weaver's Gloves", 'Gloves for the loom.', 'gauntlets', 'weaving', 1, 8),
  skilling('shuttle-ring', 'Shuttle Ring', 'A ring shaped like a shuttle.', 'ring', 'weaving', 2, 12),

  skilling('herbalists-satchel', "Herbalist's Satchel", 'A belt satchel for cuttings.', 'belt', 'foraging', 1, 10),
  skilling('herbalists-hat', "Herbalist's Hat", 'A wide brim for the wilds.', 'helmet', 'foraging', 2, 12),

  skilling('anglers-ring', "Angler's Ring", 'A ring that smells faintly of bait.', 'ring', 'fishing', 1, 12),
  skilling('anglers-hat', "Angler's Hat", 'A hat stuck with flies.', 'helmet', 'fishing', 2, 12),

  skilling('hunters-cloak', "Hunter's Cloak", 'A cloak of muted greens.', 'cloak', 'hunting', 1, 12),
  skilling('hunters-boots', "Hunter's Boots", 'Soft boots for tracking.', 'boots', 'hunting', 2, 14),

  skilling('merchants-ring', "Merchant's Ring", 'A ring that opens purses.', 'ring', 'commerce', 1, 12),
  skilling('merchants-hat', "Merchant's Hat", 'A feathered trader\'s hat.', 'helmet', 'commerce', 2, 14),

  skilling('performers-gloves', "Performer's Gloves", 'Flashy gloves for the stage.', 'gauntlets', 'performance', 1, 10),
  skilling('performers-feathered-hat', "Performer's Feathered Hat", 'A hat crowned with feathers.', 'helmet', 'performance', 2, 16),

  skilling('binders-amulet', "Binder's Amulet", 'An amulet of sealed pacts.', 'necklace', 'binding', 1, 16),
  skilling('binders-gloves', "Binder's Gloves", 'Gloves chalked with binding marks.', 'gauntlets', 'binding', 2, 14),
] as const satisfies readonly ItemDef[]
