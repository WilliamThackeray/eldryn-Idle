import { activity, drop, stack } from './define'

function pact(
  id: string,
  name: string,
  description: string,
  level: number,
  inputs: ReturnType<typeof stack>[] = [],
  output?: Parameters<typeof drop>[0],
) {
  return activity({
    skillId: 'binding',
    id,
    name,
    description,
    requiredLevel: level,
    inputs: inputs.length ? inputs : undefined,
    outputs: output ? [drop(output)] : [],
    category: 'Pacts',
  })
}

export const bindingActivities = [
  pact('bind-familiar-spark', 'Bind Familiar Spark', 'Bind arcane dust to a small animal. A weak summon.', 1, [stack('small-animal'), stack('arcane-dust')], 'familiar-spark'),
  pact('bind-wolf', 'Bind Wolf', 'Bind a live animal with food into a Bound Wolf.', 6, [stack('medium-animal'), stack('cooked-meat')], 'bound-wolf'),
  pact('bind-hawk', 'Bind Hawk', 'Bind a live bird with eggs into a Bound Hawk.', 12, [stack('air-fowl'), stack('eggs')], 'bound-hawk'),
  pact('conjure-fire-elemental', 'Conjure Minor Fire Elemental', 'Bind Fire Essence with Arcane Dust.', 18, [stack('fire-essence'), stack('arcane-dust', 5)], 'minor-fire-elemental'),
  pact('bind-boar', 'Bind Boar', 'Bind a large animal with raw meat into a Bound Boar.', 24, [stack('large-animal'), stack('raw-meat')], 'bound-boar'),
  pact('conjure-earth-elemental', 'Conjure Minor Earth Elemental', 'Bind Earth Essence with Arcane Dust.', 30, [stack('earth-essence'), stack('arcane-dust', 5)], 'minor-earth-elemental'),
  pact('bind-servitor', 'Bind Skeleton Servitor', 'Bind bones with Ghoul Ichor into a Skeleton Servitor.', 36, [stack('bones'), stack('ghoul-ichor')], 'skeleton-servitor'),
  pact('steady-spark', 'Steady the Spark', 'Practice holding a pact without a new summon.', 42),
  pact('circle-pact', 'Circle the Pact', 'Walk the binding circle until it holds.', 48),
  pact('name-spirit', 'Name the Spirit', 'Give a bound spirit its name.', 54),
  pact('hold-gate', 'Hold the Gate', 'Keep a gate from fraying.', 64),
  pact('seal-bond', 'Seal the Lesser Bond', 'Seal a pact so it lasts.', 74),
  pact('bind-shade', 'Bind Shade', 'Bind bones with Shadow Essence into a Shade.', 82, [stack('bones'), stack('shadow-essence')], 'shade'),
]
