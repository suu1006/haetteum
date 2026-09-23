#!/usr/bin/env python3
"""Run a production plan without publishing Terraform values or diagnostics."""

import json
import os
from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parent.parent / 'environments/production'
# Keep public output independent of provider-controlled text and instance keys.
PUBLIC_ADDRESSES = {
    'aws_instance.app',
    'aws_security_group.app',
    'data.aws_vpc.existing',
    'data.aws_subnet.existing',
}
PUBLIC_ACTIONS = {'no-op', 'create', 'read', 'update', 'delete', 'forget'}
FAILURE = 'Terraform plan failed. Raw diagnostics are suppressed to protect sensitive values.\n'


def changed(change):
    return change.get('actions', ['no-op']) != ['no-op']


def summarize(document, exit_code):
    resources = [item for item in document.get('resource_changes', []) if changed(item['change'])]
    drift = sum(changed(item['change']) for item in document.get('resource_drift', []))
    outputs = sum(changed(change) for change in document.get('output_changes', {}).values())
    lines = ['Changes detected.' if exit_code == 2 or resources or drift or outputs else 'No changes.']
    lines.extend([f'Resource changes: {len(resources)}', f'Drift changes: {drift}', f'Output changes: {outputs}'])
    for item in resources:
        address = item.get('address')
        address = address if address in PUBLIC_ADDRESSES else '[unlisted resource]'
        actions = item['change']['actions']
        actions = [action if action in PUBLIC_ACTIONS else '[unlisted action]' for action in actions]
        lines.append(f'- {address}: {", ".join(actions)}')
    return '\n'.join(lines) + '\n'


def main():
    status = 1
    summary = FAILURE
    try:
        executable = os.environ.get('TERRAFORM_BIN', 'terraform')
        with tempfile.TemporaryDirectory(prefix='terraform-plan-') as directory:
            plan_path = str(Path(directory) / 'plan.tfplan')
            result = subprocess.run(
                [executable, 'plan', '-input=false', '-no-color', '-detailed-exitcode', f'-out={plan_path}'],
                cwd=ROOT, capture_output=True,
            )
            if result.returncode in (0, 2):
                shown = subprocess.run(
                    [executable, 'show', '-json', plan_path], cwd=ROOT, capture_output=True,
                )
                if shown.returncode == 0:
                    summary = summarize(json.loads(shown.stdout), result.returncode)
                    status = 0
    except Exception:
        # Exceptions can also contain provider output, paths or secret values.
        summary = FAILURE
        status = 1
    try:
        summary_path = os.environ.get('GITHUB_STEP_SUMMARY')
        if summary_path:
            with open(summary_path, 'a', encoding='utf-8') as stream:
                stream.write(summary)
    except OSError:
        summary = FAILURE
        status = 1
    print(summary, end='')
    return status


if __name__ == '__main__':
    raise SystemExit(main())
