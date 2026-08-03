import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';

export type ExcelColumnType = 'text' | 'integer' | 'decimal' | 'date' | 'idText';
export type ExcelColumnAlign = 'left' | 'center' | 'right';

/**
 * Describes one column of an {@link ExcelReportService} report. New columns are added by pushing
 * a new entry onto the caller's column list — nothing in this service needs to change.
 */
export interface ExcelColumnDef<T> {
  header: string;
  type: ExcelColumnType;
  /** Defaults to 'right' for `text` (Arabic-first) and 'center' for every other type. */
  align?: ExcelColumnAlign;
  /** Extracts this column's raw value from a data row; `null`/`undefined` renders an empty cell. */
  value: (row: T) => string | number | Date | null | undefined;
  /** Applies a red -> yellow -> green color scale across this column's data cells (e.g. scores/grades). */
  colorScale?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

export interface ExcelReportOptions<T> {
  filename: string;
  sheetName: string;
  title: string;
  /** Rendered as one row each, directly under the title (export date, total count, applied filters, ...). */
  subtitleLines: string[];
  columns: ExcelColumnDef<T>[];
  rows: T[];
}

const HEADER_FILL_ARGB = 'FF1F4E78';
const HEADER_FONT_ARGB = 'FFFFFFFF';
const TITLE_FONT_ARGB = 'FF1F4E78';
const ZEBRA_FILL_ARGB = 'FFF2F2F2';
const BORDER_ARGB = 'FFB7B7B7';

const THIN_BORDER: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: BORDER_ARGB } };
const ALL_THIN_BORDERS: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  left: THIN_BORDER,
  bottom: THIN_BORDER,
  right: THIN_BORDER,
};
const COLOR_SCALE_STOPS: Partial<ExcelJS.Color>[] = [
  { argb: 'FFF8696B' }, // red (low)
  { argb: 'FFFFEB84' }, // yellow (mid)
  { argb: 'FF63BE7B' }, // green (high)
];

const NUMBER_FORMATS: Record<ExcelColumnType, string | undefined> = {
  text: undefined,
  idText: '@',
  integer: '0',
  decimal: '0.00',
  date: 'yyyy-mm-dd',
};

/**
 * Builds a styled, RTL-aware `.xlsx` report from a column/row description and triggers its
 * download — the generic engine behind the app's Excel exports. Domain features supply the data
 * mapping (see `ParticipantExcelExportService`); this service only knows about columns and rows.
 */
@Injectable({ providedIn: 'root' })
export class ExcelReportService {
  async generate<T>(options: ExcelReportOptions<T>): Promise<void> {
    const { columns, rows } = options;
    const columnCount = columns.length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Qaryati';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(options.sheetName, {
      views: [{ rightToLeft: true, showGridLines: false, state: 'normal' }],
    });

    let rowCursor = this.writeTitleBlock(worksheet, options.title, options.subtitleLines, columnCount);
    const headerRowNumber = rowCursor + 1;
    this.writeHeaderRow(worksheet, columns, headerRowNumber);
    rowCursor = headerRowNumber;

    const maxLengths = columns.map((c) => c.header.length);
    rows.forEach((row, rowIndex) => {
      const values = columns.map((c) => this.toCellValue(c.type, c.value(row)));
      const excelRow = worksheet.addRow(values);
      this.styleDataRow(excelRow, columns, rowIndex, maxLengths);
    });
    const lastDataRowNumber = headerRowNumber + rows.length;

    this.applyColumnWidths(worksheet, columns, maxLengths);
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: columnCount },
    };
    worksheet.views = [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: headerRowNumber }];

    if (rows.length > 0) {
      this.applyColorScales(worksheet, columns, headerRowNumber + 1, lastDataRowNumber);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadBuffer(buffer, options.filename);
  }

  /** Writes the title + subtitle lines starting at row 1; returns the last row number used. */
  private writeTitleBlock(
    worksheet: ExcelJS.Worksheet,
    title: string,
    subtitleLines: string[],
    columnCount: number
  ): number {
    const titleRow = worksheet.addRow([title]);
    titleRow.height = 30;
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 18, color: { argb: TITLE_FONT_ARGB } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (const line of subtitleLines) {
      const row = worksheet.addRow([line]);
      worksheet.mergeCells(row.number, 1, row.number, columnCount);
      const cell = row.getCell(1);
      cell.font = { size: 11, italic: true, color: { argb: 'FF555555' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    worksheet.addRow([]);
    return worksheet.lastRow!.number;
  }

  private writeHeaderRow<T>(worksheet: ExcelJS.Worksheet, columns: ExcelColumnDef<T>[], rowNumber: number): void {
    const headerRow = worksheet.getRow(rowNumber);
    headerRow.values = columns.map((c) => c.header);
    headerRow.height = 26;
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, color: { argb: HEADER_FONT_ARGB }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = ALL_THIN_BORDERS;
    });
  }

  private styleDataRow<T>(
    row: ExcelJS.Row,
    columns: ExcelColumnDef<T>[],
    rowIndex: number,
    maxLengths: number[]
  ): void {
    const zebra = rowIndex % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const column = columns[colNumber - 1];
      const numFmt = NUMBER_FORMATS[column.type];
      if (numFmt) {
        cell.numFmt = numFmt;
      }
      cell.alignment = {
        horizontal: column.align ?? (column.type === 'text' ? 'right' : 'center'),
        vertical: 'middle',
        wrapText: column.type === 'text',
      };
      cell.border = ALL_THIN_BORDERS;
      if (zebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL_ARGB } };
      }

      const displayLength = this.displayLength(column.type, cell.value);
      if (displayLength > maxLengths[colNumber - 1]) {
        maxLengths[colNumber - 1] = displayLength;
      }
    });
  }

  private toCellValue(type: ExcelColumnType, raw: string | number | Date | null | undefined): ExcelJS.CellValue {
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    switch (type) {
      case 'integer':
      case 'decimal': {
        const num = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(num) ? num : null;
      }
      case 'date': {
        const date = raw instanceof Date ? raw : new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      case 'idText':
      case 'text':
      default:
        return String(raw);
    }
  }

  private displayLength(type: ExcelColumnType, value: ExcelJS.CellValue): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (type === 'date' && value instanceof Date) {
      return 10;
    }
    if (type === 'decimal' && typeof value === 'number') {
      return value.toFixed(2).length;
    }
    return String(value).length;
  }

  private applyColumnWidths<T>(
    worksheet: ExcelJS.Worksheet,
    columns: ExcelColumnDef<T>[],
    maxLengths: number[]
  ): void {
    columns.forEach((column, index) => {
      const min = column.minWidth ?? 10;
      const max = column.maxWidth ?? 40;
      const width = Math.min(Math.max(maxLengths[index] + 3, min), max);
      worksheet.getColumn(index + 1).width = width;
    });
  }

  private applyColorScales<T>(
    worksheet: ExcelJS.Worksheet,
    columns: ExcelColumnDef<T>[],
    firstDataRow: number,
    lastDataRow: number
  ): void {
    columns.forEach((column, index) => {
      if (!column.colorScale) {
        return;
      }
      const letter = this.columnLetter(index + 1);
      worksheet.addConditionalFormatting({
        ref: `${letter}${firstDataRow}:${letter}${lastDataRow}`,
        rules: [
          {
            type: 'colorScale',
            priority: 1,
            cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }],
            color: COLOR_SCALE_STOPS,
          },
        ],
      });
    });
  }

  private columnLetter(index: number): string {
    let n = index;
    let letters = '';
    while (n > 0) {
      const remainder = (n - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  private downloadBuffer(buffer: BlobPart, filename: string): void {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
