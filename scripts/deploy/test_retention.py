import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent

class RetentionTests(unittest.TestCase):
    def test_success_retains_current_previous_and_three_backups(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            releases = root / 'releases'; releases.mkdir()
            shared = root / 'shared'; shared.mkdir()
            (shared / 'verified').mkdir(); (shared / 'backups').mkdir()
            for char in 'abcd':
                (releases / (char * 40)).mkdir()
                (shared / 'verified' / (char * 40)).touch()
            outside = root / 'outside'; outside.mkdir(); (outside / 'keep').touch()
            (releases / ('e' * 40)).symlink_to(outside)
            (releases / 'manual-files').mkdir()
            for day in range(1, 6):
                (shared / 'backups' / f'2026090{day}T000000Z-{"a" * 40}.dump').touch()
            (shared / 'backups' / 'manual.dump').touch()
            result = subprocess.run([sys.executable, str(ROOT / 'prune-artifacts.py'), str(releases), str(shared), str(releases / ('a' * 40)), str(releases / ('b' * 40))], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((releases / ('a' * 40)).exists())
            self.assertTrue((releases / ('b' * 40)).exists())
            self.assertFalse((releases / ('c' * 40)).exists())
            self.assertFalse((shared / 'verified' / ('c' * 40)).exists())
            self.assertTrue((outside / 'keep').exists())
            self.assertTrue((releases / 'manual-files').exists())
            self.assertEqual(len(list((shared / 'backups').glob('2026*.dump'))), 3)
            self.assertTrue((shared / 'backups' / f'20260905T000000Z-{"a" * 40}.dump').exists())
            self.assertTrue((shared / 'backups' / 'manual.dump').exists())
            retry = subprocess.run([sys.executable, str(ROOT / 'prune-artifacts.py'), str(releases), str(shared), str(releases / ('a' * 40)), str(releases / ('a' * 40))], capture_output=True, text=True)
            self.assertEqual(retry.returncode, 0, retry.stderr)
            self.assertTrue((releases / ('b' * 40)).exists())

    def test_invalid_keep_path_aborts_without_deletion(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            releases = root / 'releases'; releases.mkdir()
            (releases / ('a' * 40)).mkdir()
            result = subprocess.run([sys.executable, str(ROOT / 'prune-artifacts.py'), str(releases), str(root / 'shared'), str(root), str(releases / ('a' * 40))], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertTrue((releases / ('a' * 40)).exists())

if __name__ == '__main__':
    unittest.main()
