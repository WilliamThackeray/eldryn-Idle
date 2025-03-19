import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SkillProgress } from './components/SkillProgress';
import { SkillCard } from './components/SkillCard';
import { useGameState } from './hooks/useGameState';

function App() {
  const [currentPage, setCurrentPage] = useState('shop');
  const { gameState, setGameState, saveGame } = useGameState();

  const getPageTitle = () => {
    if (currentPage === 'shop') return 'Shop';
    if (currentPage === 'inventory') return 'Inventory';
    const skill = gameState.character.skills.find(s => s.id === currentPage);
    return skill ? skill.name : '';
  };

  const handleSkillAction = (skillId: string, xpGain: number) => {
    setGameState(prev => ({
      ...prev,
      character: {
        ...prev.character,
        skills: prev.character.skills.map(skill =>
          skill.id === skillId
            ? { ...skill, currentXP: skill.currentXP + xpGain }
            : skill
        )
      }
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#DAD6D6]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main className="flex-1">
        <Header title={getPageTitle()} gameState={gameState} onSave={saveGame} />
        
        <div className="p-6">
          {currentPage !== 'shop' && currentPage !== 'inventory' && (
            <>
              {/* Skill Progress */}
              {gameState.character.skills.find(s => s.id === currentPage) && (
                <div className="mb-6">
                  <SkillProgress 
                    skill={gameState.character.skills.find(s => s.id === currentPage)!} 
                  />
                </div>
              )}

              {/* Skill Training Options */}
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
            </>
          )}

          {currentPage === 'shop' && (
            <div className="text-center text-[#1f1f1f]">
              Shop content will go here
            </div>
          )}

          {currentPage === 'inventory' && (
            <div className="text-center text-[#1f1f1f]">
              Inventory content will go here
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;