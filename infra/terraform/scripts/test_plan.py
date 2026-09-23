import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


class PlanTests(unittest.TestCase):
    def run_plan(self, code=0, document=None, show_code=0, raw_json=None):
        source = Path(__file__).with_name('plan.py')
        self.assertTrue(source.exists(), 'safe plan runner must exist')
        spec = importlib.util.spec_from_file_location('safe_plan', source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        paths = []
        def run(args, **kwargs):
            self.assertTrue(kwargs['capture_output'])
            self.assertEqual(Path(kwargs['cwd']), source.parent.parent / 'environments/production')
            if args[1] == 'plan':
                self.assertIn('-detailed-exitcode', args)
                self.assertIn('-input=false', args)
                target = Path(next(a[5:] for a in args if a.startswith('-out=')))
                self.assertEqual(target.parent.stat().st_mode & 0o777, 0o700)
                target.write_text('PRIVATE_PLAN')
                paths.append(target)
                return subprocess.CompletedProcess(args, code, 'SECRET_STDOUT', 'SECRET_STDERR')
            self.assertEqual(args[1:3], ['show', '-json'])
            self.assertEqual(args[3], str(paths[0]))
            return subprocess.CompletedProcess(args, show_code, raw_json if raw_json is not None else json.dumps(document or {}), 'SECRET_SHOW')
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory) / 'summary'
            with patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(summary)}), patch.object(module.subprocess, 'run', side_effect=run), contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                result = module.main()
            self.assertEqual(summary.read_text(), output.getvalue())
        for path in paths:
            self.assertFalse(path.parent.exists())
        self.assertNotIn('SECRET', output.getvalue())
        self.assertNotIn('PRIVATE', output.getvalue())
        return result, output.getvalue()

    def test_unchanged_succeeds_and_removes_private_plan(self):
        result, output = self.run_plan()
        self.assertEqual(result, 0)
        self.assertIn('No changes', output)

    def test_change_reports_only_allowlisted_metadata(self):
        result, output = self.run_plan(2, {'resource_changes': [
            {'address': 'aws_instance.app', 'change': {'actions': ['update'], 'before': {'secret': 'SECRET_VALUE'}}},
            {'address': '::error::SECRET_ADDRESS', 'change': {'actions': ['SECRET_ACTION']}}
        ], 'output_changes': {'SECRET_OUTPUT_NAME': {'actions': ['update'], 'after': 'SECRET_VALUE'}}})
        self.assertEqual(result, 0)
        self.assertIn('Changes detected', output)
        self.assertIn('aws_instance.app', output)
        self.assertIn('update', output)
        self.assertIn('Output changes: 1', output)
        self.assertNotIn('::', output)

    def test_drift_only_is_reported_without_values(self):
        result, output = self.run_plan(0, {'resource_drift': [{'address': 'SECRET_ADDRESS', 'change': {'actions': ['update'], 'before': 'SECRET_VALUE'}}]})
        self.assertEqual(result, 0)
        self.assertIn('Drift changes: 1', output)
        self.assertNotIn('No changes', output)

    def test_plan_failure_hides_diagnostics_and_cleans_up(self):
        result, _ = self.run_plan(1)
        self.assertEqual(result, 1)

    def test_malformed_json_reports_safe_failure_in_summary(self):
        result, _ = self.run_plan(2, raw_json='SECRET_INVALID_JSON')
        self.assertEqual(result, 1)

    def test_show_failure_hides_diagnostics_and_cleans_up(self):
        result, _ = self.run_plan(2, show_code=1)
        self.assertEqual(result, 1)


if __name__ == '__main__':
    unittest.main()
