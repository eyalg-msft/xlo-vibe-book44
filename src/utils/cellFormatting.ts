import React from 'react';
import { CellData, CellFormat, Selection, ClipboardData } from '@/types/cellTypes';

export function getCellRef(row: number, col: number): string {
  return indexToColumn(col) + (row + 1);
}

export function indexToColumn(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

export function columnToIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 65 + 1);
  }
  return result - 1;
}

export function getSelectionCellRefs(selection: Selection): string[] {
  const refs: string[] = [];
  const { start, end } = selection;
  
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      refs.push(getCellRef(row, col));
    }
  }
  
  return refs;
}

export function applyCellFormat(currentCell: CellData | undefined, format: Partial<CellFormat>): CellData {
  const cell = currentCell || { value: '' };
  return {
    ...cell,
    format: {
      ...cell.format,
      ...format
    }
  };
}

export function createClipboardData(
  cellData: Record<string, CellData>,
  selection: Selection,
  operation: 'copy' | 'cut'
): ClipboardData {
  const cells: Record<string, CellData> = {};
  const cellRefs = getSelectionCellRefs(selection);
  
  cellRefs.forEach(ref => {
    if (cellData[ref]) {
      cells[ref] = { ...cellData[ref] };
    }
  });
  
  return {
    cells,
    selection,
    operation
  };
}

export function applyClipboardData(
  currentCellData: Record<string, CellData>,
  clipboardData: ClipboardData,
  targetSelection: Selection
): Record<string, CellData> {
  const newCellData = { ...currentCellData };
  const { start: clipStart } = clipboardData.selection;
  const { start: targetStart } = targetSelection;
  
  // Calculate offset
  const rowOffset = targetStart.row - clipStart.row;
  const colOffset = targetStart.col - clipStart.col;
  
  // Apply clipboard data to new positions
  Object.keys(clipboardData.cells).forEach(originalRef => {
    // Parse original cell reference
    const match = originalRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    
    const [, col, row] = match;
    const originalRow = parseInt(row) - 1;
    const originalCol = columnToIndex(col);
    
    // Calculate new position
    const newRow = originalRow + rowOffset;
    const newCol = originalCol + colOffset;
    const newRef = getCellRef(newRow, newCol);
    
    // Copy cell data
    newCellData[newRef] = { ...clipboardData.cells[originalRef] };
    
    // If it was a cut operation, clear the original cell
    if (clipboardData.operation === 'cut') {
      delete newCellData[originalRef];
    }
  });
  
  return newCellData;
}

export function formatCellValue(cell: CellData | undefined): string {
  if (!cell || !cell.value) return '';
  
  const format = cell.format?.numberFormat;
  if (!format) return cell.value;
  
  const numValue = parseFloat(cell.value);
  if (isNaN(numValue)) return cell.value;
  
  switch (format.type) {
    case 'number':
      return numValue.toFixed(format.decimals || 0);
    
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: format.decimals || 2,
        maximumFractionDigits: format.decimals || 2
      }).format(numValue);
    
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: format.decimals || 2,
        maximumFractionDigits: format.decimals || 2
      }).format(numValue / 100);
    
    case 'date':
      const date = new Date(numValue);
      return date.toLocaleDateString();
    
    case 'time':
      const time = new Date(numValue);
      return time.toLocaleTimeString();
    
    default:
      return cell.value;
  }
}

export function getCellStyle(cell: CellData | undefined): React.CSSProperties {
  if (!cell?.format) return {};
  
  const format = cell.format;
  const style: React.CSSProperties = {};
  
  if (format.bold) style.fontWeight = 'bold';
  if (format.italic) style.fontStyle = 'italic';
  if (format.underline) style.textDecoration = 'underline';
  if (format.textColor) style.color = format.textColor;
  if (format.backgroundColor) style.backgroundColor = format.backgroundColor;
  if (format.fontFamily) style.fontFamily = format.fontFamily;
  if (format.fontSize) style.fontSize = `${format.fontSize}px`;
  if (format.horizontalAlign) style.textAlign = format.horizontalAlign;
  if (format.verticalAlign) {
    style.verticalAlign = format.verticalAlign;
    style.display = 'flex';
    style.alignItems = format.verticalAlign === 'top' ? 'flex-start' : 
                       format.verticalAlign === 'bottom' ? 'flex-end' : 'center';
  }
  
  return style;
}