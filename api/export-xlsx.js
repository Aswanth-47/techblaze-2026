import { neon } from '@neondatabase/serverless';
import ExcelJS from 'exceljs';

// Note: This runs as a Node.js serverless function (not edge) due to ExcelJS
export default async function handler(req, res) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  
  async function verifyToken(tok) {
    if (!tok) return false;
    try {
      const [payloadB64, sigB64] = tok.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      if (!payload.admin || Date.now() > payload.exp) return false;
      const { createHmac } = await import('crypto');
      const secret = process.env.JWT_SECRET || 'tb3secret';
      const expected = createHmac('sha256', secret).update(payloadB64).digest('base64');
      return sigB64 === expected;
    } catch { return false; }
  }

  if (!await verifyToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM registrations ORDER BY id ASC`;
  const statsRes = await sql`
    SELECT
      COUNT(*) as total_teams,
      COALESCE(SUM(team_size),0) as total_members,
      COUNT(*) FILTER (WHERE p1_food='Vegetarian' OR p2_food='Vegetarian' OR p3_food='Vegetarian' OR p4_food='Vegetarian') as veg,
      COUNT(*) FILTER (WHERE p1_food='Non-Vegetarian' OR p2_food='Non-Vegetarian' OR p3_food='Non-Vegetarian' OR p4_food='Non-Vegetarian') as nonveg
    FROM registrations
  `;
  const stats = statsRes[0];

  const PURPLE = 'FF6C63FF';
  const HEADER_BG = 'FF2C2A4A';
  const WHITE = 'FFFFFFFF';
  const PURPLE_LIGHT = 'FFEEF0FF';
  const GREEN = 'FF27AE60';
  const ORANGE = 'FFE67E22';
  const ALT_ROW = 'FFF9F8FF';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tech Blaze 3.0';
  wb.created = new Date();

  const ws = wb.addWorksheet('Registrations');

  // Title
  ws.mergeCells('A1:V1');
  const titleCell = ws.getCell('A1');
  titleCell.value = '⚡ Tech Blaze 3.0 — Participant Registrations';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  ws.mergeCells('A2:V2');
  const subCell = ws.getCell('A2');
  subCell.value = `Exported: ${new Date().toLocaleString('en-IN')}   |   Total Teams: ${stats.total_teams}   |   Total Participants: ${stats.total_members}   |   Veg: ${stats.veg}   |   Non-Veg: ${stats.nonveg}`;
  subCell.font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE_LIGHT } };
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 8;

  const headers = ['Ref ID','Team Name','College','Size','P1 Name','P1 Phone','P1 Email','P1 Food','P2 Name','P2 Phone','P2 Email','P2 Food','P3 Name','P3 Phone','P3 Email','P3 Food','P4 Name','P4 Phone','P4 Email','P4 Food','Medical Notes','Registered At'];
  const colWidths = [12,18,22,6,18,14,26,14,18,14,26,14,18,14,26,14,18,14,26,14,28,20];

  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin', color: { argb: 'FF444466' } }, bottom: { style: 'thin', color: { argb: 'FF444466' } }, left: { style: 'thin', color: { argb: 'FF444466' } }, right: { style: 'thin', color: { argb: 'FF444466' } } };
    ws.getColumn(colNumber).width = colWidths[colNumber - 1];
  });

  const foodCols = [8, 12, 16, 20];

  rows.forEach((reg, idx) => {
    const bg = idx % 2 === 0 ? WHITE : ALT_ROW;
    const values = [
      reg.ref_id||'', reg.team||'', reg.college||'', reg.team_size||'',
      reg.p1||'', reg.p1_phone||'', reg.p1_email||'', reg.p1_food||'',
      reg.p2||'', reg.p2_phone||'', reg.p2_email||'', reg.p2_food||'',
      reg.p3||'', reg.p3_phone||'', reg.p3_email||'', reg.p3_food||'',
      reg.p4||'', reg.p4_phone||'', reg.p4_email||'', reg.p4_food||'',
      reg.medical||'', reg.created_at ? new Date(reg.created_at).toLocaleString('en-IN') : ''
    ];
    const row = ws.addRow(values);
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { vertical: 'middle', wrapText: [7,11,15,19,21].includes(colNumber) };
      cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
      if (colNumber === 1) cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PURPLE } };
      if (foodCols.includes(colNumber)) {
        const val = String(cell.value).toLowerCase();
        if (val === 'vegetarian') cell.font = { name: 'Arial', size: 10, color: { argb: GREEN } };
        else if (val === 'non-vegetarian') cell.font = { name: 'Arial', size: 10, color: { argb: ORANGE } };
      }
    });
  });

  // Summary sheet
  const ws2 = wb.addWorksheet('Summary');
  ws2.getColumn('A').width = 30;
  ws2.getColumn('B').width = 20;
  ws2.mergeCells('A1:B1');
  const stTitle = ws2.getCell('A1');
  stTitle.value = 'Tech Blaze 3.0 — Summary';
  stTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
  stTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
  stTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 32;

  const summaryData = [
    ['Total Teams Registered', stats.total_teams],
    ['Total Participants', stats.total_members],
    ['Vegetarian', stats.veg],
    ['Non-Vegetarian', stats.nonveg],
    ['Exported At', new Date().toLocaleString('en-IN')],
  ];
  summaryData.forEach(([label, val], i) => {
    const r = ws2.addRow([label, val]);
    r.height = 22;
    const bg = i % 2 === 0 ? PURPLE_LIGHT : WHITE;
    r.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
      cell.alignment = { vertical: 'middle' };
    });
    r.getCell(1).font = { name: 'Arial', size: 11, bold: true };
    r.getCell(2).font = { name: 'Arial', size: 11 };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="techblaze3_${now}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
