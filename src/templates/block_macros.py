{# Macro-based approach for block creation #}
{% macro create_block(node) -%}
{{ node["var_name"] }} = {{ node["class_name"] }}(
    {%- for key, value in node["data"].items() %}
    {{ key }}={{ value }}{% if not loop.last %}, {% endif %}
    {%- endfor %}
)
{%- endmacro -%}


{% macro create_integrator_block(node) -%}
{{ create_block(node) }}

{%- if node["data"].get("reset_times") %}
def reset_itg(_):
    {{ node["var_name"] }}.reset()

for t in {{ node["data"].get("reset_times", "[]") }}:
    events.append(
        pathsim.events.Schedule(
            t_start=t,
            t_end=t,
            func_act=reset_itg,
        )
    )
{%- endif %}

{%- endmacro -%}


{% macro create_function_block(node) -%}

def func(x):
    return node["data"]["expression"]

{{ node["var_name"] }} = Function(func=func)

{%- endmacro -%}
