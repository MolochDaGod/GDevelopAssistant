/**
 * Custom Cursor System
 * Different cursors for different RTS actions
 */

export type CursorType = 
  | 'default'
  | 'select'
  | 'attack'
  | 'target'
  | 'move'
  | 'gather'
  | 'build'
  | 'interact'
  | 'forbidden';

/**
 * Cursor definitions with CSS cursor properties
 */
export const CURSORS: Record<CursorType, string> = {
  default: 'default',
  select: 'pointer',
  attack: 'crosshair',
  target: 'crosshair',
  move: 'move',
  gather: 'grab',
  build: 'copy',
  interact: 'pointer',
  forbidden: 'not-allowed',
};

/**
 * Set cursor for canvas element
 */
export function setCursor(element: HTMLElement | null, cursorType: CursorType): void {
  if (!element) return;
  element.style.cursor = CURSORS[cursorType];
}

/**
 * Determine cursor based on game state
 */
export function getCursorForGameState(
  mouseX: number,
  mouseY: number,
  gameState: {
    hoveredUnit: { faction: string } | null;
    selectedUnits: Set<string>;
    playerFaction: string;
    isShiftPressed: boolean;
  }
): CursorType {
  // Hovering over enemy unit with selected units
  if (gameState.hoveredUnit && gameState.hoveredUnit.faction !== gameState.playerFaction) {
    if (gameState.selectedUnits.size > 0) {
      return 'attack';
    }
    return 'target';
  }
  
  // Hovering over friendly unit
  if (gameState.hoveredUnit && gameState.hoveredUnit.faction === gameState.playerFaction) {
    if (gameState.isShiftPressed) {
      return 'select'; // Add to selection
    }
    return 'default';
  }
  
  // Selected units, hovering over empty space
  if (gameState.selectedUnits.size > 0) {
    return 'move';
  }
  
  // Default
  return 'default';
}

/**
 * Create custom cursor image (SVG-based)
 * Returns base64 data URL
 */
export function createCustomCursor(type: CursorType, size: number = 32): string {
  const svg = getCursorSVG(type, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get SVG markup for cursor type
 */
function getCursorSVG(type: CursorType, size: number): string {
  const half = size / 2;
  
  switch (type) {
    case 'attack':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="red" stroke-width="2"/>
          <line x1="${half}" y1="4" x2="${half}" y2="${size - 4}" stroke="red" stroke-width="2"/>
          <line x1="4" y1="${half}" x2="${size - 4}" y2="${half}" stroke="red" stroke-width="2"/>
        </svg>
      `;
    
    case 'target':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${half}" cy="${half}" r="${half - 4}" fill="none" stroke="yellow" stroke-width="2"/>
          <circle cx="${half}" cy="${half}" r="${half / 2}" fill="none" stroke="yellow" stroke-width="1"/>
          <circle cx="${half}" cy="${half}" r="2" fill="yellow"/>
        </svg>
      `;
    
    case 'move':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <path d="M ${half} 4 L ${half} ${size - 4}" stroke="green" stroke-width="2" marker-end="url(#arrowhead)"/>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0,0 10,5 0,10" fill="green"/>
            </marker>
          </defs>
        </svg>
      `;
    
    case 'select':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="${size - 8}" height="${size - 8}" fill="none" stroke="cyan" stroke-width="2" stroke-dasharray="4,2"/>
        </svg>
      `;
    
    case 'gather':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${half}" cy="${half}" r="${half - 4}" fill="none" stroke="gold" stroke-width="2"/>
          <text x="${half}" y="${half + 4}" text-anchor="middle" font-size="16" fill="gold">$</text>
        </svg>
      `;
    
    case 'build':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="${size - 12}" height="${size - 12}" fill="none" stroke="blue" stroke-width="2"/>
          <line x1="6" y1="${half}" x2="${size - 6}" y2="${half}" stroke="blue" stroke-width="1"/>
          <line x1="${half}" y1="6" x2="${half}" y2="${size - 6}" stroke="blue" stroke-width="1"/>
        </svg>
      `;
    
    case 'forbidden':
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${half}" cy="${half}" r="${half - 4}" fill="none" stroke="red" stroke-width="3"/>
          <line x1="8" y1="8" x2="${size - 8}" y2="${size - 8}" stroke="red" stroke-width="3"/>
        </svg>
      `;
    
    default:
      return `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <path d="M 2 2 L 2 ${size - 4} L ${half} ${half} L ${size - 4} 2 Z" fill="white" stroke="black" stroke-width="1"/>
        </svg>
      `;
  }
}

/**
 * Apply custom cursor with image
 */
export function setCustomCursor(element: HTMLElement | null, type: CursorType): void {
  if (!element) return;
  
  const cursorImage = createCustomCursor(type);
  element.style.cursor = `url('${cursorImage}') 16 16, ${CURSORS[type]}`;
}

/**
 * Cursor manager class for easier usage
 */
export class CursorManager {
  private element: HTMLElement | null = null;
  private currentCursor: CursorType = 'default';
  
  constructor(element: HTMLElement | null) {
    this.element = element;
  }
  
  setCursor(type: CursorType): void {
    if (this.currentCursor === type) return;
    this.currentCursor = type;
    setCustomCursor(this.element, type);
  }
  
  getCursor(): CursorType {
    return this.currentCursor;
  }
  
  reset(): void {
    this.setCursor('default');
  }
}
