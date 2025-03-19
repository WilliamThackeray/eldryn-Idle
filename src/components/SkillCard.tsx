import React from 'react';

interface SkillCardProps {
  title: string;
  description: string;
  xpGain: number;
  onClick: () => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  title,
  description,
  xpGain,
  onClick
}) => {
  return (
    <div className="bg-[#1f1f1f] p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
      <h3 className="text-xl font-bold text-[#F4AC45] mb-2">{title}</h3>
      <p className="text-[#DAD6D6] mb-4">{description}</p>
      <div className="flex justify-between items-center">
        <span className="text-[#92BFB1]">+{xpGain} XP</span>
        <button
          onClick={onClick}
          className="px-4 py-2 bg-[#A61C3C] text-[#DAD6D6] rounded-lg hover:bg-[#694A38] transition-colors"
        >
          Train
        </button>
      </div>
    </div>
  );
};