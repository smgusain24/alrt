"""Jinja2-based template rendering for notification content."""

import logging

from jinja2 import Undefined
from jinja2.exceptions import SecurityError
from jinja2.sandbox import SandboxedEnvironment

log = logging.getLogger(__name__)

# Templates are tenant-authored and rendered on shared workers that hold the
# Fernet key + DB pool. A plain Environment lets a payload like
# {{ cycler.__init__.__globals__.os.popen(...) }} reach Python internals (RCE),
# so we sandbox. autoescape stays off because most channels are plain text
# (Slack/SMS/Telegram); HTML-channel escaping is a separate concern.
_env = SandboxedEnvironment(undefined=Undefined, autoescape=False)


def render(template, payload, subscriber=None):
    """Render a Jinja2 template string with event payload and subscriber context.

    Runs in a sandboxed environment: unsafe attribute access raises and is
    logged rather than executed. Undefined variables render empty. On any
    render/security failure the original template is returned unchanged.

    Args:
        template: A Jinja2 template string (e.g. "Hello {{ subscriber.name }}").
        payload: Event payload dict, available as ``{{ payload.* }}`` in templates.
        subscriber: Optional subscriber dict, exposed as ``{{ subscriber.* }}``.
            The subscriber's custom_properties are aliased to ``subscriber.properties``.
    """
    ctx = {"payload": payload or {}}
    if subscriber:
        ctx["subscriber"] = {
            **subscriber,
            "properties": subscriber.get("custom_properties", {}),
        }
    try:
        return _env.from_string(template).render(**ctx)
    except SecurityError as e:
        log.warning("Blocked unsafe template render: %s", e)
        return template
    except Exception as e:
        log.warning("Template render failed: %s", e)
        return template
