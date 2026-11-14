import handleSkillAction from "../../global-functions/handleSkillAction"

interface CombatPageProps {
  currentPage: string
}

export const CombatPage: React.FC<CombatPageProps> = ({
  currentPage
}) => {
  return (
    <div className="text-center text-[#1f1f1f]">
      Combat Page
    </div>
  )
}