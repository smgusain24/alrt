"""Egress guard for tenant/subscriber-supplied outbound URLs (anti-SSRF).

Workers POST to some URLs that originate from untrusted input (notably a
subscriber's ``discord_webhook_url``). Without a guard, a value like
``https://169.254.169.254/latest/meta-data`` turns a delivery into a request
against internal infrastructure. Validate before every such request.
"""

import ipaddress
import socket
from urllib.parse import urlparse

# Discord webhooks only ever live on these hosts.
DISCORD_WEBHOOK_HOSTS = {"discord.com", "discordapp.com"}


class UnsafeUrlError(Exception):
    pass


def assert_safe_url(url, allowed_hosts=None):
    """Raise UnsafeUrlError unless ``url`` is safe to request.

    Requires https. With ``allowed_hosts`` set, the host must match exactly
    (these are known-public hosts, so no DNS check is needed). Without an
    allowlist, the host is resolved and any private/loopback/link-local/
    reserved/multicast address is rejected.
    """
    parsed = urlparse(url or "")
    if parsed.scheme != "https":
        raise UnsafeUrlError("URL must use https")

    host = (parsed.hostname or "").lower()
    if not host:
        raise UnsafeUrlError("URL has no host")

    if allowed_hosts is not None:
        if host not in allowed_hosts:
            raise UnsafeUrlError(f"host {host!r} is not allowed")
        return

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise UnsafeUrlError(f"cannot resolve host {host!r}")

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise UnsafeUrlError(f"URL resolves to blocked address {ip}")
