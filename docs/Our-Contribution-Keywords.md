# Our Contribution (Keywords)

**My / Our work included:**

1. **Shieldy (KAN-39) & risk visualization.** Pixel-art risk indicator (calm / suspicious / alert / danger), state mapping to risk levels, layout and scaling in web and extension, critical-level styling, animations.

2. **LLM integration for text analysis.** Hybrid mode (rule 25% + Qwen LLM 75%), skill prompt design, optional full-LLM mode and fallback to rule-based when API unavailable; wiring to `/analyze-text` and frontend.

3. **Combined text + URL analysis.** Backend `POST /analyze-page` returning separate text and URL scores; web “Analyze together” flow; single combined report with Shieldy and dual score blocks.

4. **Chrome extension: proactive detection.** Enable switch, storage persistence, tab navigation listener, auto combined analysis (URL + page text), debounce/dedupe; redirect to warning page when text ≥67, URL >25, or total >75; warning page UI and “Go back.”

5. **Extension UX.** One “Analyze current page” button, combined report in popup with Shieldy; extension shows risk level and explanations only (no numeric scores in popup).

6. **URL risk level thresholds.** URL-specific bands: low ≤15, medium 15–25, high 25–50, critical ≥50; `buildUrlAnalysisResult` and integration in URL analyzer.

7. **Web frontend simplification.** Removed Text/URL tabs and single “Analyze”; only “Analyze together” with text + URL inputs; Shieldy and overall risk in combined result area.

8. **Documentation & demo.** Merged README with all plans (Shieldy, LLM, frontend output, extension); demo script and example inputs (low/high text, suspicious URL, combined risk) for presentation.

9. **Shared UI & robustness.** Shared risk tokens (e.g. critical colour), mock/fallback responses, copy-shared for extension assets; fix for web script parse error (quote typo).

---

**Keywords (for CV / report):**  
Shieldy, risk visualization, LLM (Qwen-Plus), hybrid scoring, combined analysis, Chrome extension, proactive detection, redirect/warning page, URL risk bands, demo script, documentation.
