from jinja2 import Environment, Undefined


_env = Environment(undefined=Undefined, autoescape=False)


def render(template, payload, subscriber=None):
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
