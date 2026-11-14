import { useState } from 'react';

// Pages
import { SkillPage } from './pages/SkillPage/SkillPage';
import { InventoryPage } from './pages/InventoryPage/InventoryPage';
import { ShopPage } from './pages/ShopPage/ShopPage';
import { CombatPage } from './pages/CombatPage/CombatPage';

// Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { useGameState } from './hooks/useGameState';

//todo: move applicable components to a components folder in the specific page folder
//todo: Should I extract the routing to it's own component? 
//     * this would make App() as simple as possible

function App() {
  const [currentPage, setCurrentPage] = useState('shop');
  const { gameState, saveGame } = useGameState();
  const skills = [...gameState.character.combatSkills, ...gameState.character.nonCombatSkills, ...gameState.character.passiveSkills];

  const getPageTitle = () => {
    if (currentPage === 'shop') return 'Shop';
    if (currentPage === 'inventory') return 'Inventory';
    const skill = skills.find(s => s.id === currentPage);
    return skill ? skill.name : '';
  };

  return (
    <div className="flex min-h-screen bg-[#DAD6D6]">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="flex-1">
        <Header title={getPageTitle()} gameState={gameState} skills={skills} />

        <div className="p-6">
          {currentPage !== 'shop' && currentPage !== 'inventory' && (
            <>
              {skills.find(s => s.id === currentPage)?.category === 'combat' ? (
                <CombatPage currentPage={currentPage} />
              ) : (
                <SkillPage currentPage={currentPage} />
              )
              }
            </>
          )}

          {currentPage === 'shop' && (
            <ShopPage currentPage={currentPage} />

          )}

          {currentPage === 'inventory' && (
            <InventoryPage currentPage={currentPage} />

          )}
        </div>
      </main >
    </div >
  );
}

export default App;