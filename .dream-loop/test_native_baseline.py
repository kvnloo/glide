"""Readiness regression checks. Never starts Tern or a model."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('native_baseline', Path(__file__).with_name('native-baseline.py'))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


class ReadinessTest(unittest.TestCase):
    def ready(self, nodes):
        return baseline.is_ready(json.dumps({'ok': True, 'tree': nodes}))

    def test_shell_command_is_not_a_rendered_app(self):
        self.assertFalse(self.ready([{'tag': 'span', 'text': 'hermes tern --model fake-model sf-editor'}]))

    def test_unavailable_gateway_is_not_ready(self):
        self.assertFalse(self.ready([{'class': 'sf-editor'}, {'text': 'fake-model'}, {'text': 'gateway unavailable'}]))

    def test_missing_model_is_not_ready(self):
        self.assertFalse(self.ready([{'class': 'sf-editor'}, {'text': 'hermes'}]))

    def test_native_composer_and_model_are_ready(self):
        self.assertTrue(self.ready([{'class': 'sf sf-editor', 'children': [{'text': 'Ask Hermes'}]}, {'text': 'fake-model'}]))

    def test_error_panel_is_not_ready(self):
        self.assertFalse(self.ready([{'class': 'sf-editor'}, {'text': 'fake-model'}, {'class': 'sf-t-error', 'text': 'failed'}]))


class IsolationTest(unittest.TestCase):
    def test_owner_display_and_runtime_settings_are_removed(self):
        inherited = {'PATH': '/usr/bin', 'DISPLAY': ':1', 'WAYLAND_DISPLAY': 'wayland-1', 'HERMES_HOME': '/owner/profile', 'TERN_PANE': 'owner-pane', 'GLIDE_LANES_TOKEN': 'owner-placeholder'}
        env = baseline.isolated_env(inherited)
        for key in ('DISPLAY', 'WAYLAND_DISPLAY', 'TERN_PANE', 'GLIDE_LANES_TOKEN'):
            self.assertNotIn(key, env)
        self.assertNotEqual(env['HERMES_HOME'], inherited['HERMES_HOME'])
        self.assertEqual(env['XDG_CONFIG_HOME'], str(baseline.ROOT / 'home/.config'))
        self.assertEqual(inherited['TERN_PANE'], 'owner-pane')

    def test_only_explicit_synthetic_glide_settings_are_restored(self):
        env = baseline.isolated_env({'PATH': '/usr/bin', 'GLIDE_AUTO_THEME': '1', 'GLIDE_LANES_URL': 'https://owner.invalid'}, {'GLIDE_LANES_URL': 'http://127.0.0.1:18749'})
        self.assertNotIn('GLIDE_AUTO_THEME', env)
        self.assertEqual(env['GLIDE_LANES_URL'], 'http://127.0.0.1:18749')


if __name__ == '__main__':
    unittest.main()
