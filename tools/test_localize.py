"""Offline regression checks for translation-service failure and name preservation."""
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs

from localize import translate


def response(values):
    return io.BytesIO(json.dumps(values).encode())


class TranslationTests(unittest.TestCase):
    def test_brands_survive_translated_prose(self):
        with patch('localize.urlopen', return_value=response(['喺 ZXQ0000QXZ 免費玩 ZXQ0001QXZ'])) as request:
            actual = translate('yue', ['Play Crown & Chasm free on StarHermit'], ['StarHermit', 'Crown & Chasm'])
        self.assertEqual(actual, ['喺 StarHermit 免費玩 Crown & Chasm'])
        sent = parse_qs(request.call_args.args[0].data.decode())['q'][0]
        self.assertNotIn('StarHermit', sent)
        self.assertNotIn('Crown & Chasm', sent)

    def test_service_can_remove_zeroes_from_identifiers(self):
        with patch('localize.urlopen', return_value=response(['Gioca ZXQ1QXZ su ZXQ0QXZ'])):
            actual = translate('it', ['Play Turds on StarHermit'], ['StarHermit', 'Turds'])
        self.assertEqual(actual, ['Gioca Turds su StarHermit'])

    def test_dropped_names_are_recovered_by_translating_around_them(self):
        with patch('localize.urlopen', side_effect=[response(['下載']), response(['下載', '適用於', '及'])]):
            actual = translate('zh-TW', ['Download StarHermit for Windows and macOS.'], ['StarHermit', 'Windows', 'macOS'])
        self.assertEqual(actual, ['下載 StarHermit 適用於 Windows 及 macOS.'])

    def test_unsupported_language_fails_without_retrying(self):
        error = HTTPError('https://translate.googleapis.com/', 400, 'Unsupported language', {}, None)
        with patch('localize.urlopen', side_effect=error) as request, patch('localize.time.sleep') as sleep:
            with self.assertRaises(HTTPError):
                translate('unsupported', ['Play games'])
        self.assertEqual(request.call_count, 1)
        sleep.assert_not_called()


if __name__ == '__main__':
    unittest.main()
