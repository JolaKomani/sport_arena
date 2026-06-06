"""Export list data as CSV, Excel (xlsx), JSON, or PDF."""

import csv
import json
from io import BytesIO, StringIO

from django.http import HttpResponse


SUPPORTED_FORMATS = ('csv', 'json', 'xlsx', 'pdf')


def normalize_format(raw):
    fmt = (raw or 'csv').lower().strip()
    if fmt in ('excel', 'xls'):
        return 'xlsx'
    if fmt not in SUPPORTED_FORMATS:
        return None
    return fmt


def _format_header_label(key):
    return str(key).replace('_', ' ').title()


def _cell_str(value, max_len=100):
    if value is None:
        return ''
    text = str(value)
    if len(text) > max_len:
        return text[: max_len - 3] + '...'
    return text


def _build_pdf_bytes(filename_base, headers, rows, title=None):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise ImportError('PDF export requires reportlab.') from exc

    buffer = BytesIO()
    pagesize = landscape(A4) if len(headers) > 5 else A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=0.45 * inch,
        rightMargin=0.45 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ExportTitle',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=10,
        textColor=colors.HexColor('#0f172a'),
    )
    cell_style = ParagraphStyle(
        'ExportCell',
        parent=styles['Normal'],
        fontSize=7,
        leading=8,
    )
    header_style = ParagraphStyle(
        'ExportHeader',
        parent=styles['Normal'],
        fontSize=8,
        leading=9,
        textColor=colors.white,
        fontName='Helvetica-Bold',
    )

    display_title = title or filename_base.replace('_', ' ').title()
    elements = [Paragraph(display_title, title_style), Spacer(1, 8)]

    table_data = [
        [Paragraph(_format_header_label(h), header_style) for h in headers]
    ]
    for row in rows:
        table_data.append(
            [Paragraph(_cell_str(row.get(h, '')), cell_style) for h in headers]
        )

    if len(table_data) == 1:
        table_data.append(
            [Paragraph('', cell_style) for _ in headers]
        )

    col_count = max(len(headers), 1)
    available_width = doc.width
    col_width = available_width / col_count

    table = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0e7490')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#cbd5e1')),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 1), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def build_export_response(filename_base, fmt, headers, rows, title=None):
    """Return HttpResponse with attachment for the given rows (list of dicts)."""
    fmt = normalize_format(fmt)
    if not fmt:
        return HttpResponse(
            'Invalid format. Use csv, xlsx, json, or pdf.',
            status=400,
        )

    safe_name = filename_base.replace(' ', '_')

    if fmt == 'json':
        payload = json.dumps(rows, indent=2, default=str)
        response = HttpResponse(payload, content_type='application/json; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{safe_name}.json"'
        return response

    if fmt == 'csv':
        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({h: row.get(h, '') for h in headers})
        response = HttpResponse(buffer.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{safe_name}.csv"'
        return response

    if fmt == 'xlsx':
        try:
            from openpyxl import Workbook
        except ImportError:
            return HttpResponse('Excel export requires openpyxl.', status=500)

        wb = Workbook()
        ws = wb.active
        ws.title = safe_name[:31]
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h, '') for h in headers])

        out = BytesIO()
        wb.save(out)
        out.seek(0)
        response = HttpResponse(
            out.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{safe_name}.xlsx"'
        return response

    # pdf
    try:
        pdf_bytes = _build_pdf_bytes(safe_name, headers, rows, title=title)
    except ImportError:
        return HttpResponse('PDF export requires reportlab.', status=500)

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{safe_name}.pdf"'
    return response
