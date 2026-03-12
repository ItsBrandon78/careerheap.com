from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pdfplumber


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("\n", " ")).strip()


def normalize_name(value: str) -> str:
    value = clean(value)
    value = re.sub(r"\s+UNDER REVIEW$", "", value, flags=re.IGNORECASE)
    return value.strip()


def parse_pdf(pdf_path: Path) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            table = page.extract_table() or []
            for row in table[3:]:
                if not row or len(row) < 11:
                    continue

                trade_code = clean(row[1])
                if not re.match(r"^\d{3}[A-Z]$", trade_code):
                    continue

                on_the_job = clean(row[6])
                in_school = clean(row[7])
                total = clean(row[10])

                records.append(
                    {
                        "trade_name": normalize_name(clean(row[0])),
                        "trade_code": trade_code,
                        "certifying_exam": clean(row[2]),
                        "classification": clean(row[3]),
                        "red_seal_in_on": clean(row[4]),
                        "academic_standard": clean(row[5]),
                        "on_the_job_hours": int(on_the_job) if on_the_job.isdigit() else None,
                        "in_school_hours": int(in_school) if in_school.isdigit() else None,
                        "total_hours": int(total) if total.isdigit() else None,
                        "province": "ON",
                        "source_name": "Ontario Apprenticeship Programs Quick Facts Chart",
                        "source_version": "February 2026",
                    }
                )

    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, help="Path to the Ontario quick-facts PDF")
    parser.add_argument(
        "--out",
        default="data/ontario-trade-quick-facts-2026.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    records = parse_pdf(pdf_path)
    out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"wrote {len(records)} rows to {out_path}")


if __name__ == "__main__":
    main()
