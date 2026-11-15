#!/usr/bin/env python3
"""Test the actual HTTP handler without loading credentials or calling a model."""
import ast
import io
import json
from pathlib import Path
import unittest
from unittest.mock import Mock
import urllib.error


class QuotaHandlerTests(unittest.TestCase):
    def setUp(self):
        path = Path(__file__).with_name('free-vision-probe.py')
        tree = ast.parse(path.read_text())
        nodes = [node for node in tree.body if isinstance(node, ast.Import) or isinstance(node, ast.FunctionDef) and node.name == 'limited']
        self.scope = {'key': 'fixture-secret'}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), 'exec'), self.scope)

    def error(self, status, body):
        error = urllib.error.HTTPError('https://example.invalid', status, 'fixture', {'X-RateLimit-Reset': '1794700800000'}, io.BytesIO(body))
        self.scope['original'] = Mock(side_effect=error)
        return error

    def test_quota_stops_and_omits_account_and_credential(self):
        self.error(429, json.dumps({'error': {'message': 'quota fixture-secret', 'code': 429}, 'user_id': 'private-account'}).encode())
        with self.assertRaises(SystemExit) as raised:
            self.scope['limited']('https://example.invalid')
        message = str(raised.exception)
        self.assertIn('1794700800000', message)
        self.assertIn('<redacted>', message)
        self.assertNotIn('fixture-secret', message)
        self.assertNotIn('private-account', message)
        self.assertNotIn('user_id', message)
        self.scope['original'].assert_called_once()

    def test_malformed_quota_response_still_stops(self):
        self.error(429, b'not json')
        with self.assertRaisesRegex(SystemExit, 'Unreadable rate-limit response'):
            self.scope['limited']('https://example.invalid')

    def test_other_http_errors_are_not_hidden(self):
        error = self.error(401, b'fixture')
        with self.assertRaises(urllib.error.HTTPError) as raised:
            self.scope['limited']('https://example.invalid')
        self.assertIs(raised.exception, error)

    def test_success_passes_through(self):
        response = object()
        self.scope['original'] = Mock(return_value=response)
        self.assertIs(self.scope['limited']('https://example.invalid'), response)


if __name__ == '__main__':
    unittest.main()
