#!/usr/bin/env python3
"""Keep the full Markdown profile's selected projects aligned with project data.

Astro renders both HTML views directly from projects/projects.json. The curated
CV remains independent. --check verifies the profile without rewriting it.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.loads((ROOT / 'projects/projects.json').read_text())
    projects = data['projects']
    ids = [p['id'] for p in projects + data['homepageHighlights']]
    if len(ids) != len(set(ids)):
        raise ValueError('Project ids must be unique')
    for project in projects:
        if project['group'] not in data['groups']:
            raise ValueError(f'Unknown project group: {project["group"]}')
    lookup = {p['id']: p for p in projects + data['homepageHighlights']}
    markdown = f'## Selected Projects\n\n{data["workNote"]} [More about my work](#experience)\n\n'
    for project_id in data['homepage']:
        project = lookup[project_id]
        markdown += f'### {project["name"]}\n\n**{project["type"]}**'
        if project.get('status'):
            markdown += f' · {project["status"]}'
        markdown += '\n\n' + project['summary'] + '\n\n'
        markdown += project.get('homepageNote', project['details'][-1]) + '\n\n'
        markdown += ' · '.join(f'[{link["label"]}]({link["url"]})' for link in project['links']) + '\n\n'
    markdown += f'[All projects](https://miguelcorderocollar.com/projects/)\n\nReview status checked {data["reviewedOn"]}.\n\n'
    path = ROOT / 'documents/Miguel-Cordero-Profile.md'
    original = path.read_text()
    before, rest = original.split('## Selected Projects', 1)
    _, after = rest.split('## Skills', 1)
    output = before + markdown + '## Skills' + after
    if output != original:
        if args.check:
            raise SystemExit('Run python3 scripts/build_projects.py to synchronize the full profile.')
        path.write_text(output)
        print('Updated documents/Miguel-Cordero-Profile.md')
    else:
        print('Project data and full profile are aligned.')

if __name__ == '__main__':
    main()
