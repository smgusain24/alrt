import re


def render(template, variables):
    def replace_var(match):
        key = match.group(1).strip()
        return str(variables.get(key, match.group(0)))

    return re.sub(r"\{\{(.+?)\}\}", replace_var, template)
