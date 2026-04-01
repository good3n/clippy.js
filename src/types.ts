export interface AgentData {
  overlayCount: number;
  sounds: string[];
  framesize: [number, number];
  animations: Record<string, AnimationData>;
}

export interface AnimationData {
  frames: FrameData[];
  useExitBranching?: boolean;
}

export interface FrameData {
  duration: number;
  images?: [number, number][];
  sound?: string;
  exitBranch?: number;
  branching?: {
    branches: BranchData[];
  };
}

export interface BranchData {
  frameIndex: number;
  weight: number;
}

export interface SoundMap {
  [name: string]: string;
}

export interface Point {
  x: number;
  y: number;
}

export type AnimatorState = 'WAITING' | 'EXITED';
export type StateChangeCallback = (name: string, state: AnimatorState) => void;

export type AgentName =
  | 'Bonzi'
  | 'Clippy'
  | 'F1'
  | 'Genie'
  | 'Genius'
  | 'Links'
  | 'Merlin'
  | 'Peedy'
  | 'Rocky'
  | 'Rover';

export interface ClippyConfig {
  /** Base path to agent assets. Defaults to bundled CDN. */
  basePath?: string;
  /** Allow sounds. Defaults to true. */
  sounds?: boolean;
}
