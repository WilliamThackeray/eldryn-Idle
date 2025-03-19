import { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { initialGameState } from '../data/initialState';

const STORAGE_KEY = 'idle_game_save';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialGameState;
  });

  const saveGame = () => {
    const updatedState = {
      ...gameState,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
    setGameState(updatedState);
  };

  return { gameState, setGameState, saveGame };
};