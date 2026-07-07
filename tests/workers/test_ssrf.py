"""Tests for the outbound-URL SSRF guard."""

import pytest

from alrt_workers.utils.ssrf import DISCORD_WEBHOOK_HOSTS, UnsafeUrlError, assert_safe_url


class TestAllowlistedHost:
    def test_valid_discord_webhook_ok(self):
        # allowlisted host → pure string check, no DNS
        assert_safe_url("https://discord.com/api/webhooks/1/abc", allowed_hosts=DISCORD_WEBHOOK_HOSTS)
        assert_safe_url("https://discordapp.com/api/webhooks/1/abc", allowed_hosts=DISCORD_WEBHOOK_HOSTS)

    def test_non_discord_host_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https://169.254.169.254/latest/meta-data", allowed_hosts=DISCORD_WEBHOOK_HOSTS)

    def test_evil_host_rejected_even_with_discord_path(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https://evil.com/api/webhooks/1/abc", allowed_hosts=DISCORD_WEBHOOK_HOSTS)


class TestScheme:
    def test_http_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("http://discord.com/api/webhooks/1/abc", allowed_hosts=DISCORD_WEBHOOK_HOSTS)

    def test_no_host_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https:///path")


class TestPrivateIpBlock:
    """Numeric literals — getaddrinfo parses them without a network round-trip."""

    def test_loopback_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https://127.0.0.1/x")

    def test_link_local_metadata_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https://169.254.169.254/x")

    def test_private_range_rejected(self):
        with pytest.raises(UnsafeUrlError):
            assert_safe_url("https://10.0.0.5/x")

    def test_public_ip_allowed(self):
        # Public numeric IP, no allowlist → resolves to itself, not private → ok
        assert_safe_url("https://8.8.8.8/x")
