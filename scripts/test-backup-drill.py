#!/usr/bin/env python3
"""Exercise export/checksums/roles/ACL restore against a brand-new local synthetic database only."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    for tool in ['node', 'initdb', 'pg_ctl', 'psql', 'pg_dump', 'pg_dumpall', 'pg_restore']:
        if not shutil.which(tool):
            parser.error(f'Required executable missing: {tool}')
    evidence = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix='evg-backup-evidence-'))
    if evidence.exists() and any(evidence.iterdir()):
        parser.error('Output directory must be new or empty')
    evidence.mkdir(parents=True, exist_ok=True, mode=0o700)
    cluster = Path(tempfile.mkdtemp(prefix='evg-backup-source-'))
    data = cluster / 'data'
    socket = cluster / 'socket'
    socket.mkdir(mode=0o700)
    environment = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
    results = {'synthetic_only': True, 'hosted_writes': False, 'pass': False}

    def run(command: list[str], name: str, env: dict[str, str] | None = None) -> str:
        result = subprocess.run(command, cwd=ROOT, env=env or environment, text=True, capture_output=True, timeout=120)
        (evidence / f'{name}.log').write_text(result.stdout + result.stderr)
        if result.returncode:
            raise RuntimeError(f'{name} failed; synthetic logs retained')
        return result.stdout

    try:
        run(['initdb', '-D', str(data), '--username', 'evg_backup_source', '--auth=trust', '--encoding=UTF8', '--no-locale'], 'initdb')
        import shlex
        options = f"-k {shlex.quote(str(socket))} -p 6545 -c listen_addresses=''"
        run(['pg_ctl', '-D', str(data), '-l', str(evidence / 'postgres.log'), '-o', options, '-w', 'start'], 'start')
        run(['psql', '-X', '-h', str(socket), '-p', '6545', '-U', 'evg_backup_source', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', "create role anon; create role authenticated; create schema auth; create table auth.users(id integer primary key); create table public.books(id integer primary key, title text); insert into auth.users values(1); insert into public.books values(1,'Synthetic archive fixture'); alter table public.books enable row level security; create policy books_public on public.books for select to anon using(true); grant select on public.books to anon;"], 'fixture')
        connection = 'postgresql://evg_backup_source@localhost/postgres?' + urlencode({'host': str(socket), 'port': '6545'})
        backup_environment = {**environment, 'EVG_SYNTHETIC_DATABASE_URL': connection}
        run(['node', 'scripts/backup-database.ts', '--database-url-env', 'EVG_SYNTHETIC_DATABASE_URL', '--output', str(evidence / 'backup'), '--execute'], 'backup', backup_environment)
        run(['node', 'scripts/backup-database.ts', '--restore-drill', str(evidence / 'backup/database.dump'), '--output', str(evidence / 'restore'), '--execute'], 'restore')
        restored = json.loads((evidence / 'restore/manifest.json').read_text())
        results['restore'] = restored
        inspection = restored.get('inspection', {})
        results['pass'] = restored.get('status') == 'restored' and restored.get('cluster_removed') is True and inspection.get('books_present') is True and inspection.get('auth_users_present') is True and inspection.get('rls_tables') == 1 and inspection.get('book_count') == 1 and inspection.get('auth_user_count') == 1 and inspection.get('books_anon_select') is True
        # A modified archive must be refused before any restore cluster is created.
        with (evidence / 'backup/database.dump').open('ab') as stream:
            stream.write(b'tampered-fixture')
        corrupt = subprocess.run(['node', 'scripts/backup-database.ts', '--restore-drill', str(evidence / 'backup/database.dump'), '--output', str(evidence / 'must-not-exist'), '--execute'], cwd=ROOT, env=environment, capture_output=True, text=True, timeout=30)
        results['tamper_rejected'] = corrupt.returncode != 0 and not (evidence / 'must-not-exist').exists()
        results['pass'] = results['pass'] and results['tamper_rejected']
    except Exception as error:
        results['error'] = str(error)
    finally:
        status = subprocess.run(['pg_ctl', '-D', str(data), 'status'], env=environment, capture_output=True, text=True)
        if status.returncode == 0:
            subprocess.run(['pg_ctl', '-D', str(data), '-w', 'stop'], env=environment, capture_output=True, text=True, timeout=30)
        final = subprocess.run(['pg_ctl', '-D', str(data), 'status'], env=environment, capture_output=True, text=True)
        if final.returncode != 0:
            shutil.rmtree(cluster)
            results['source_cluster_removed'] = True
        else:
            results['source_cluster_removed'] = False
            results['pass'] = False
        (evidence / 'results.json').write_text(json.dumps(results, indent=2))
    print(json.dumps({'pass': results['pass'], 'synthetic_only': True, 'hosted_writes': False, 'evidence': str(evidence)}, indent=2))
    return 0 if results['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
