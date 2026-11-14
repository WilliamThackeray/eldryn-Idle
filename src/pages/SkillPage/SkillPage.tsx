import { SkillCard } from "./components/SkillCard"
import { SkillProgress } from "./components/SkillProgress"
import handleSkillAction from "../../global-functions/handleSkillAction"
import { useGameState } from "../../hooks/useGameState"

interface SkillPageProps {
  currentPage: string
}

export const SkillPage: React.FC<SkillPageProps> = ({
  currentPage
}) => {
  const { gameState } = useGameState();
  const skills = [...gameState.character.combatSkills, ...gameState.character.nonCombatSkills, ...gameState.character.passiveSkills];
  return (
    <div>
      {skills.find(s => s.id === currentPage) && (
        <div className="mb-6">
          <SkillProgress
            skill={skills.find(s => s.id === currentPage)!}
          />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkillCard
          title="Basic Training"
          description="Practice the fundamentals"
          xpGain={10}
          onClick={() => handleSkillAction(currentPage, 10)}
        />
        <SkillCard
          title="Advanced Training"
          description="Push your limits"
          xpGain={25}
          onClick={() => handleSkillAction(currentPage, 25)}
        />
        <SkillCard
          title="Expert Training"
          description="Master complex techniques"
          xpGain={50}
          onClick={() => handleSkillAction(currentPage, 50)}
        />
      </div>
    </div>
  )
}