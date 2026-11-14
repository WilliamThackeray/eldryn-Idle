import { GameState } from "../types/game";

export const initialGameState: GameState = {
  character: {
    name: "bob",
    abilities: [
      {
        id: "strength",
        name: "Strength",
        abbr: "STR",
        score: 0,
        modifier: 0,
        description: "be strong",
      },
      {
        id: "dexterity",
        name: "Dexterity",
        abbr: "DEX",
        score: 0,
        modifier: 0,
        description: "be quick",
      },
      {
        id: "constitution",
        name: "Constitution",
        abbr: "CON",
        score: 0,
        modifier: 0,
        description: "be solid",
      },
      {
        id: "intelligence",
        name: "Intelligence",
        abbr: "INT",
        score: 0,
        modifier: 0,
        description: "be smart",
      },
      {
        id: "widsom",
        name: "Wisdom",
        abbr: "WIS",
        score: 0,
        modifier: 0,
        description: "be wise",
      },
      {
        id: "charisma",
        name: "Charisma",
        abbr: "CHA",
        score: 0,
        modifier: 0,
        description: "be rizzy",
      },
    ],
    combatSkills: [
      {
        id: "ammunition",
        name: "Ammunition",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "Ammunition for the weapon must be loaded before each attack. Each time you attack, you expend one piece of ammunition.",
      },
      {
        id: "finesse",
        name: "Finesse",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "When making an attack with a finesse weapon, you use your choice of your Strength or Dexterity modifier for the attack and damage rolls.",
      },
      {
        id: "heavy",
        name: "Heavy",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "Small creatures have disadvantage on attack rolls with heavy weapons. The size and bulk of heavy weapons make them too large for Small creatures to use effectively.",
      },
      {
        id: "light",
        name: "Light",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons.",
      },
      {
        id: "loading",
        name: "Loading",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "Because of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make.",
      },
      {
        id: "range",
        name: "Range",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "A weapon that can be used to make a ranged attack has a range in parentheses after the ammunition or thrown property. The range lists two numbers. The first is the weapon’s normal range in feet, and the second is the weapon’s maximum range.",
      },
      {
        id: "reach",
        name: "Reach",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "This weapon adds 5 feet to your reach when you attack with it.",
      },
      {
        id: "special",
        name: "Special",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "A weapon with the special property has special rules governing its use, explained in the weapon’s description.",
      },
      {
        id: "thrown",
        name: "Thrown",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "If a weapon has the thrown property, you can throw the weapon to make a ranged attack. If the weapon is a melee weapon, you use the same ability modifier for that attack roll and damage roll that you would use for a melee attack with the weapon.",
      },
      {
        id: "twoHanded",
        name: "Two-Handed",
        category: "combat",
        currentXP: 0,
        level: 1,
        description: "This weapon requires two hands to use.",
      },
      {
        id: "versatile",
        name: "Versatile",
        category: "combat",
        currentXP: 0,
        level: 1,
        description:
          "This weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage the weapon deals when it is used with two hands to make an attack.",
      },
    ],
    nonCombatSkills: [
      {
        id: "acrobatics",
        name: "Acrobatics",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Demonstrate agility, balance, and coordination.",
      },
      {
        id: "animalHandling",
        name: "Animal Handling",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Calm domestic animals and understand their intentions.",
      },
      {
        id: "arcana",
        name: "Arcana",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Recall lore about spells, magic items, eldritch symbols, magical traditions, planes of existence, and the inhabitants of those planes.",
      },
      {
        id: "athletics",
        name: "Athletics",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Perform physical feats of strength and endurance.",
      },
      {
        id: "deception",
        name: "Deception",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Conceal the truth, either verbally or through actions.",
      },
      {
        id: "history",
        name: "History",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Recall lore about historical events, legendary people, ancient kingdoms, past wars, and lost civilizations.",
      },
      {
        id: "insight",
        name: "Insight",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Determine the true intentions of a creature, such as when searching out a lie or predicting someone’s next move.",
      },
      {
        id: "intimidation",
        name: "Intimidation",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Influence someone through threats, hostile actions, and physical violence.",
      },
      {
        id: "investigation",
        name: "Investigation",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Make deductions based on clues and find hidden information.",
      },
      {
        id: "medicine",
        name: "Medicine",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Stabilize a dying companion or diagnose an illness.",
      },
      {
        id: "nature",
        name: "Nature",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Recall lore about terrain, plants, animals, weather, and natural cycles.",
      },
      {
        id: "perception",
        name: "Perception",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Notice details in your environment and detect hidden threats.",
      },
      {
        id: "performance",
        name: "Performance",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Entertain an audience through acting, singing, dancing, playing a musical instrument, or other forms of entertainment.",
      },
      {
        id: "persuasion",
        name: "Persuasion",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Influence someone with tact, social graces, or good nature.",
      },
      {
        id: "religion",
        name: "Religion",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults.",
      },
      {
        id: "sleightOfHand",
        name: "Sleight of Hand",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description: "Master the art of dexterity and finesse.",
      },
      {
        id: "stealth",
        name: "Stealth",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Conceal yourself from enemies, sneaking past guards, slipping away without being noticed, or hiding during combat.",
      },
      {
        id: "survival",
        name: "Survival",
        category: "non-combat",
        currentXP: 0,
        level: 1,
        description:
          "Follow tracks, hunt wild game, guide your group through frozen wastelands, identify signs that bear weather is near, and avoid quicksand and other natural hazards.",
      },
    ],
    passiveSkills: [
      {
        id: "passivetbd",
        name: "TBD",
        category: "passive",
        currentXP: 0,
        level: 1,
        description: "Increase mental focus and regeneration",
      },
    ],
    inventory: [],
  },
  lastSaved: new Date().toISOString(),
};
