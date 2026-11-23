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
import type { PageFocus } from './pages/pageFocus'
import { MileCampPage } from './pages/MileCampPage/MileCampPage'
import { ShopPage } from './pages/ShopPage/ShopPage'
import { SkillPage } from './pages/SkillPage/SkillPage'
import { flushSave } from './store/gameStore'
import { bindSlot, currentSlot } from './store/slots'

function pageTitle(page: string): string {
  if (page === 'shop') return 'Shop'
  if (page === 'inventory') return 'Inventory'
  if (page === 'monsterHunting') return 'Combat'
  if (page === 'mile-camp') return 'Mile-Camp'
  if (page === 'character') return 'Character'
  return SKILLS.find((skill) => skill.id === page)?.name ?? ''
}

function App() {
  const [playing, setPlaying] = useState(() => currentSlot() != null)
  useGameLoop(playing)
  const [currentPage, setCurrentPage] = useState('shop')
  const [pageFocus, setPageFocus] = useState<PageFocus | null>(null)
  const skillId =
    isSkillId(currentPage) && currentPage !== 'vitality' ? currentPage : null

  function navigate(page: string, focus?: PageFocus) {
    setCurrentPage(page)
    setPageFocus(focus ?? null)
  }

  if (!playing) return <MainMenuPage onStart={() => setPlaying(true)} />

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-ink text-parchment">
        <OfflineModal />
        <Sidebar currentPage={currentPage} setCurrentPage={(page) => navigate(page)} />

        <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
          <Header
            title={pageTitle(currentPage)}
            currentPage={currentPage}
            setCurrentPage={(page) => navigate(page)}
            onNavigate={navigate}
            onMainMenu={() => {
              flushSave()
              bindSlot(null)
              setPlaying(false)
            }}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {skillId && (
              <SkillPage
                skillId={skillId}
                focus={pageFocus?.kind === 'activity' && pageFocus.skillId === skillId ? pageFocus : null}
                onFocusConsumed={() => setPageFocus(null)}
              />
            )}
            {currentPage === 'shop' && <ShopPage />}
            {currentPage === 'inventory' && <InventoryPage onNavigate={navigate} />}
            {currentPage === 'monsterHunting' && (
              <CombatPage
                focus={
                  pageFocus?.kind === 'monster' || pageFocus?.kind === 'dungeon' ? pageFocus : null
                }
                onFocusConsumed={() => setPageFocus(null)}
              />
            )}
            {currentPage === 'mile-camp' && <MileCampPage />}
            {currentPage === 'character' && (
              <CharacterPage
                focus={pageFocus?.kind === 'spell' ? pageFocus : null}
                onFocusConsumed={() => setPageFocus(null)}
                onNavigate={navigate}
              />
            )}
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
