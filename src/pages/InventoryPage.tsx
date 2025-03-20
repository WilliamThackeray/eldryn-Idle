import { useGameState } from "../hooks/useGameState"

interface InventoryPageProps {
  currentPage: string
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  currentPage
}) => {
  const { gameState } = useGameState();
  return (
    <div className="text-center text-[#1f1f1f]">
      Inventory content will go here
    </div>
  )
}