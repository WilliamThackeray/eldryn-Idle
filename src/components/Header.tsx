import { Save, User } from 'lucide-react'
import { useState } from 'react'
import { SKILLS } from '../data/skills'
import { deriveAbilities } from '../engine/abilities'
import { describeXp } from '../engine/experience'
import { useGameStore } from '../store/gameStore'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const [showCharacterInfo, setShowCharacterInfo] = useState(false)
  const skills = useGameStore((state) => state.skills)
  const saveGame = useGameStore((state) => state.saveGame)
  const abilities = deriveAbilities(skills)

  return (
    <div className="bg-[#1f1f1f] text-[#DAD6D6] p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowCharacterInfo(!showCharacterInfo)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#694A38]"
          >
            <User size={20} />
            <span>Character Info</span>
          </button>

          {showCharacterInfo && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-auto bg-[#1f1f1f] rounded-lg shadow-lg p-4 z-10">
              <h3 className="font-bold mb-2">Abilities</h3>
              <div className="space-y-1 mb-3">
                {abilities.map((ability) => (
                  <div key={ability.id} className="flex justify-between">
                    <span>{ability.abbr}</span>
                    <span>
                      {ability.score} ({ability.modifier >= 0 ? `+${ability.modifier}` : ability.modifier})
                    </span>
                  </div>
                ))}
              </div>
              <h3 className="font-bold mb-2">Skills</h3>
              <div className="space-y-1">
                {SKILLS.map((skill) => {
                  const progress = describeXp(skills[skill.id].xp)
                  return (
                    <div key={skill.id} className="flex justify-between gap-3">
                      <span>{skill.name}</span>
                      <span className="shrink-0">
                        {progress.level} · {progress.xp} XP
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={saveGame}
          className="flex items-center gap-2 px-4 py-2 bg-[#92BFB1] text-[#1f1f1f] rounded-lg hover:bg-[#F4AC45] transition-colors"
        >
          <Save size={20} />
          <span>Save Game</span>
        </button>
      </div>
    </div>
  )
}
