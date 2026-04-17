"""Jinja2-based template rendering for notification content."""

from jinja2 import Environment, Undefined


_env = Environment(undefined=Undefined, autoescape=False)


def render(template, payload, subscriber=None):
    """Render a Jinja2 template string with event payload and subscriber context.

    Undefined variables are silently ignored rather than raising errors.

    Args:
        template: A Jinja2 template string (e.g. "Hello {{ subscriber.name }}").
        payload: Event payload dict, available as ``{{ payload.* }}`` in templates.
        subscriber: Optional subscriber dict, exposed as ``{{ subscriber.* }}``.
            The subscriber's custom_properties are aliased to ``subscriber.properties``.

    Returns:
        The rendered string, or the original template if rendering fails.
    """
    ctx = {"payload": payload or {}}
    if subscriber:
        ctx["subscriber"] = {
            **subscriber,
            "properties": subscriber.get("custom_properties", {}),
        }
    try:
        return _env.from_string(template).render(**ctx)
    except Exception:
        return template
