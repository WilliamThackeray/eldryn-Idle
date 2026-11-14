import React from 'react';
import { Skill } from '../types/game';

interface SkillProgressProps {
  skill: Skill;
}

export const SkillProgress: React.FC<SkillProgressProps> = ({ skill }) => {
  const xpForNextLevel = Math.floor(100 * Math.pow(1.1, skill.level));
  const progress = (skill.currentXP / xpForNextLevel) * 100;

  return (
    <div className="bg-[#1f1f1f] text-[#DAD6D6] p-4 rounded-lg">
      <div className="flex justify-between mb-2">
        <span>Level {skill.level}</span>
        <span>{skill.currentXP} / {xpForNextLevel} XP</span>
      </div>
      <div className="w-full h-4 bg-[#694A38] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#F4AC45]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};