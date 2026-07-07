"""Tests for sandboxed template rendering (SSTI/RCE guard)."""

from alrt_workers.utils.template import render


class TestRenderNormal:
    def test_payload_interpolation(self):
        assert render("Hi {{ payload.name }}", {"name": "Al"}) == "Hi Al"

    def test_subscriber_interpolation(self):
        assert render("{{ subscriber.name }}", {}, {"name": "Bob", "custom_properties": {}}) == "Bob"

    def test_custom_properties_alias(self):
        sub = {"name": "Al", "custom_properties": {"tier": "gold"}}
        assert render("{{ subscriber.properties.tier }}", {}, sub) == "gold"

    def test_undefined_renders_empty(self):
        assert render("[{{ payload.missing }}]", {}) == "[]"


class TestSandbox:
    """The sandbox must never leak Python internals — whether it neutralizes an
    unsafe access to Undefined (empty) or raises and returns the template, the
    invariant is that the evaluated object never reaches the output."""

    def test_blocks_dunder_class(self):
        out = render("{{ ''.__class__ }}", {})
        assert "<class" not in out and "str" not in out.replace("__class__", "")

    def test_blocks_rce_globals_chain(self):
        out = render("{{ cycler.__init__.__globals__ }}", {})
        assert "builtins" not in out and "function" not in out and "os" not in out.replace("__", "")

    def test_blocks_mro_walk(self):
        out = render("{{ ().__class__.__bases__ }}", {})
        assert "<class" not in out and "object" not in out

    def test_blocks_call_of_unsafe(self):
        """Sandbox raises on unsafe operations → template returned unchanged, unevaluated."""
        tpl = "{{ ''.__class__.__mro__[1].__subclasses__() }}"
        out = render(tpl, {})
        assert "<class" not in out and "subprocess" not in out

    def test_render_failure_returns_template(self):
        """A malformed template returns the original string, not an exception."""
        tpl = "{{ unclosed"
        assert render(tpl, {}) == tpl
