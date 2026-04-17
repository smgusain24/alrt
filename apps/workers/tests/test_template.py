from alrt_workers.utils.template import render


def test_payload_variable():
    assert render("Hello {{ payload.name }}", {"name": "Alice"}) == "Hello Alice"


def test_subscriber_name():
    sub = {"name": "Bob", "email": "bob@test.com", "custom_properties": {}}
    assert render("Hi {{ subscriber.name }}", {}, sub) == "Hi Bob"


def test_subscriber_email():
    sub = {"name": "Bob", "email": "bob@test.com", "custom_properties": {}}
    assert render("{{ subscriber.email }}", {}, sub) == "bob@test.com"


def test_subscriber_custom_properties():
    sub = {"name": "Bob", "email": "bob@test.com", "custom_properties": {"plan": "pro"}}
    assert render("Plan: {{ subscriber.properties.plan }}", {}, sub) == "Plan: pro"


def test_missing_variable_renders_empty():
    # Jinja2 Undefined renders as empty string
    result = render("{{ payload.missing }}", {})
    assert result == ""


def test_jinja2_conditional():
    tmpl = "{% if payload.premium %}VIP{% else %}Standard{% endif %}"
    assert render(tmpl, {"premium": True}) == "VIP"
    assert render(tmpl, {"premium": False}) == "Standard"


def test_jinja2_loop():
    tmpl = "{% for item in payload.items %}{{ item }} {% endfor %}"
    assert render(tmpl, {"items": ["a", "b", "c"]}).strip() == "a b c"


def test_no_subscriber_still_works():
    assert render("Hello {{ payload.name }}", {"name": "World"}) == "Hello World"


def test_bad_template_returns_raw():
    # Unclosed tag — render should fall back to raw template
    bad = "{{ unclosed"
    result = render(bad, {})
    assert result == bad
