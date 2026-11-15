import { useState } from 'react'
import { Header } from './components/Header'
import { OfflineModal } from './components/OfflineModal'
import { Sidebar } from './components/Sidebar'
import { useGameLoop } from './hooks/useGameLoop'
import { isSkillId, SKILLS } from './data/skills'
import { CombatPage } from './pages/CombatPage/CombatPage'
import { InventoryPage } from './pages/InventoryPage/InventoryPage'
import { ShopPage } from './pages/ShopPage/ShopPage'
import { SkillPage } from './pages/SkillPage/SkillPage'

function pageTitle(page: string): string {
  if (page === 'shop') return 'Shop'
  if (page === 'inventory') return 'Inventory'
  if (page === 'monsterHunting') return 'Monster Hunting'
  return SKILLS.find((skill) => skill.id === page)?.name ?? ''
}

function App() {
  useGameLoop()
  const [currentPage, setCurrentPage] = useState('shop')
  const skillId = isSkillId(currentPage) ? currentPage : null

  return (
    <div className="flex min-h-screen bg-[#DAD6D6]">
      <OfflineModal />
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="flex-1">
        <Header title={pageTitle(currentPage)} />

        <div className="p-6">
          {skillId && <SkillPage skillId={skillId} />}
          {currentPage === 'shop' && <ShopPage />}
          {currentPage === 'inventory' && <InventoryPage />}
          {currentPage === 'monsterHunting' && <CombatPage />}
        </div>
      </main>
    </div>
  )
}

export default App
