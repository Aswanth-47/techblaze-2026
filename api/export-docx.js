import { neon } from '@neondatabase/serverless';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
} from 'docx';

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

  if (!await verifyToken(token)) return res.status(401).json({ error: 'unauthorized' });

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM registrations ORDER BY id ASC`;
  const statsRes = await sql`
    SELECT COUNT(*) as total_teams, COALESCE(SUM(team_size),0) as total_members,
      COUNT(*) FILTER (WHERE p1_food='Vegetarian' OR p2_food='Vegetarian' OR p3_food='Vegetarian' OR p4_food='Vegetarian') as veg,
      COUNT(*) FILTER (WHERE p1_food='Non-Vegetarian' OR p2_food='Non-Vegetarian' OR p3_food='Non-Vegetarian' OR p4_food='Non-Vegetarian') as nonveg
    FROM registrations
  `;
  const stats = statsRes[0];

  const PURPLE = '6C63FF', HEADER_BG = '2C2A4A', ALT_ROW = 'F9F8FF';
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  const hdrBorder = {
    top: { style: BorderStyle.SINGLE, size: 2, color: '6C63FF' },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: '6C63FF' },
    left: thinBorder, right: thinBorder
  };

  function cell(text, opts = {}) {
    return new TableCell({
      borders: opts.isHeader ? hdrBorder : borders,
      width: { size: opts.width || 1800, type: WidthType.DXA },
      shading: { fill: opts.fill || 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({
          text: String(text ?? '—'), bold: opts.bold || false,
          size: opts.size || 18, color: opts.color || '000000', font: 'Arial'
        })]
      })]
    });
  }

  const memberCols = n => [
    [`P${n} Name`, `p${n}`, 2000], [`P${n} Phone`, `p${n}_phone`, 1600],
    [`P${n} Email`, `p${n}_email`, 2400], [`P${n} Food`, `p${n}_food`, 1400],
  ];
  const allCols = [
    ['Ref ID', 'ref_id', 1400], ['Team Name', 'team', 2000],
    ['College', 'college', 2200], ['Size', 'team_size', 800],
    ...memberCols(1), ...memberCols(2), ...memberCols(3), ...memberCols(4),
    ['Medical Notes', 'medical', 2200], ['Registered At', 'created_at', 1800],
  ];

  const colWidths = allCols.map(c => c[2]);

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 500, rule: 'atLeast' },
    children: allCols.map(([label,, w]) =>
      cell(label, { isHeader: true, fill: HEADER_BG, bold: true, color: 'FFFFFF', width: w, center: true, size: 16 })
    )
  });

  const dataRows = rows.map((reg, i) => {
    const bg = i % 2 === 0 ? 'FFFFFF' : ALT_ROW;
    return new TableRow({
      height: { value: 400, rule: 'atLeast' },
      children: allCols.map(([, field, w]) => {
        let color = '222222', bold = false;
        if (field === 'ref_id') { color = PURPLE; bold = true; }
        const val = String(reg[field] || '').toLowerCase();
        if (field.endsWith('_food')) {
          if (val === 'vegetarian') color = '27AE60';
          else if (val === 'non-vegetarian') color = 'E67E22';
        }
        let display = reg[field] ?? '';
        if (field === 'created_at' && display) display = new Date(display).toLocaleString('en-IN');
        return cell(display, { fill: bg, width: w, color, bold, size: 17 });
      })
    });
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 24480, height: 15840 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({ text: '⚡ Tech Blaze 3.0', bold: true, size: 40, color: PURPLE, font: 'Arial' }),
            new TextRun({ text: '  —  Participant Registrations', bold: true, size: 36, color: '333333', font: 'Arial' }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 300 },
          children: [new TextRun({
            text: `Teams: ${stats.total_teams}   |   Participants: ${stats.total_members}   |   Vegetarian: ${stats.veg}   |   Non-Vegetarian: ${stats.nonveg}   |   Exported: ${new Date().toLocaleString('en-IN')}`,
            size: 20, color: '555555', font: 'Arial'
          })]
        }),
        new Table({
          width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          columnWidths: colWidths,
          rows: [headerRow, ...dataRows]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 0 },
          children: [new TextRun({ text: 'Department of Computer Engineering  •  Tech Blaze 3.0  •  Confidential', size: 16, color: '999999', font: 'Arial' })]
        }),
      ]
    }]
  });

  const buf = await Packer.toBuffer(doc);
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="techblaze3_${now}.docx"`);
  res.send(buf);
}
