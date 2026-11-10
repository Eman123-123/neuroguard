"""PDF Clinical Report Generator for NeuroGuard.
Uses ReportLab to generate a clean, publication-grade medical report
summarizing cognitive screening, game telemetry, and ML risk stratification.
"""

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable


def generate_clinical_report_pdf(report_data: dict) -> io.BytesIO:
    """Generate a medical PDF report from patient and ML assessment data.
    
    Expected report_data keys:
      - patient_name (optional, default "Anonymous Patient")
      - age (int)
      - education_years (int)
      - family_history (str)
      - ad8_score (int)
      - card_match_metrics (dict: moves, time_sec, errors, error_rate)
      - risk_level (str: "Low Risk", "Moderate Risk", "High Risk")
      - risk_score (float: 0-100)
      - confidence (float)
      - class_probabilities (dict)
      - clinical_flags (list[str])
      - recommendation (str)
      - stage_advice (str)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e3a8a"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    bold_body = ParagraphStyle(
        "BoldBody",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("🛡️ <b>NEUROGUARD CLINICAL SCREENING REPORT</b>", title_style),
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d %b %Y, %I:%M %p')}<br/><b>Status:</b> Completed", body_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Paragraph("Multi-Stage Early Alzheimer's & Mild Cognitive Impairment (MCI) Screening Platform", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceBefore=4, spaceAfter=12))

    # 2. Patient Profile Table
    p_name = report_data.get("patient_name", "Anonymous Patient")
    age = report_data.get("age", "N/A")
    edu = report_data.get("education_years", "N/A")
    fam = str(report_data.get("family_history", "unknown")).capitalize()

    patient_info = [
        [
            Paragraph("<b>Subject:</b> " + str(p_name), body_style),
            Paragraph("<b>Age:</b> " + str(age) + " yrs", body_style),
            Paragraph("<b>Education:</b> " + str(edu) + " yrs", body_style),
            Paragraph("<b>Family History:</b> " + fam, body_style),
        ]
    ]
    p_table = Table(patient_info, colWidths=[150, 110, 130, 150])
    p_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(p_table)
    story.append(Spacer(1, 14))

    # 3. AI Risk Stratification Banner
    risk_level = report_data.get("risk_level", "Low Risk")
    risk_score = report_data.get("risk_score", 0.0)
    confidence = report_data.get("confidence", 0.0)

    # Risk badge color
    if "high" in risk_level.lower():
        badge_bg = colors.HexColor("#fef2f2")
        badge_border = colors.HexColor("#ef4444")
        text_color = "#b91c1c"
    elif "moderate" in risk_level.lower():
        badge_bg = colors.HexColor("#fffbeb")
        badge_border = colors.HexColor("#f59e0b")
        text_color = "#b45309"
    else:
        badge_bg = colors.HexColor("#f0fdf4")
        badge_border = colors.HexColor("#10b981")
        text_color = "#15803d"

    banner_p = Paragraph(
        f"<font size='13' color='{text_color}'><b>OVERALL STRATIFICATION: {risk_level.upper()}</b></font><br/>"
        f"<b>Cognitive Vulnerability Index:</b> {risk_score} / 100 &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Model Confidence:</b> {confidence * 100:.1f}%",
        body_style,
    )
    banner_table = Table([[banner_p]], colWidths=[540])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
        ("BOX", (0, 0), (-1, -1), 1.5, badge_border),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # 4. Multi-Stage Screening Biomarkers Table
    story.append(Paragraph("1. Screening Modality Biomarkers Evaluated", heading_style))

    ad8 = report_data.get("ad8_score", 0)
    card_m = report_data.get("card_match_metrics", {})
    moves = card_m.get("moves", "N/A")
    time_sec = card_m.get("time_sec", "N/A")
    errors = card_m.get("errors", 0)

    stroop = report_data.get("stroop_metrics", {})
    s_rt = stroop.get("avg_reaction_ms", 700.0)
    s_acc = stroop.get("accuracy", 90.0)
    s_cost = stroop.get("interference_ms", 160.0)
    s_flag = s_rt > 1000 or s_acc < 80
    s_status = "<font color='#b45309'>Inhibitory Delay</font>" if s_flag else "<font color='#15803d'>Normal Baseline</font>"

    biomarker_rows = [
        [
            Paragraph("<b>Modality / Assessment</b>", bold_body),
            Paragraph("<b>Observed Telemetry</b>", bold_body),
            Paragraph("<b>Clinical Benchmark</b>", bold_body),
            Paragraph("<b>Assessment Status</b>", bold_body),
        ],
        [
            Paragraph("AD8 Dementia Questionnaire", body_style),
            Paragraph(f"<b>{ad8} / 8 points</b>", body_style),
            Paragraph("&lt; 2 points (Normal)", body_style),
            Paragraph("<font color='#b45309'>Flagged</font>" if ad8 >= 2 else "<font color='#15803d'>Normal</font>", body_style),
        ],
        [
            Paragraph("Visuospatial Card Memory", body_style),
            Paragraph(f"{moves} moves in {time_sec}s ({errors} errors)", body_style),
            Paragraph("&lt; 22 moves, &lt; 55s", body_style),
            Paragraph("<font color='#b45309'>Elevated</font>" if (isinstance(moves, (int, float)) and moves > 25) else "<font color='#15803d'>Normal</font>", body_style),
        ],
        [
            Paragraph("Inhibitory Stroop Executive Test", body_style),
            Paragraph(f"Latency: {s_rt}ms (+{s_cost}ms) | {s_acc}% Acc", body_style),
            Paragraph("&lt; 850ms latency", body_style),
            Paragraph(s_status, body_style),
        ],
    ]

    mri = report_data.get("mri_result")
    if mri:
        mri_class = mri.get("predicted_class", "Evaluated")
        vbr = mri.get("ventricle_to_brain_ratio", "N/A")
        is_flag = mri.get("class_code", 0) > 0
        status_text = f"<font color='#b45309'>{mri_class}</font>" if is_flag else "<font color='#15803d'>Normal</font>"
        biomarker_rows.append([
            Paragraph("Brain MRI Neuroimaging", body_style),
            Paragraph(f"<b>{mri_class}</b> (VBR: {vbr})", body_style),
            Paragraph("Preserved cortex & VBR &lt; 3.5%", body_style),
            Paragraph(status_text, body_style),
        ])

    bm_table = Table(biomarker_rows, colWidths=[150, 160, 130, 100])
    bm_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(bm_table)
    story.append(Spacer(1, 14))

    # 5. Model Probability Breakdown
    story.append(Paragraph("2. Multi-Class Probability Distribution", heading_style))
    probs = report_data.get("class_probabilities", {})
    p_low = probs.get("Low Risk", 0.0) * 100
    p_mod = probs.get("Moderate Risk", 0.0) * 100
    p_high = probs.get("High Risk", 0.0) * 100

    prob_data = [
        [
            Paragraph("<b>Low Risk (Normal Cognition)</b>", body_style),
            Paragraph(f"<b>{p_low:.1f}%</b>", body_style),
            Paragraph("Within expected age-adjusted normative range", body_style),
        ],
        [
            Paragraph("<b>Moderate Risk (MCI Impairment)</b>", body_style),
            Paragraph(f"<b>{p_mod:.1f}%</b>", body_style),
            Paragraph("Subtle memory or executive function variance", body_style),
        ],
        [
            Paragraph("<b>High Risk (Probable Early Dementia)</b>", body_style),
            Paragraph(f"<b>{p_high:.1f}%</b>", body_style),
            Paragraph("Notable cognitive decline markers detected", body_style),
        ],
    ]
    prob_table = Table(prob_data, colWidths=[180, 70, 290])
    prob_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 14))

    # 6. Clinical Indicators / Warning Flags
    flags = report_data.get("clinical_flags", [])
    if flags:
        story.append(Paragraph("3. Clinical Warning Flags Detected", heading_style))
        for flag in flags:
            story.append(Paragraph(f"• &nbsp; <font color='#b45309'>{flag}</font>", body_style))
        story.append(Spacer(1, 10))

    # 7. Recommendations & Physician Next Steps
    story.append(Paragraph("4. Recommended Clinical Action Plan", heading_style))
    stage_advice = report_data.get("stage_advice", "Routine evaluation")
    rec_text = report_data.get("recommendation", "Continue regular checkups.")
    
    rec_content = [
        [Paragraph(f"<b>Next Step:</b> {stage_advice}", bold_body)],
        [Paragraph(rec_text, body_style)],
    ]
    rec_table = Table(rec_content, colWidths=[540])
    rec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 16))

    # 8. Disclaimer & Sign-off footer
    disclaimer = (
        "<b>CLINICAL DISCLAIMER:</b> NeuroGuard is an investigational multi-stage screening and decision-support "
        "tool. This report does not establish a definitive medical diagnosis of Alzheimer's Disease or other "
        "neurodegenerative dementias. Neuropsychological evaluation (MoCA/MMSE) and clinical neuroimaging (MRI) "
        "by a licensed physician or neurologist are strictly required."
    )
    story.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=body_style, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b"))))
    story.append(Spacer(1, 16))

    signoff_data = [
        [
            Paragraph("<b>Screening Software:</b> NeuroGuard AI v1.0", body_style),
            Paragraph("<b>Clinician / Reviewer Signature:</b> _______________________", body_style),
        ]
    ]
    sign_table = Table(signoff_data, colWidths=[270, 270])
    story.append(sign_table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
