import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "work" / "HallofFame.xlsx"
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "data.js"
NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def load_shared_strings(book):
    root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")) for item in root.findall("m:si", NAMESPACE)]


def read_sheet(book, shared_strings, sheet_number):
    root = ET.fromstring(book.read(f"xl/worksheets/sheet{sheet_number}.xml"))
    rows = []
    for row in root.findall(".//m:sheetData/m:row", NAMESPACE):
        values = {}
        for cell in row.findall("m:c", NAMESPACE):
            reference = cell.attrib.get("r", "")
            column = re.match(r"[A-Z]+", reference).group(0)
            value_node = cell.find("m:v", NAMESPACE)
            value = "" if value_node is None else value_node.text
            if cell.attrib.get("t") == "s" and value:
                value = shared_strings[int(value)]
            values[column] = value
        rows.append(values)
    return rows


def integer(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def leaders(rows, columns):
    result = []
    for row in rows[2:]:
        name = (row.get("D") or "").strip()
        if not name or name == "Total":
            continue
        values = [integer(row.get(column)) for column in columns]
        if sum(values):
            result.append({"name": name, "gold": values[0], "silver": values[1], "bronze": values[2]})
    return sorted(result, key=lambda item: (-item["gold"], -item["silver"], -item["bronze"], item["name"].lower()))


def leagues(rows, label_column, medal_columns):
    grouped = OrderedDict()
    current = ""
    for row in rows[1:]:
        label = (row.get(label_column) or "").strip()
        if label and label != "League":
            current = label
            grouped.setdefault(current, {"name": current, "gold": [], "silver": [], "bronze": []})
        if not current:
            continue
        record = grouped[current]
        for medal, column in zip(("gold", "silver", "bronze"), medal_columns):
            value = (row.get(column) or "").strip()
            if value:
                record[medal].append(value)
    return list(grouped.values())


def main():
    sheet_groups = {
        "baseball": (4, ["E", "F", "G"]),
        "basketball": (6, ["H", "I", "J"]),
        "soccer": (8, ["K", "L", "M"]),
        "football": (10, ["N", "O", "P"]),
        "hockey": (12, ["Q", "R", "S"]),
        "mma": (14, ["T", "U", "V"]),
        "racing": (16, ["W", "X", "Y"]),
        "wrestling": (18, ["Z", "AA", "AB"]),
        "other": (20, ["AC", "AD", "AE"]),
    }
    with zipfile.ZipFile(SOURCE) as book:
        shared_strings = load_shared_strings(book)
        overall_rows = read_sheet(book, shared_strings, 1)
        sports = [{
            "id": "overall",
            "name": "Overall",
            "leaders": leaders(overall_rows, ["A", "B", "C"]),
            "leagues": [],
        }]
        for sport_id, (sheet_number, leader_columns) in sheet_groups.items():
            sport_name = "MMA" if sport_id == "mma" else sport_id.title()
            rows = read_sheet(book, shared_strings, sheet_number)
            label_column = "Q" if sport_id == "other" else "P"
            medal_columns = ["R", "S", "T"] if sport_id == "other" else ["Q", "R", "S"]
            sports.append({
                "id": sport_id,
                "name": sport_name,
                "leaders": leaders(overall_rows, leader_columns),
                "leagues": leagues(rows, label_column, medal_columns),
            })
    payload = {
        "source": "HallofFame.xls",
        "forumUrl": "https://www.playstationtrophies.org/forum/topic/271058-pst-fantasy-sports-hall-of-fame/",
        "sports": sports,
    }
    OUTPUT.write_text("window.HOF_DATA = " + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
