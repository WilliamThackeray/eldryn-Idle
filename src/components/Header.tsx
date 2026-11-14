import React, { useState } from 'react';
import { User, Save } from 'lucide-react';
import { GameState, Skill } from '../types/game';
import { useGameState } from '../hooks/useGameState';

interface HeaderProps {
  title: string;
  gameState: GameState;
  skills: Skill[];
}

export const Header: React.FC<HeaderProps> = ({ title, gameState, skills }) => {
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const { saveGame } = useGameState();


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

          {/* //todo: extract character info to own component */}
          {showCharacterInfo && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1f1f1f] rounded-lg shadow-lg p-4">
              <h3 className="font-bold mb-2">Skills Overview</h3>
              <div className="space-y-2">
                {skills.map(skill => (
                  <div key={skill.id} className="flex justify-between">
                    <span>{skill.name}</span>
                    <span>Level {skill.level}</span>
                  </div>
                ))}
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
  );
};