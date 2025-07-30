{# Macro-based approach for block creation #}
{% macro create_block(node) -%}
{{ node["var_name"] }} = pathsim.blocks.{{ node["class_name"] }}(
    {%- for arg in node["expected_arguments"] %}
    {%- if node["data"].get(arg) -%}
    {{ arg }}={{ node["data"].get(arg) }}{% if not loop.last %}, {% endif %}
    {%- endif -%}
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
    return {{ node["data"]["expression"] }}

{{ node["var_name"] }} = pathsim.blocks.Function(func=func)

{%- endmacro -%}

{% macro create_stepsource(node) -%}
{{ node["var_name"] }} = pathsim.blocks.StepSource(
    amplitude={{ node["data"]["amplitude"] }},
    tau={{ node["data"]["delay"] }},
)
{%- endmacro -%}



{% macro create_scope_block(node) -%}
{{ node["var_name"] }} = pathsim.blocks.Scope(
    labels={{ node["children"] }}
)

{%- endmacro -%}

{% macro create_connections(edges) -%}
connections = [
    {% for edge in edges -%}
    Connection({{ edge["source_var_name"] }}{{edge["source_port"]}}, {{ edge["target_var_name"] }}{{ edge["target_port"] }}),
    {% endfor -%}
]
{%- endmacro -%}
