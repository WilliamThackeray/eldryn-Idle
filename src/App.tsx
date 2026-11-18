import { useState } from 'react'
import { Header } from './components/Header'
import { OfflineModal } from './components/OfflineModal'
import { RankToast } from './components/RankToast'
import { Sidebar } from './components/Sidebar'
import { useGameLoop } from './hooks/useGameLoop'
import { isSkillId, SKILLS } from './data/skills'
import { CharacterPage } from './pages/CharacterPage/CharacterPage'
import { CombatPage } from './pages/CombatPage/CombatPage'
import { InventoryPage } from './pages/InventoryPage/InventoryPage'
import { MainMenuPage } from './pages/MainMenuPage/MainMenuPage'
import { QuestPage } from './pages/QuestPage/QuestPage'
import { ShopPage } from './pages/ShopPage/ShopPage'
import { SkillPage } from './pages/SkillPage/SkillPage'
import { flushSave } from './store/gameStore'
import { bindSlot, currentSlot } from './store/slots'

function pageTitle(page: string): string {
  if (page === 'shop') return 'Shop'
  if (page === 'inventory') return 'Inventory'
  if (page === 'monsterHunting') return 'Combat'
  if (page === 'quests') return 'Quests'
  if (page === 'character') return 'Character'
  return SKILLS.find((skill) => skill.id === page)?.name ?? ''
}

function App() {
  const [playing, setPlaying] = useState(() => currentSlot() != null)
  useGameLoop(playing)
  const [currentPage, setCurrentPage] = useState('shop')
  const skillId = isSkillId(currentPage) ? currentPage : null

  if (!playing) return <MainMenuPage onStart={() => setPlaying(true)} />

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-ink text-parchment">
        <OfflineModal />
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

        <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
          <Header
            title={pageTitle(currentPage)}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onMainMenu={() => {
              flushSave()
              bindSlot(null)
              setPlaying(false)
            }}
          />

          <div className="min-h-0 flex-1 overflow-auto p-6">
            {skillId && <SkillPage skillId={skillId} />}
            {currentPage === 'shop' && <ShopPage />}
            {currentPage === 'inventory' && <InventoryPage />}
            {currentPage === 'monsterHunting' && <CombatPage />}
            {currentPage === 'quests' && <QuestPage />}
            {currentPage === 'character' && <CharacterPage />}
          </div>
        </main>
      </div>

      <RankToast />
      {/* Outside overflow:hidden so hover labels are not clipped. */}
      <div id="tooltip-root" className="pointer-events-none fixed inset-0 z-50" />
    </>
  )
}

export default App
