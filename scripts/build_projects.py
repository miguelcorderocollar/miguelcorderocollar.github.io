#!/usr/bin/env python3
"""Render shared project data into the static homepage, collection and CV.

Run after editing projects/projects.json. --check verifies generated content.
"""
import argparse
import json
from datetime import date
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START, END = '<!-- PROJECTS:START -->', '<!-- PROJECTS:END -->'


def links(project):
    return '<div class="project-links">' + ''.join(
        f'<a href="{escape(link["url"], quote=True)}">{escape(link["label"])}'
        '<span aria-hidden="true">↗</span></a>'
        for link in project['links']
    ) + '</div>' if project['links'] else ''


def status(project):
    return f'<span class="project-status">{escape(project["status"])}</span>' if project.get('status') else ''


def selected(project):
    destination = project.get('collectionUrl', f'projects/#{project["id"]}')
    meta = status(project) or f'<span class="project-summary-type">{escape(project["type"])}</span>'
    return f'''<details class="selected-project">
  <summary><span class="title-container"><span>{escape(project['name'])}</span><span class="project-summary-meta">{meta}</span></span></summary>
  <div class="selected-project-content">
    <p class="project-kind">{escape(project['type'])}</p>
    <p class="project-description">{escape(project['summary'])}</p>
    <p class="project-selected-note">{escape(project.get('homepageNote', project['details'][-1]))}</p>
    {links(project)}
    <a class="project-more" href="{escape(destination, quote=True)}">More about this work <span aria-hidden="true">↗</span></a>
  </div>
</details>'''


def row(project):
    tags = ''.join(f'<span>{escape(tag)}</span>' for tag in project['tags'])
    paragraphs = ''.join(f'<p>{escape(paragraph)}</p>' for paragraph in project['details'])
    return f'''<article class="project-row" id="{project['id']}" data-project-group="{project['group']}" aria-labelledby="{project['id']}-title">
  <img class="project-visual" src="../{escape(project['image'], quote=True)}" width="320" height="320" alt="" loading="lazy" decoding="async" />
  <div>
    <p class="project-kind">{escape(project['type'])}</p>
    <h2 id="{project['id']}-title"><a href="#{project['id']}">{escape(project['name'])}</a></h2>
    <p class="project-description">{escape(project['summary'])}</p>
    {links(project)}
    <details class="project-detail"><summary>Project notes<span class="project-sr-only"> for {escape(project['name'])}</span></summary>{paragraphs}</details>
  </div>
  <aside class="project-aside" aria-label="Project information">
    {status(project)}
    <div class="project-tags">{tags}</div>
  </aside>
</article>'''


def replace_block(text, body):
    before, rest = text.split(START, 1)
    _, after = rest.split(END, 1)
    body = '\n'.join(line.rstrip() for line in body.splitlines())
    return before + START + '\n' + body + '\n      ' + END + after


def render():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.loads((ROOT / 'projects/projects.json').read_text())
    projects = data['projects']
    ids = [project['id'] for project in projects]
    if len(ids) != len(set(ids)):
        raise ValueError('Project ids must be unique')
    for project in projects:
        if project['group'] not in data['groups']:
            raise ValueError(f'Unknown project group: {project["group"]}')
    lookup = {project['id']: project for project in projects + data['homepageHighlights']}
    featured = [lookup[project_id] for project_id in data['homepage']]

    home_body = f'<p class="project-work-note">{escape(data["workNote"])} <a href="#experience">More about my work <span aria-hidden="true">↗</span></a></p>\n'
    home_body += '\n'.join(selected(project) for project in featured)
    home_body += '\n<div class="projects-browse"><a class="action-link" href="projects/">All projects <span aria-hidden="true">↗</span></a><span>Apps, tools & open source</span></div>'

    filters = [('all', 'All'), *data['groups'].items()]
    collection = f'<aside class="projects-work"><h2>Prototypes & internal tools</h2><p>{escape(data["workNote"])} <a href="../#experience">More about my work <span aria-hidden="true">↗</span></a></p></aside>\n'
    collection += '<div class="project-filters" role="group" aria-label="Filter projects" hidden>\n'
    for group, label in filters:
        count = len(projects) if group == 'all' else sum(project['group'] == group for project in projects)
        collection += f'<button class="project-filter" type="button" data-project-filter="{group}" data-label="{escape(label, quote=True)}" aria-pressed="{str(group == "all").lower()}" aria-controls="project-list">{escape(label)} <span>{count}</span></button>\n'
    collection += '</div>\n<div class="projects-result-line"><p id="project-results" role="status" aria-live="polite" aria-atomic="true">'
    reviewed = date.fromisoformat(data['reviewedOn']).strftime('%d %b %Y')
    collection += f'{len(projects)} projects</p><p>Review status checked {reviewed}</p></div>\n'
    collection += '<div id="project-list">\n' + '\n'.join(row(project) for project in projects) + '\n</div>'


    markdown = f'## Selected Projects\n\n{data["workNote"]} [More about my work](#experience)\n\n'
    for project in featured:
        markdown += f'### {project["name"]}\n\n**{project["type"]}**'
        if project.get('status'):
            markdown += f' · {project["status"]}'
        markdown += '\n\n' + project['summary'] + '\n\n'
        markdown += project.get('homepageNote', project['details'][-1]) + '\n\n'
        markdown += ' · '.join(f'[{link["label"]}]({link["url"]})' for link in project['links']) + '\n\n'
    markdown += f'[All projects](https://miguelcorderocollar.github.io/projects/)\n\nReview status checked {data["reviewedOn"]}.\n\n'

    home = ROOT / 'index.html'
    page = ROOT / 'projects/index.html'
    cv = ROOT / 'documents/Miguel-Cordero-CV.md'
    cv_before, cv_rest = cv.read_text().split('## Selected Projects', 1)
    _, cv_after = cv_rest.split('## Skills', 1)
    outputs = {
        home: replace_block(home.read_text(), home_body),
        page: replace_block(page.read_text(), collection),
        cv: cv_before + markdown + '## Skills' + cv_after,
    }
    stale = []
    for path, content in outputs.items():
        if path.read_text() == content:
            continue
        if args.check:
            stale.append(str(path.relative_to(ROOT)))
        else:
            path.write_text(content)
            print(f'Updated {path.relative_to(ROOT)}')
    if stale:
        raise SystemExit('Run python3 scripts/build_projects.py to update: ' + ', '.join(stale))


if __name__ == '__main__':
    render()
