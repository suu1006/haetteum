import pathlib, sys, tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    members = archive.getmembers()
    symlinks = {str(pathlib.PurePosixPath(m.name)) for m in members if m.issym()}
    total = 0
    seen = set()
    for member in members:
        p = pathlib.PurePosixPath(member.name)
        if p.is_absolute() or '..' in p.parts or member.name in seen:
            raise SystemExit('Unsafe or duplicate archive path')
        if any(str(parent) in symlinks for parent in p.parents):
            raise SystemExit('Archive entry descends through symlink')
        seen.add(member.name)
        if any(part.startswith('.env') for part in p.parts):
            raise SystemExit('Environment file in artifact')
        if not (member.isfile() or member.isdir() or member.issym()):
            raise SystemExit('Unsupported archive entry')
        if member.issym():
            target = pathlib.PurePosixPath(member.linkname)
            if target.is_absolute(): raise SystemExit('Absolute symlink in artifact')
            depth = len(p.parent.parts)
            for part in target.parts:
                depth += -1 if part == '..' else (0 if part == '.' else 1)
                if depth < 0: raise SystemExit('Escaping symlink in artifact')
        total += member.size
    print(total)
