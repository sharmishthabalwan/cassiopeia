#!/usr/bin/env python3
"""Cassiopeia — iCloud mirror export (Phase 6 stub).

Exports the app's data (from Supabase, once wired) to an ownable copy in
  ~/Library/Mobile Documents/com~apple~CloudDocs/Cassiopeia/
as both cassiopeia.xlsx (human-readable) and cassiopeia.sqlite (full fidelity).
Runs on a schedule, not on every write.

TODO(Phase 6): pull tables via supabase client -> write xlsx (openpyxl) + sqlite.
"""

def main() -> None:
    raise SystemExit("export_mirror not implemented — Phase 6 (see CONTRACTS.md).")

if __name__ == "__main__":
    main()
