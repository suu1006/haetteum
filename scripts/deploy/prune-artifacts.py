#!/usr/bin/env python3
"""Prune deployment-owned artifacts after successful activation, under deploy.lock."""
import pathlib
import re
import shutil
import sys


def prune(releases, shared, current, previous, *protected):
    releases = pathlib.Path(releases).resolve(strict=True)
    shared = pathlib.Path(shared).resolve(strict=True)
    marker = shared / 'previous-release'
    if current == previous and marker.is_file():
        previous = marker.read_text().strip()
    keep = set()
    for value in (current, previous, *protected):
        path = pathlib.Path(value)
        if path.is_symlink() or not re.fullmatch(r'[a-f0-9]{40}', path.name):
            raise ValueError('Invalid retained release')
        path = path.resolve(strict=True)
        if path.parent != releases or not path.is_dir():
            raise ValueError('Retained release must be directly inside releases')
        keep.add(path)
    # Record the previous release so retries of the same SHA do not remove it.
    marker.write_text(str(pathlib.Path(previous).resolve(strict=True)) + '\n')
    for path in releases.iterdir():
        if path.is_symlink() or not path.is_dir() or not re.fullmatch(r'[a-f0-9]{40}', path.name):
            continue
        if path not in keep:
            print(f'Removing old release: {path}', flush=True)
            shutil.rmtree(path)
            (shared / 'verified' / path.name).unlink(missing_ok=True)
    prune_backups(shared)


def prune_backups(shared):
    backups = shared / 'backups'
    if backups.is_dir():
        dumps = sorted((path for path in backups.iterdir()
                        if not path.is_symlink() and path.is_file()
                        and re.fullmatch(r'\d{8}T\d{6}Z-[a-f0-9]{40}\.dump', path.name)),
                       key=lambda path: path.name, reverse=True)
        for path in dumps[3:]:
            print(f'Removing old DB backup: {path}', flush=True)
            path.unlink()


if __name__ == '__main__':
    if sys.argv[1] == '--backups':
        prune_backups(pathlib.Path(sys.argv[2]))
    else:
        prune(*sys.argv[1:])
