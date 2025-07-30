export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  numberFormat?: {
    type: 'general' | 'number' | 'currency' | 'accounting' | 'date' | 'time' | 'percentage' | 'fraction' | 'scientific' | 'text';
    decimals?: number;
    symbol?: string;
    negativeNumbers?: 'red' | 'parentheses' | 'redParentheses';
    dateFormat?: string;
  };
  border?: {
    top?: { style: 'thin' | 'medium' | 'thick' | 'double', color: string };
    right?: { style: 'thin' | 'medium' | 'thick' | 'double', color: string };
    bottom?: { style: 'thin' | 'medium' | 'thick' | 'double', color: string };
    left?: { style: 'thin' | 'medium' | 'thick' | 'double', color: string };
  };
}

export interface CellData {
  value: string;
  formula?: string;
  format?: CellFormat;
}

export interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export interface ClipboardData {
  cells: Record<string, CellData>;
  selection: Selection;
  operation: 'copy' | 'cut';
}

export interface RibbonActions {
  // Clipboard
  copy: () => void;
  paste: () => void;
  cut: () => void;
  
  // Font formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  
  // Colors
  setTextColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  
  // Alignment
  setHorizontalAlignment: (align: 'left' | 'center' | 'right') => void;
  setVerticalAlignment: (align: 'top' | 'middle' | 'bottom') => void;
  
  // Number formatting
  setNumberFormat: (format: CellFormat['numberFormat']) => void;
  increaseDecimals: () => void;
  decreaseDecimals: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
}