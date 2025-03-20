import { useGameState } from "../hooks/useGameState"

interface ShopPageProps {
  currentPage: string
}

export const ShopPage: React.FC<ShopPageProps> = ({
  currentPage
}) => {
  const { gameState } = useGameState();
  return (
    <div className="text-center text-[#1f1f1f]">
      Shop content will go here
    </div>
  )
}