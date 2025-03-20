import { useGameState } from "../hooks/useGameState";

export default function handleSkillAction(
  skillId: string,
  xpGain: number
): undefined {
  const { setGameState } = useGameState();
  setGameState((prev) => ({
    ...prev,
    character: {
      ...prev.character,
      combatSkills: prev.character.combatSkills.map((skill) =>
        skill.id === skillId
          ? { ...skill, currentXP: skill.currentXP + xpGain }
          : skill
      ),
      nonCombatSkills: prev.character.nonCombatSkills.map((skill) =>
        skill.id === skillId
          ? { ...skill, currentXP: skill.currentXP + xpGain }
          : skill
      ),
      passiveSkills: prev.character.passiveSkills.map((skill) =>
        skill.id === skillId
          ? { ...skill, currentXP: skill.currentXP + xpGain }
          : skill
      ),
    },
  }));
}
