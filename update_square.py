#!/usr/bin/env python3
"""
update_square.py — Met à jour square-rates.json (taux marché parallèle),
ajoute un point d'historique, et pousse sur GitHub.

Usage :
    py update_square.py --eur 278/275 --usd 238/235 --gbp 314/310 --cad 171/169 --push
    # format par devise : ACHAT/VENTE

- Les devises omises gardent leur ancienne valeur.
- Un point daté est ajouté dans "history" (remplacé si la date existe déjà).
- L'historique est tronqué aux 90 derniers points par devise.
- --push fait git add/commit/push automatiquement.
"""
import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

JSON_PATH = Path(__file__).parent / "square-rates.json"
CODES = ["EUR", "USD", "GBP", "CAD"]
MAX_HISTORY = 90


def parse_pair(s):
    buy, sell = s.split("/")
    return float(buy), float(sell)


def main():
    ap = argparse.ArgumentParser()
    for c in CODES:
        ap.add_argument(f"--{c.lower()}", help="ACHAT/VENTE, ex 278/275")
    ap.add_argument("--push", action="store_true", help="git commit + push")
    args = ap.parse_args()

    data = json.loads(JSON_PATH.read_text(encoding="utf-8")) if JSON_PATH.exists() else {}
    data.setdefault("rates", {})
    data.setdefault("history", {})

    today = date.today().isoformat()
    changed = []
    for c in CODES:
        val = getattr(args, c.lower())
        if not val:
            continue
        buy, sell = parse_pair(val)
        data["rates"][c] = {"buy": buy, "sell": sell}

        # historique : remplace le point du jour s'il existe, sinon l'ajoute
        hist = data["history"].setdefault(c, [])
        hist = [p for p in hist if p.get("d") != today]
        hist.append({"d": today, "buy": buy, "sell": sell})
        hist.sort(key=lambda p: p["d"])
        data["history"][c] = hist[-MAX_HISTORY:]
        changed.append(f"{c} {buy}/{sell}")

    if not changed:
        print("Aucune devise fournie. Exemple :")
        print("  py update_square.py --eur 278/275 --usd 238/235 --push")
        sys.exit(1)

    data["updated"] = today
    data["source"] = "Saisie manuelle - marché parallèle Square Alger"
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {JSON_PATH.name} — {', '.join(changed)}  (date {today})")

    if args.push:
        try:
            for cmd in (["git", "add", JSON_PATH.name],
                        ["git", "commit", "-m", f"Taux Square {today}"],
                        ["git", "push"]):
                subprocess.run(cmd, cwd=JSON_PATH.parent, check=True)
            print("✓ Poussé sur GitHub.")
        except subprocess.CalledProcessError as e:
            print(f"⚠ Échec git ({e}). Poussez manuellement.")


if __name__ == "__main__":
    main()
