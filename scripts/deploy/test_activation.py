import os, pathlib, subprocess, tempfile, unittest, tarfile, io, hashlib, shutil, json, sys
ROOT = pathlib.Path(__file__).resolve().parent
class ActivationGuards(unittest.TestCase):
    def run_script(self, *args, **env):
        return subprocess.run(['bash', str(ROOT / 'activate-release.sh'), *args], env={**os.environ, **env}, capture_output=True, text=True)
    def test_invalid_sha(self):
        result = self.run_script('/missing', '../../escape')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Invalid SHA', result.stderr)
    def test_missing_archive_leaves_current(self):
        with tempfile.TemporaryDirectory() as d:
            current = pathlib.Path(d) / 'current'; current.symlink_to('/prior')
            result = self.run_script('/missing', 'a'*40, HAETTEUM_CURRENT=str(current), HAETTEUM_SHARED=d, HAETTEUM_RELEASES=d)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(os.readlink(current), '/prior')
            self.assertIn('Archive/checksum missing', result.stderr)
class ArchiveGuards(unittest.TestCase):
    def test_archive_rejects_traversal_and_external_symlink(self):
        for name, link in [('../escape', None), ('api/link', '../../escape'), ('api/.env.production', None)]:
            with tempfile.TemporaryDirectory() as d:
                archive = pathlib.Path(d) / 'release.tgz'
                with tarfile.open(archive, 'w:gz') as t:
                    m = tarfile.TarInfo(name)
                    if link: m.type = tarfile.SYMTYPE; m.linkname = link
                    t.addfile(m)
                r = subprocess.run(['python3', str(ROOT / 'validate-archive.py'), str(archive)], capture_output=True)
                self.assertNotEqual(r.returncode, 0)

class TransactionFailures(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.d = pathlib.Path(self.tmp.name)
        self.scripts = self.d/'scripts'; shutil.copytree(ROOT, self.scripts)
        self.bin = self.d/'bin'; self.bin.mkdir()
        self.shared = self.d/'shared'; self.shared.mkdir()
        for p in ['api.env','web.env']: (self.shared/p).touch()
        (self.shared/'uploads').mkdir(); (self.shared/'verified').mkdir()
        self.releases = self.d/'releases'; self.releases.mkdir()
        self.old = 'b'*40; self.new = 'a'*40
        self.current = self.d/'current'; self.current.symlink_to(self.releases/self.old)
        self.env = dict(os.environ, HAETTEUM_SHARED=str(self.shared), HAETTEUM_RELEASES=str(self.releases), HAETTEUM_CURRENT=str(self.current), NODE_BIN=str(self.bin/'node'), PM2_BIN=str(self.bin/'pm2'), PATH=str(self.bin)+':'+os.environ['PATH'], BACKUP_REQUIRED_BYTES='1000', MIGRATIONS_BACKWARD_COMPATIBLE='true', ROLLBACK_SHA=self.old, MOCK_ROOT=str(self.d))
        for name, body in {
            'flock':'exit 0',
            'python3':f'if [[ "$*" = "-" ]]; then cat >/dev/null; exit 0; fi; exec {sys.executable} "$@"',
            'df':'echo "Filesystem 1024-blocks Used Available Capacity Mounted"; echo "mock 999999999 0 ${MOCK_FREE_KB:-999999999} 0% /"',
            'node':'case "$*" in *dist/main.js*) [[ $API_PORT = 4001 && $SCHEDULERS_ENABLED = false ]] || exit 2; exec sleep 60;; *server.js*) exec sleep 60;; esac; exit 0',
            'pm2':'echo "$* $HAETTEUM_RELEASE" >> "$MOCK_ROOT/pm2.log"; exit 0',
            'mv':'''if [ "$1" = "-Tf" ]; then shift; python3 -c 'import os,sys; os.replace(sys.argv[1],sys.argv[2])' "$@"; else /bin/mv "$@"; fi''',
        }.items():
            f=self.bin/name; f.write_text('#!/bin/bash\n'+body+'\n'); f.chmod(0o755)
        f=self.scripts/'smoke-release.sh'; f.write_text('#!/bin/bash\ncase "$MOCK_FAILURE:$*" in candidate:*4001*) exit 1;; switch:*) [[ "$*" = *4001* || "$HAETTEUM_RELEASE" = *bbbbbbbb* ]];; *) exit 0;; esac\n'); f.chmod(0o755)
        old = self.releases/self.old; self.fixture(old)
        (self.shared/'verified'/self.old).touch()
        stage=self.d/'artifact'; self.fixture(stage)
        self.archive=self.d/'release.tgz'
        with tarfile.open(self.archive,'w:gz') as t:
            for f in stage.rglob('*'): t.add(f, arcname=str(f.relative_to(stage)), recursive=False)
        self.checksum=hashlib.sha256(self.archive.read_bytes()).hexdigest()
        pathlib.Path(str(self.archive)+'.sha256').write_text(self.checksum+'  release.tgz\n')
    def tearDown(self): self.tmp.cleanup()
    def fixture(self, base):
        for p in ['web/apps/web/server.js','web/apps/web/.next/BUILD_ID','api/dist/main.js','api/node_modules/prisma/build/index.js','api/prisma/schema.prisma','release.json']:
            f=base/p; f.parent.mkdir(parents=True,exist_ok=True); f.write_text('{}')
        (base/'web/apps/web/.next/static').mkdir()
    def activate(self, **env):
        return subprocess.run(['bash',str(self.scripts/'activate-release.sh'),str(self.archive),self.new],env={**self.env,**env},capture_output=True,text=True)
    def unchanged(self): self.assertEqual(os.readlink(self.current),str(self.releases/self.old))
    def test_checksum_failure(self):
        pathlib.Path(str(self.archive)+'.sha256').write_text('0'*64)
        r=self.activate(); self.assertIn('Checksum mismatch',r.stderr); self.unchanged(); self.assertFalse((self.d/'pm2.log').exists())
    def test_space_failure(self):
        r=self.activate(MOCK_FREE_KB='1'); self.assertIn('Insufficient space',r.stderr); self.unchanged(); self.assertFalse((self.d/'pm2.log').exists())
    def test_candidate_failure_does_not_switch(self):
        r=self.activate(MOCK_FAILURE='candidate'); self.assertNotEqual(r.returncode,0,r.stdout+r.stderr); self.unchanged(); self.assertFalse((self.d/'pm2.log').exists())
    def test_switch_failure_restores_prior_release(self):
        r=self.activate(MOCK_FAILURE='switch'); self.assertNotEqual(r.returncode,0); self.unchanged()
        log=(self.d/'pm2.log').read_text(); self.assertIn(str(self.releases/self.new),log); self.assertIn(str(self.releases/self.old),log)
        self.assertIn('restoring verified',r.stderr)
    def test_bootstrap_requires_verified_baseline(self):
        (self.shared/'verified'/self.old).unlink()
        r=self.activate(); self.assertIn('verified rollback release is required',r.stderr); self.unchanged()
    def test_success_and_immutable_retry(self):
        r=self.activate(); self.assertEqual(r.returncode,0,r.stdout+r.stderr); self.assertEqual(os.readlink(self.current),str(self.releases/self.new))
        r=self.activate(); self.assertEqual(r.returncode,0,r.stdout+r.stderr)
        (self.releases/self.new/'.artifact-sha256').write_text('other')
        r=self.activate(); self.assertIn('Immutable release already exists',r.stderr)
if __name__ == '__main__': unittest.main()
