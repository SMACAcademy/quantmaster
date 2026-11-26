/**
 * Reading and writing the spreadsheet files themselves: an .xlsx workbook, or a
 * folder with one .csv per sheet. Both give and take `{ SheetName: rows }`, the
 * shape scripts/lib/contentSheet.js works with.
 */

import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CHOICE_COLUMNS, SHEET_NAMES, TEXT_COLUMNS, guideRows } from './contentSheet.js';

const GUIDE = 'Guide';
/** Rows below the data that still get drop-downs, for new rows an author adds. */
const SPARE_ROWS = 500;

const sheetName = (name) => [...SHEET_NAMES, GUIDE].find((known) => known.toLowerCase() === String(name).trim().toLowerCase());

/* ---------------------------------- xlsx ---------------------------------- */

const columnLetter = (index) => {
  let letters = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
};

export async function writeWorkbook(path, sheets) {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of [...SHEET_NAMES.map((sheet) => [sheet, sheets[sheet]]), [GUIDE, guideRows()]]) {
    const worksheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    worksheet.addRows(rows);

    const header = rows[0];
    header.forEach((column, index) => {
      const longest = Math.max(...rows.map((row) => String(row[index] ?? '').split('\n').reduce((max, line) => Math.max(max, line.length), 0)));
      const sheetColumn = worksheet.getColumn(index + 1);
      sheetColumn.width = Math.min(60, Math.max(String(column).length + 2, 10, longest + 2));
      sheetColumn.alignment = { vertical: 'top', wrapText: true };
      if (TEXT_COLUMNS[name]?.includes(column)) sheetColumn.numFmt = '@';

      const choices = CHOICE_COLUMNS[name]?.[column];
      if (choices) {
        const letter = columnLetter(index);
        worksheet.dataValidations.add(`${letter}2:${letter}${rows.length + SPARE_ROWS}`, {
          type: 'list',
          allowBlank: true,
          formulae: [`"${choices.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Not in the list',
          error: `Use one of: ${choices.join(', ')}`
        });
      }
    });
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'top', wrapText: false };
  }
  await workbook.xlsx.writeFile(path);
}

/** What a cell holds, as the plain string, number, boolean, Date or null the importer expects. */
function cellValue(value, numFmt) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' && typeof numFmt === 'string' && numFmt.includes('%')) {
    // Typed as 25% in an ordinary cell: stored as 0.25 with a percent format.
    return `${Number((value * 100).toPrecision(12))}%`;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
    if ('formula' in value || 'sharedFormula' in value) return cellValue(value.result, numFmt);
    if ('text' in value) return cellValue(value.text, numFmt);
    if ('error' in value) return String(value.error);
    return String(value);
  }
  return value;
}

export async function readWorkbook(path) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheets = {};
  for (const worksheet of workbook.worksheets) {
    const name = sheetName(worksheet.name);
    if (!name || name === GUIDE) continue;
    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cells[columnNumber - 1] = cellValue(cell.value, cell.numFmt);
      });
      rows[rowNumber - 1] = Array.from(cells, (cell) => cell ?? null);
    });
    sheets[name] = Array.from(rows, (row) => row || []);
  }
  return sheets;
}

/* ----------------------------------- csv ----------------------------------- */

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const cell = typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : String(value);
  return /[",\r\n]/.test(cell) || cell !== cell.trim() ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

/** RFC 4180: quoted cells may hold commas, quotes ("") and line breaks. Empty cells come back as null. */
export function parseCsv(input) {
  const source = input.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let wasQuoted = false;
  const endCell = () => {
    row.push(cell === '' && !wasQuoted ? null : cell);
    cell = '';
    wasQuoted = false;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = false;
    } else if (char === '"') {
      quoted = true;
      wasQuoted = true;
    } else if (char === ',') {
      endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      endCell();
      rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell !== '' || wasQuoted || row.length) {
    endCell();
    rows.push(row);
  }
  return rows;
}

export function writeCsvFolder(dir, sheets) {
  mkdirSync(dir, { recursive: true });
  // The byte-order mark makes Excel read the file as UTF-8.
  for (const name of SHEET_NAMES) writeFileSync(join(dir, `${name}.csv`), `﻿${toCsv(sheets[name])}`);
  writeFileSync(join(dir, `${GUIDE}.csv`), `﻿${toCsv(guideRows())}`);
}

export function readCsvFolder(dir) {
  const sheets = {};
  for (const file of readdirSync(dir).filter((entry) => entry.toLowerCase().endsWith('.csv'))) {
    const name = sheetName(basename(file).slice(0, -4));
    if (!name || name === GUIDE) continue;
    sheets[name] = parseCsv(readFileSync(join(dir, file), 'utf8'));
  }
  return sheets;
}

export const isWorkbookPath = (path) => existsSync(path) && path.toLowerCase().endsWith('.xlsx');
