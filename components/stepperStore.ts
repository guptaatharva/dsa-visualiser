import { create } from 'zustand';

interface StepperState {
  stepIdx: number;
  setStepIdx: (idx: number | ((prev: number) => number)) => void;
  autoPlay: boolean;
  setAutoPlay: (autoPlay: boolean | ((prev: boolean) => boolean)) => void;
}

export const useStepperStore = create<StepperState>((set) => ({
  stepIdx: 0,
  setStepIdx: (idx) =>
    set((state) => ({
      stepIdx: typeof idx === 'function' ? Math.max(0, idx(state.stepIdx)) : Math.max(0, idx),
    })),
  autoPlay: false,
  setAutoPlay: (autoPlay) =>
    set((state) => ({
      autoPlay: typeof autoPlay === 'function' ? autoPlay(state.autoPlay) : autoPlay,
    })),
})); 