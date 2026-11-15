export interface WeaponProperty {
  id: string
  name: string
  description: string
}

/** D&D weapon properties. These are attributes of weapons, not skills. */
export const WEAPON_PROPERTIES: readonly WeaponProperty[] = [
  {
    id: 'ammunition',
    name: 'Ammunition',
    description:
      'Ammunition for the weapon must be loaded before each attack. Each time you attack, you expend one piece of ammunition.',
  },
  {
    id: 'finesse',
    name: 'Finesse',
    description:
      'When making an attack with a finesse weapon, you use your choice of your Strength or Dexterity modifier for the attack and damage rolls.',
  },
  {
    id: 'heavy',
    name: 'Heavy',
    description:
      'Small creatures have disadvantage on attack rolls with heavy weapons. The size and bulk of heavy weapons make them too large for Small creatures to use effectively.',
  },
  {
    id: 'light',
    name: 'Light',
    description: 'A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons.',
  },
  {
    id: 'loading',
    name: 'Loading',
    description:
      'Because of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make.',
  },
  {
    id: 'range',
    name: 'Range',
    description:
      'A weapon that can be used to make a ranged attack has a range in parentheses after the ammunition or thrown property. The range lists two numbers. The first is the weapon’s normal range in feet, and the second is the weapon’s maximum range.',
  },
  {
    id: 'reach',
    name: 'Reach',
    description: 'This weapon adds 5 feet to your reach when you attack with it.',
  },
  {
    id: 'special',
    name: 'Special',
    description:
      'A weapon with the special property has special rules governing its use, explained in the weapon’s description.',
  },
  {
    id: 'thrown',
    name: 'Thrown',
    description:
      'If a weapon has the thrown property, you can throw the weapon to make a ranged attack. If the weapon is a melee weapon, you use the same ability modifier for that attack roll and damage roll that you would use for a melee attack with the weapon.',
  },
  {
    id: 'twoHanded',
    name: 'Two-Handed',
    description: 'This weapon requires two hands to use.',
  },
  {
    id: 'versatile',
    name: 'Versatile',
    description:
      'This weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage the weapon deals when it is used with two hands to make an attack.',
  },
]
